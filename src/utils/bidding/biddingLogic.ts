import {
  Player,
  DraftState,
  BiddingRecommendation,
  NominationRecommendation,
  BiddingTiming,
  BudgetAllocation
} from '../../types';
import {
  analyzeNominationTiming,
  calculateRosterFitScore,
  calculateRemainingPlayersScore,
  calculateBudgetScore,
  calculateValueEfficiencyScore,
  getPositionalScarcity
} from './biddingScores';
import { getRosterNeeds } from '../draft/rosterUtils';
import { calculatePuntStrategyScore } from '../strategy/strategyUtils';
import { analyzeCompetitiveInterest } from '../analysis/competitiveAnalysis';
import {
  generateAdvancedCompetitionAnalysis
} from '../analysis/advancedCompetitionAnalysis';

// Main granular bidding recommendation function
export const calculateGranularBiddingScore = (
  player: Player,
  currentBid: number,
  draftState: DraftState
): { score: number; breakdown: { rosterFit: number; remainingPlayersValue: number; budgetSituation: number; valueEfficiency: number; puntStrategy: number }; reasoning: string[] } => {
  const reasoning: string[] = [];

  // Analyze nomination timing opportunity
  const timingAnalysis = analyzeNominationTiming(
    player,
    draftState.draftPhase,
    draftState.playersDrafted
  );
  reasoning.push(timingAnalysis.reasoning);

  // Calculate each component
  const rosterFit = calculateRosterFitScore(player, draftState.myRoster, draftState);
  const remainingPlayersValue = calculateRemainingPlayersScore(
    player,
    draftState.playersRemaining
  );
  const budgetSituation = calculateBudgetScore(
    player,
    currentBid,
    draftState.myRoster,
    draftState.otherTeamsBudgets,
    draftState.allTeams
  );
  const valueEfficiency = calculateValueEfficiencyScore(
    player,
    currentBid,
    draftState.draftPhase
  );
  const puntStrategy = calculatePuntStrategyScore(
    player,
    draftState.myRoster,
    draftState.selectedStrategy,
    draftState.rosterAnalysis
  );

  let totalScore = rosterFit + remainingPlayersValue + budgetSituation + valueEfficiency + puntStrategy;

  // Bonus for exceptional timing opportunities
  if (timingAnalysis.isEarlyOpportunity) {
    totalScore += 5; // Up to 5 bonus points for great timing
    reasoning.push(`🎁 +5 bonus points for exceptional timing opportunity`);
  }

  // Add competitive analysis to reasoning
  if (draftState.allTeams && draftState.allTeams.length > 0) {
    const competitiveAnalysis = analyzeCompetitiveInterest(player, draftState.allTeams);
    if (competitiveAnalysis.interestedTeams === 0) {
      reasoning.push(`🎯 No other teams interested - great opportunity!`);
    } else if (competitiveAnalysis.interestedTeams <= 2) {
      reasoning.push(`⚡ Light competition: ${competitiveAnalysis.interestedTeams} teams interested`);
    } else if (competitiveAnalysis.interestedTeams <= 4) {
      reasoning.push(`⚠️ Moderate competition: ${competitiveAnalysis.interestedTeams} teams interested`);
    } else {
      reasoning.push(`🔥 Heavy competition: ${competitiveAnalysis.interestedTeams} teams interested`);
    }

    if (competitiveAnalysis.maxCompetitorBudget > 0) {
      const myBudget = draftState.myRoster.remainingBudget;
      if (myBudget > competitiveAnalysis.maxCompetitorBudget) {
        reasoning.push(`💰 Budget advantage: You have more than any competitor`);
      } else if (myBudget < competitiveAnalysis.maxCompetitorBudget * 0.8) {
        reasoning.push(`⚠️ Budget disadvantage: Competitors have significantly more`);
      }
    }
  }

  // Generate detailed reasoning
  if (rosterFit >= 20) reasoning.push(`🎯 Excellent roster fit (${rosterFit}/25)`);
  else if (rosterFit >= 15) reasoning.push(`✅ Good roster fit (${rosterFit}/25)`);
  else if (rosterFit >= 10) reasoning.push(`⚠️ Moderate roster fit (${rosterFit}/25)`);
  else reasoning.push(`❌ Poor roster fit (${rosterFit}/25)`);

  if (remainingPlayersValue >= 15) reasoning.push(`🔥 High scarcity value (${remainingPlayersValue}/20)`);
  else if (remainingPlayersValue >= 10) reasoning.push(`📈 Good scarcity value (${remainingPlayersValue}/20)`);
  else reasoning.push(`📊 Limited scarcity (${remainingPlayersValue}/20)`);

  if (budgetSituation >= 15) reasoning.push(`💰 Excellent budget situation (${budgetSituation}/20)`);
  else if (budgetSituation >= 10) reasoning.push(`💵 Good budget situation (${budgetSituation}/20)`);
  else reasoning.push(`⚠️ Budget concerns (${budgetSituation}/20)`);

  if (valueEfficiency >= 15) reasoning.push(`💎 Outstanding value (${valueEfficiency}/20)`);
  else if (valueEfficiency >= 10) reasoning.push(`💸 Good value (${valueEfficiency}/20)`);
  else reasoning.push(`📉 Below expected value (${valueEfficiency}/20)`);

  if (puntStrategy >= 12) reasoning.push(`🎲 Perfect strategy fit (${puntStrategy}/15)`);
  else if (puntStrategy >= 8) reasoning.push(`✨ Good strategy fit (${puntStrategy}/15)`);
  else reasoning.push(`🤔 Strategy concerns (${puntStrategy}/15)`);

  return {
    score: Math.min(100, totalScore),
    breakdown: {
      rosterFit,
      remainingPlayersValue,
      budgetSituation,
      valueEfficiency,
      puntStrategy
    },
    reasoning
  };
};

// Calculate bidding timing recommendation
export const calculateBiddingTiming = (
  player: Player,
  currentBid: number,
  draftState: DraftState
): BiddingTiming => {
  const { draftPhase, myRoster } = draftState;
  const filledSlots = myRoster.slots.filter(slot => slot.player).length;

  // Determine aggressiveness based on multiple factors
  let aggressivenessLevel: 'passive' | 'moderate' | 'aggressive' = 'moderate';
  let shouldWaitForOthers = false;

  const efficiency = player.projectedValue / (currentBid + 1);

  // Early in personal draft (first few picks) - be more measured
  if (filledSlots <= 2) {
    // For early picks, focus on value rather than aggressive bidding
    if (efficiency > 1.2) {
      aggressivenessLevel = 'moderate'; // Good value, but no need to be aggressive early
      shouldWaitForOthers = false;
    } else if (efficiency > 1.0) {
      aggressivenessLevel = 'moderate';
      shouldWaitForOthers = true; // See what others do first
    } else {
      aggressivenessLevel = 'passive';
      shouldWaitForOthers = true;
    }
  }

  // Mid-draft: Elite players need more aggressive approach
  else if (filledSlots <= 8) {
    if (player.tier <= 2 && efficiency > 0.9) {
      aggressivenessLevel = 'aggressive';
      shouldWaitForOthers = false;
    } else if (efficiency > 1.1) {
      aggressivenessLevel = 'moderate';
      shouldWaitForOthers = false;
    }
  }

  // Late phase: be more conservative unless it's great value
  else if (draftPhase === 'late' && efficiency < 1.1) {
    aggressivenessLevel = 'passive';
    shouldWaitForOthers = true;
  }

  // Budget considerations override other factors
  if (myRoster.remainingBudget > 120 && efficiency > 1.0) {
    aggressivenessLevel = 'aggressive';
  } else if (myRoster.remainingBudget < 50) {
    aggressivenessLevel = 'passive';
    shouldWaitForOthers = true;
  }

  // Bluffing recommendation
  let bluffRecommendation;
  const shouldBluff = (
    player.tier <= 2 && // Elite player
    player.projectedValue > myRoster.remainingBudget && // Can't afford
    draftPhase === 'early' && // Early in draft
    currentBid < player.projectedValue * 0.7 // Bid is still low
  );

  if (shouldBluff) {
    bluffRecommendation = {
      shouldBluff: true,
      maxBluffBid: Math.min(currentBid + 5, myRoster.remainingBudget - 20),
      reasoning: 'Drive up price on elite player you cannot afford'
    };
  }

  return {
    shouldWaitForOthers,
    aggressivenessLevel,
    bluffRecommendation
  };
};

// Generate enhanced bidding recommendation
export const getBiddingRecommendation = (
  player: Player,
  currentBid: number,
  draftState: DraftState
): BiddingRecommendation => {
  const { myRoster } = draftState;

  // Check if we can afford the player
  const emptySlots = myRoster.slots.filter(slot => !slot.player).length;
  const minBudgetNeeded = Math.max(1, emptySlots - 1);
  const actualMaxAffordable = myRoster.remainingBudget - minBudgetNeeded;

  // Calculate granular bidding score
  const granularResult = calculateGranularBiddingScore(player, currentBid, draftState);
  const biddingScore = granularResult.score;
  const scoreBreakdown = granularResult.breakdown;
  const reasoning = [...granularResult.reasoning];

  // Affordability check
  if (currentBid >= actualMaxAffordable) {
    return {
      shouldBid: false,
      maxBid: 0,
      reasoning: [`❌ Cannot afford: need to reserve $${minBudgetNeeded} for remaining ${emptySlots} slots`],
      confidence: 'high',
      categoryImpact: player.categoryStrengths,
      biddingTiming: { shouldWaitForOthers: true, aggressivenessLevel: 'passive' },
      strategyFit: 0,
      biddingScore: 0,
      scoreBreakdown: {
        rosterFit: 0,
        remainingPlayersValue: 0,
        budgetSituation: 0,
        valueEfficiency: 0,
        puntStrategy: 0
      }
    };
  }

  // Calculate max bid based on granular score
  let maxBid: number;
  const baseValue = player.projectedValue;

  if (biddingScore >= 85) {
    // Exceptional opportunity - bid up to 110% of value
    maxBid = Math.min(Math.floor(baseValue * 1.1), actualMaxAffordable);
    reasoning.unshift('🔥 EXCEPTIONAL OPPORTUNITY - Highly recommended');
  } else if (biddingScore >= 75) {
    // Excellent opportunity - bid up to 105% of value
    maxBid = Math.min(Math.floor(baseValue * 1.05), actualMaxAffordable);
    reasoning.unshift('⭐ EXCELLENT OPPORTUNITY - Strongly recommended');
  } else if (biddingScore >= 65) {
    // Good opportunity - bid up to full value
    maxBid = Math.min(baseValue, actualMaxAffordable);
    reasoning.unshift('✅ GOOD OPPORTUNITY - Recommended');
  } else if (biddingScore >= 55) {
    // Fair opportunity - bid up to 95% of value
    maxBid = Math.min(Math.floor(baseValue * 0.95), actualMaxAffordable);
    reasoning.unshift('⚖️ FAIR OPPORTUNITY - Consider bidding');
  } else if (biddingScore >= 45) {
    // Below average - bid up to 90% of value
    maxBid = Math.min(Math.floor(baseValue * 0.9), actualMaxAffordable);
    reasoning.unshift('⚠️ BELOW AVERAGE - Proceed with caution');
  } else if (biddingScore >= 35) {
    // Poor opportunity - bid up to 80% of value
    maxBid = Math.min(Math.floor(baseValue * 0.8), actualMaxAffordable);
    reasoning.unshift('❌ POOR OPPORTUNITY - Not recommended');
  } else {
    // Very poor opportunity - minimal bid
    maxBid = Math.min(Math.floor(baseValue * 0.7), actualMaxAffordable);
    reasoning.unshift('🚫 AVOID - Very poor opportunity');
  }

  const shouldBid = maxBid > currentBid && biddingScore >= 45;

  // Confidence calculation based on score
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (biddingScore >= 75) confidence = 'high';
  else if (biddingScore < 55) confidence = 'low';

  // Calculate enhanced features
  const categoryImpact = player.categoryStrengths;
  const biddingTiming = calculateBiddingTiming(player, currentBid, draftState);
  const strategyFit = calculateStrategyFit(player, draftState.selectedStrategy, draftState.rosterAnalysis);

  // Add overall score context
  reasoning.push(`📊 Overall Bidding Score: ${biddingScore}/100`);

  // Add timing advice
  if (biddingTiming.bluffRecommendation?.shouldBluff) {
    reasoning.push(`💡 Bluff opportunity: ${biddingTiming.bluffRecommendation.reasoning}`);
  }

  if (biddingTiming.shouldWaitForOthers) {
    reasoning.push('⏱️ Wait for others to bid first');
  } else if (biddingTiming.aggressivenessLevel === 'aggressive') {
    reasoning.push('⚡ Bid aggressively - don\'t wait');
  }

  // Generate advanced competition analysis
  const advancedCompetitionAnalysis = generateAdvancedCompetitionAnalysis(player, draftState);

  // Enhance reasoning with competition insights
  const threatAssessment = advancedCompetitionAnalysis.threatAssessment;
  const highThreatTeams = threatAssessment.threateningTeams.filter(t =>
    t.threatLevel === 'critical' || t.threatLevel === 'high'
  );

  if (highThreatTeams.length > 0) {
    reasoning.push(`🚨 High competition: ${highThreatTeams.length} teams likely to bid heavily`);
    reasoning.push(`💰 Expected final cost: $${threatAssessment.expectedFinalCost}`);

    // Add specific team threats
    highThreatTeams.slice(0, 2).forEach(threat => {
      reasoning.push(`⚔️ ${threat.teamName}: ${Math.round(threat.bidProbability * 100)}% likely, max ~$${threat.maxLikelyBid}`);
    });
  } else {
    reasoning.push(`🎯 Low competition: Good opportunity for value`);
  }

  // Adjust max bid based on competition analysis
  const competitionAdjustedMaxBid = Math.min(
    maxBid,
    advancedCompetitionAnalysis.strategicRecommendations.maxRecommendedBid
  );

  // Update confidence based on competition analysis
  const competitionConfidence = advancedCompetitionAnalysis.strategicRecommendations.confidenceLevel;
  if (competitionConfidence < 0.3 && confidence === 'high') confidence = 'medium';
  if (competitionConfidence < 0.1 && confidence === 'medium') confidence = 'low';

  return {
    shouldBid,
    maxBid: Math.max(0, competitionAdjustedMaxBid),
    reasoning,
    confidence,
    categoryImpact,
    biddingTiming,
    strategyFit,
    biddingScore,
    scoreBreakdown,
    advancedCompetitionAnalysis
  };
};

// Generate nomination recommendations
export const getNominationRecommendations = (
  draftState: DraftState,
  count: number = 3
): NominationRecommendation[] => {
  const { playersRemaining, myRoster, draftPhase } = draftState;
  const needs = getRosterNeeds(myRoster);
  const recommendations: NominationRecommendation[] = [];

  // Strategy 1: Target players I want
  const targetCandidates = playersRemaining
    .filter(player => {
      const canAfford = player.projectedValue <= (myRoster.remainingBudget - 10);
      const fitsNeed = player.positions.some(pos => needs[pos] > 0) || needs.any > 0;
      return canAfford && fitsNeed;
    })
    .sort((a, b) => {
      // Prioritize by value and positional need
      const aScarcity = Math.min(...a.positions.map(pos =>
        getPositionalScarcity(pos, playersRemaining, a.tier)
      ));
      const bScarcity = Math.min(...b.positions.map(pos =>
        getPositionalScarcity(pos, playersRemaining, b.tier)
      ));

      if (aScarcity !== bScarcity) return aScarcity - bScarcity;
      return b.projectedValue - a.projectedValue;
    });

  // Add top target candidates
  targetCandidates.slice(0, Math.ceil(count / 2)).forEach((player) => {
    const reasoning = [
      `Projected value: $${player.projectedValue}`,
      `Fits roster need: ${player.positions.join('/')}`
    ];

    const scarcity = Math.min(...player.positions.map(pos =>
      getPositionalScarcity(pos, playersRemaining, player.tier)
    ));

    if (scarcity <= 3) {
      reasoning.push(`High scarcity: only ${scarcity} similar players left`);
    }

    recommendations.push({
      player,
      strategy: 'target',
      reasoning,
      priority: recommendations.length + 1
    });
  });

  // Strategy 2: Force others to spend (nominate expensive players I don't want)
  if (draftPhase !== 'late') {
    const forceSpendCandidates = playersRemaining
      .filter(player => {
        const tooExpensive = player.projectedValue > (myRoster.remainingBudget - 5);
        const dontNeed = !player.positions.some(pos => needs[pos] > 0) && needs.any <= 2;
        return tooExpensive || (dontNeed && player.tier <= 2);
      })
      .sort((a, b) => b.projectedValue - a.projectedValue);

    forceSpendCandidates.slice(0, Math.floor(count / 2)).forEach((player) => {
      const reasoning = [
        `High projected value: $${player.projectedValue}`,
        'Force competitors to spend budget'
      ];

      if (player.projectedValue > myRoster.remainingBudget) {
        reasoning.push('Too expensive for my budget');
      } else {
        reasoning.push('Does not fill current roster need');
      }

      recommendations.push({
        player,
        strategy: 'force_spend',
        reasoning,
        priority: recommendations.length + 1
      });
    });
  }

  return recommendations.slice(0, count);
};

// Calculate optimal budget allocation
export const calculateBudgetAllocation = (draftState: DraftState): BudgetAllocation => {
  const { myRoster, selectedStrategy } = draftState;
  const remainingSlots = myRoster.slots.filter(slot => !slot.player).length;
  const budget = myRoster.remainingBudget;

  let earlyPhaseTarget: number;
  let middlePhaseTarget: number;
  let latePhaseTarget: number;
  let starPlayerBudget: number;

  switch (selectedStrategy) {
    case 'stars_scrubs':
      // Spend big early, save little for late
      starPlayerBudget = Math.floor(budget * 0.7);
      earlyPhaseTarget = Math.floor(budget * 0.6);
      middlePhaseTarget = Math.floor(budget * 0.3);
      latePhaseTarget = Math.floor(budget * 0.1);
      break;

    case 'balanced':
      // Spread spending evenly
      starPlayerBudget = Math.floor(budget * 0.4);
      earlyPhaseTarget = Math.floor(budget * 0.4);
      middlePhaseTarget = Math.floor(budget * 0.4);
      latePhaseTarget = Math.floor(budget * 0.2);
      break;

    default:
      // Conservative approach
      starPlayerBudget = Math.floor(budget * 0.5);
      earlyPhaseTarget = Math.floor(budget * 0.5);
      middlePhaseTarget = Math.floor(budget * 0.3);
      latePhaseTarget = Math.floor(budget * 0.2);
  }

  const reasoning = [
    `Strategy: ${selectedStrategy.replace('_', ' ')}`,
    `${remainingSlots} slots remaining`,
    `Reserve $${Math.floor(budget - earlyPhaseTarget - middlePhaseTarget - latePhaseTarget)} for flexibility`
  ];

  return {
    earlyPhaseTarget,
    middlePhaseTarget,
    latePhaseTarget,
    starPlayerBudget,
    reasoning
  };
};

// Import calculateStrategyFit from strategy utils
import { calculateStrategyFit } from '../strategy/strategyUtils';
