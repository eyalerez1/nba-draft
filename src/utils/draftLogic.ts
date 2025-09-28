/**
 * NBA Draft Assistant - Advanced Bidding Logic
 *
 * This module implements a sophisticated 0-100 granular bidding system that evaluates
 * players across 5 key dimensions:
 *
 * 1. ROSTER FIT (0-25 points):
 *    - Positional needs (0-10 pts): How well the player fills roster gaps
 *    - Category needs (0-10 pts): Addresses weak fantasy categories
 *    - Flexibility & urgency (0-5 pts): Multi-position eligibility and draft urgency
 *
 * 2. REMAINING PLAYERS VALUE (0-20 points):
 *    - Positional scarcity (0-10 pts): How rare similar players are
 *    - Tier scarcity (0-5 pts): Availability of same-tier alternatives
 *    - Quality drop-off (0-5 pts): Better alternatives remaining
 *
 * 3. BUDGET SITUATION (0-20 points):
 *    - Budget health (0-8 pts): Financial flexibility after bid
 *    - Value vs cost (0-7 pts): Deal quality relative to projected value
 *    - Competitive advantage (0-5 pts): Budget position vs other teams
 *
 * 4. VALUE EFFICIENCY (0-20 points):
 *    - Base efficiency (0-12 pts): Projected value vs bid cost
 *    - Tier premium (0-4 pts): Elite player value adjustments
 *    - Opportunity timing (0-4 pts): Value opportunities regardless of expected timing
 *
 * 5. PUNT STRATEGY (0-15 points):
 *    - Auto-punt detection (0-8 pts): Identifies emerging punt strategies
 *    - Strategy alignment (0-7 pts): Fits selected roster strategy
 *
 * TIMING BONUS (0-5 points):
 *    - Exceptional opportunities: Extra points when high-tier players are nominated
 *      unexpectedly early or late in the draft process
 *
 * BIDDING RECOMMENDATIONS:
 * - 85-105: 🔥 EXCEPTIONAL - Bid up to 110% of value (includes timing bonus)
 * - 75-84:  ⭐ EXCELLENT - Bid up to 105% of value
 * - 65-74:  ✅ GOOD - Bid up to full value
 * - 55-64:  ⚖️ FAIR - Bid up to 95% of value
 * - 45-54:  ⚠️ BELOW AVERAGE - Bid up to 90% of value
 * - 35-44:  ❌ POOR - Bid up to 80% of value
 * - 0-34:   🚫 AVOID - Bid up to 70% of value
 */

import {
  Player,
  DraftedPlayer,
  MyRoster,
  DraftState,
  BiddingRecommendation,
  NominationRecommendation,
  RosterSlot,
  Position,
  RosterStrategy,
  CategoryImpact,
  RosterAnalysis,
  BiddingTiming,
  BudgetAllocation,
  FantasyCategory,
  TeamBudgetInfo,
  TeamInfo,
  OpponentStrategy,
  BiddingPatterns,
  ThreatAssessment,
  BudgetPressure,
  CompetitiveIntelligence,
  AdvancedCompetitionAnalysis
} from '../types';

// Initialize empty roster with standard fantasy basketball positions
export const initializeRoster = (): MyRoster => {
  const slots: RosterSlot[] = [
    { position: 'PG', required: true },
    { position: 'SG', required: true },
    { position: 'G', required: true },
    { position: 'SF', required: true },
    { position: 'PF', required: true },
    { position: 'F', required: true },
    { position: 'C', required: true },
    { position: 'C', required: true },
    { position: 'UTIL', required: true },
    { position: 'UTIL', required: true },
    { position: 'BENCH', required: true },
    { position: 'BENCH', required: true },
    { position: 'BENCH', required: true }
  ];

  return {
    slots,
    totalSpent: 0,
    remainingBudget: 200
  };
};

// Check if a player can fill a specific roster slot
export const canFillSlot = (player: DraftedPlayer, slot: RosterSlot): boolean => {
  if (slot.player) return false; // Slot already filled

  switch (slot.position) {
    case 'PG':
      return player.positions.includes('PG');
    case 'SG':
      return player.positions.includes('SG');
    case 'G':
      return player.positions.includes('PG') || player.positions.includes('SG');
    case 'SF':
      return player.positions.includes('SF');
    case 'PF':
      return player.positions.includes('PF');
    case 'F':
      return player.positions.includes('SF') || player.positions.includes('PF');
    case 'C':
      return player.positions.includes('C');
    case 'UTIL':
      return true; // Any position can fill utility
    case 'BENCH':
      return true; // Any position can fill bench
    default:
      return false;
  }
};

// Get roster needs analysis
export const getRosterNeeds = (roster: MyRoster): { [key: string]: number } => {
  const needs: { [key: string]: number } = {
    PG: 0,
    SG: 0,
    SF: 0,
    PF: 0,
    C: 0,
    any: 0
  };

  roster.slots.forEach(slot => {
    if (!slot.player) {
      switch (slot.position) {
        case 'PG':
          needs.PG++;
          break;
        case 'SG':
          needs.SG++;
          break;
        case 'G':
          needs.PG++;
          needs.SG++;
          break;
        case 'SF':
          needs.SF++;
          break;
        case 'PF':
          needs.PF++;
          break;
        case 'F':
          needs.SF++;
          needs.PF++;
          break;
        case 'C':
          needs.C++;
          break;
        case 'UTIL':
          needs.any++;
          break;
        case 'BENCH':
          needs.any++;
          break;
      }
    }
  });

  return needs;
};

// Calculate positional scarcity
export const getPositionalScarcity = (
  position: Position,
  playersRemaining: Player[],
  tier: number
): number => {
  const positionPlayers = playersRemaining.filter(p =>
    p.positions.includes(position) && p.tier <= tier
  );

  // Return scarcity score (lower = more scarce)
  return positionPlayers.length;
};

// Calculate value efficiency
export const getValueEfficiency = (player: Player, cost: number): number => {
  if (cost === 0) return Infinity;
  return player.projectedValue / cost;
};

// Determine draft phase based on players drafted
export const getDraftPhase = (playersDrafted: DraftedPlayer[], totalPlayers: number): 'early' | 'middle' | 'late' => {
  const draftedPercentage = playersDrafted.length / totalPlayers;

  if (draftedPercentage < 0.3) return 'early';
  if (draftedPercentage < 0.7) return 'middle';
  return 'late';
};

// GRANULAR BIDDING SCORING SYSTEM (0-100 points)

// Analyze nomination timing opportunity
export const analyzeNominationTiming = (
  player: Player,
  draftPhase: 'early' | 'middle' | 'late',
  playersDrafted: DraftedPlayer[]
): { isEarlyOpportunity: boolean; reasoning: string } => {
  // Calculate what tier of players have been drafted so far
  const draftedTiers = playersDrafted.map(p => p.tier);
  const avgDraftedTier = draftedTiers.length > 0 ?
    draftedTiers.reduce((sum, tier) => sum + tier, 0) / draftedTiers.length : 3;

  // Check if this is an unusually good player for this point in draft
  const isEarlyOpportunity = player.tier < avgDraftedTier - 0.5;

  let reasoning = '';
  if (isEarlyOpportunity && draftPhase === 'early') {
    reasoning = `🎯 Elite player (Tier ${player.tier}) available early - rare opportunity!`;
  } else if (isEarlyOpportunity && draftPhase === 'middle') {
    reasoning = `💎 High-tier player (Tier ${player.tier}) still available mid-draft - excellent opportunity!`;
  } else if (isEarlyOpportunity && draftPhase === 'late') {
    reasoning = `🔥 Premium player (Tier ${player.tier}) available late - exceptional opportunity!`;
  } else if (player.tier <= 2) {
    reasoning = `⭐ Elite player (Tier ${player.tier}) - always valuable regardless of timing`;
  } else if (draftPhase === 'late' && player.tier <= 4) {
    reasoning = `✅ Solid player (Tier ${player.tier}) in late phase - good opportunity`;
  } else {
    reasoning = `📊 Player (Tier ${player.tier}) nominated at expected time`;
  }

  return { isEarlyOpportunity, reasoning };
};

// Calculate roster fit score (0-25 points)
export const calculateRosterFitScore = (
  player: Player,
  roster: MyRoster,
  draftState: DraftState
): number => {
  let score = 0;
  const needs = getRosterNeeds(roster);
  const emptySlots = roster.slots.filter(slot => !slot.player).length;
  const filledSlots = roster.slots.filter(slot => slot.player).length;
  const rosterAnalysis = draftState.rosterAnalysis;

  // Special handling for empty or nearly empty roster
  if (filledSlots === 0) {
    // First pick - any good player is valuable
    score += 15; // High base score for first pick
    if (player.tier <= 2) score += 5; // Bonus for elite players
    if (player.positions.length > 1) score += 3; // Flexibility bonus
    return Math.min(25, score);
  } else if (filledSlots <= 2) {
    // Early picks - focus on best available
    score += 12; // Good base score for early picks
    if (player.tier <= 3) score += 3; // Bonus for good players
  }

  // Positional need (0-10 points)
  const hasPositionalNeed = player.positions.some(pos => needs[pos] > 0);
  if (hasPositionalNeed) {
    const maxNeed = Math.max(...player.positions.map(pos => needs[pos] || 0));
    score += Math.min(10, maxNeed * 3); // Up to 10 points for high positional need
  } else if (needs.any > 0) {
    score += 3; // Minimal points for utility/bench fill
  }

  // Category need fulfillment (0-10 points) - only after we have some players
  if (filledSlots >= 3) {
    const categoryNeeds = rosterAnalysis.categoryNeeds;
    let categoryScore = 0;
    Object.entries(categoryNeeds).forEach(([category, strength]) => {
      const categoryKey = category as FantasyCategory;
      const playerImpact = player.categoryStrengths[categoryKey];

      if (strength === 'weak' && playerImpact > 0.5) {
        categoryScore += 2; // Fills a weak category
      } else if (strength === 'weak' && playerImpact > 0) {
        categoryScore += 1; // Helps a weak category
      } else if (strength === 'strong' && playerImpact < -0.5) {
        categoryScore -= 1; // Hurts a strong category
      }
    });
    score += Math.max(0, Math.min(10, categoryScore));
  } else {
    // Early in draft - any positive category impact is good
    const totalPositiveImpact = Object.values(player.categoryStrengths)
      .filter(impact => impact > 0)
      .reduce((sum, impact) => sum + impact, 0);
    score += Math.min(8, Math.floor(totalPositiveImpact * 2));
  }

  // Roster balance and flexibility (0-5 points)
  const multiPositional = player.positions.length > 1;
  if (multiPositional) score += 2;

  // Urgency based on remaining slots
  if (emptySlots <= 3 && hasPositionalNeed) score += 3; // Urgent need
  else if (emptySlots <= 6 && hasPositionalNeed) score += 1;

  return Math.min(25, score);
};

// Calculate remaining players pool value (0-20 points)
export const calculateRemainingPlayersScore = (
  player: Player,
  playersRemaining: Player[]
): number => {
  let score = 0;
  const totalPlayersInPool = playersRemaining.length;

  // Early draft adjustment - when most players are available, focus on tier quality
  const isEarlyDraft = totalPlayersInPool > 150; // Most players still available

  if (isEarlyDraft) {
    // In early draft, tier quality matters more than scarcity
    if (player.tier === 1) score += 10; // Elite players always valuable early
    else if (player.tier === 2) score += 8; // Very good players valuable early
    else if (player.tier === 3) score += 6; // Good players decent early
    else if (player.tier === 4) score += 4; // Solid players okay early
    else score += 2; // Role players less valuable early

    // Tier scarcity still matters somewhat (0-5 points)
    const sameTierPlayers = playersRemaining.filter(p => p.tier === player.tier);
    const tierScarcity = sameTierPlayers.length;

    if (player.tier <= 2 && tierScarcity <= 10) score += 5; // Elite/very good getting scarce
    else if (player.tier <= 3 && tierScarcity <= 15) score += 3; // Good players getting scarce
    else if (tierScarcity <= 20) score += 1;

    // Quality within tier (0-5 points)
    const sameTierBetterPlayers = playersRemaining.filter(p =>
      p.tier === player.tier && p.projectedValue > player.projectedValue
    );

    if (sameTierBetterPlayers.length === 0) score += 5; // Best in tier
    else if (sameTierBetterPlayers.length <= 2) score += 3; // Top 3 in tier
    else if (sameTierBetterPlayers.length <= 5) score += 1; // Top 6 in tier

  } else {
    // Later in draft - traditional scarcity analysis

    // Positional scarcity (0-10 points)
    const scarcityScores = player.positions.map(pos => {
      const similarPlayers = playersRemaining.filter(p =>
        p.positions.includes(pos) && p.tier <= player.tier + 1
      );
      return similarPlayers.length;
    });
    const minScarcity = Math.min(...scarcityScores);

    if (minScarcity <= 2) score += 10; // Extremely scarce
    else if (minScarcity <= 4) score += 7; // Very scarce
    else if (minScarcity <= 8) score += 4; // Moderately scarce
    else if (minScarcity <= 15) score += 2; // Somewhat scarce

    // Tier scarcity (0-5 points)
    const sameTierPlayers = playersRemaining.filter(p => p.tier === player.tier);
    const tierScarcity = sameTierPlayers.length;

    if (tierScarcity <= 3) score += 5;
    else if (tierScarcity <= 6) score += 3;
    else if (tierScarcity <= 10) score += 1;

    // Quality drop-off analysis (0-5 points)
    const betterAlternatives = playersRemaining.filter(p =>
      p.projectedValue > player.projectedValue &&
      p.positions.some(pos => player.positions.includes(pos))
    );

    if (betterAlternatives.length === 0) score += 5; // No better alternatives
    else if (betterAlternatives.length <= 2) score += 3;
    else if (betterAlternatives.length <= 5) score += 1;
  }

  return Math.min(20, score);
};

// Calculate budget situation score (0-20 points)
export const calculateBudgetScore = (
  player: Player,
  currentBid: number,
  roster: MyRoster,
  otherTeamsBudgets?: TeamBudgetInfo[],
  allTeams?: TeamInfo[]
): number => {
  let score = 0;
  const myBudget = roster.remainingBudget;
  const emptySlots = roster.slots.filter(slot => !slot.player).length;

  // My budget health (0-8 points)
  const budgetAfterBid = myBudget - (currentBid + 1);
  const budgetRatio = budgetAfterBid / Math.max(1, emptySlots);

  if (budgetRatio > 15) score += 8; // Very healthy budget
  else if (budgetRatio > 10) score += 6; // Good budget
  else if (budgetRatio > 5) score += 4; // Adequate budget
  else if (budgetRatio > 2) score += 2; // Tight budget
  // 0 points for very tight budget

  // Affordability vs value (0-7 points)
  const nextBid = currentBid + 1;
  if (nextBid <= player.projectedValue * 0.7) score += 7; // Great deal
  else if (nextBid <= player.projectedValue * 0.8) score += 5; // Good deal
  else if (nextBid <= player.projectedValue * 0.9) score += 3; // Fair deal
  else if (nextBid <= player.projectedValue) score += 1; // At value

  // Enhanced competitive advantage using comprehensive team data (0-5 points)
  if (allTeams && allTeams.length > 0) {
    const competitiveAnalysis = analyzeCompetitiveInterest(player, allTeams);
    const myBudgetPerSlot = myBudget / Math.max(1, emptySlots);

    // Factor in number of interested teams
    if (competitiveAnalysis.interestedTeams === 0) {
      score += 5; // No competition
    } else if (competitiveAnalysis.interestedTeams <= 2) {
      score += 3; // Light competition
    } else if (competitiveAnalysis.interestedTeams <= 4) {
      score += 1; // Moderate competition
    }
    // Heavy competition (5+ teams) = 0 additional points

    // Factor in budget advantage
    if (competitiveAnalysis.avgBudgetPerSlot > 0) {
      const budgetAdvantage = myBudgetPerSlot / competitiveAnalysis.avgBudgetPerSlot;
      if (budgetAdvantage > 1.5) score += 2; // Major budget advantage
      else if (budgetAdvantage > 1.2) score += 1; // Good budget advantage
    }

  } else if (otherTeamsBudgets && otherTeamsBudgets.length > 0) {
    // Fallback to legacy budget comparison
    const competitorsBudgets = otherTeamsBudgets
      .filter(team => team.slotsRemaining > 0)
      .map(team => team.remainingBudget / Math.max(1, team.slotsRemaining));

    const myBudgetPerSlot = myBudget / Math.max(1, emptySlots);
    const avgCompetitorBudget = competitorsBudgets.reduce((a, b) => a + b, 0) / competitorsBudgets.length;

    if (myBudgetPerSlot > avgCompetitorBudget * 1.5) score += 5; // Major advantage
    else if (myBudgetPerSlot > avgCompetitorBudget * 1.2) score += 3; // Good advantage
    else if (myBudgetPerSlot > avgCompetitorBudget) score += 1; // Slight advantage
  }

  return Math.min(20, score);
};

// Calculate value efficiency score (0-20 points)
export const calculateValueEfficiencyScore = (
  player: Player,
  currentBid: number,
  draftPhase: 'early' | 'middle' | 'late'
): number => {
  let score = 0;
  const nextBid = currentBid + 1;
  const efficiency = player.projectedValue / nextBid;

  // Base efficiency score (0-12 points)
  if (efficiency >= 1.5) score += 12; // Exceptional value
  else if (efficiency >= 1.3) score += 10; // Excellent value
  else if (efficiency >= 1.15) score += 8; // Very good value
  else if (efficiency >= 1.0) score += 6; // Good value
  else if (efficiency >= 0.9) score += 4; // Fair value
  else if (efficiency >= 0.8) score += 2; // Below value
  // 0 points for poor value

  // Tier-based value adjustment (0-4 points)
  if (player.tier === 1 && efficiency > 1.0) score += 4; // Elite player at value
  else if (player.tier === 2 && efficiency > 1.1) score += 3; // Very good player at value
  else if (player.tier <= 3 && efficiency > 1.2) score += 2; // Good player at value
  else if (efficiency > 1.3) score += 1; // Any player at great value

  // Opportunity-based adjustment (0-4 points)
  // Focus on value opportunity regardless of when player is nominated
  if (player.tier <= 2 && efficiency > 1.0) {
    score += 4; // Elite player at good value - always valuable
  } else if (player.tier <= 3 && efficiency > 1.15) {
    score += 3; // Very good player at excellent value
  } else if (draftPhase === 'late' && efficiency > 1.2) {
    score += 4; // Any great value crucial late in draft
  } else if (efficiency > 1.25) {
    score += 2; // Exceptional value regardless of tier/phase
  }

  return Math.min(20, score);
};

// Calculate punt strategy score (0-15 points)
export const calculatePuntStrategyScore = (
  player: Player,
  roster: MyRoster,
  selectedStrategy: RosterStrategy,
  rosterAnalysis: RosterAnalysis
): number => {
  let score = 0;
  const filledSlots = roster.slots.filter(slot => slot.player).length;
  const playerImpact = player.categoryStrengths;

  // Early draft - focus on player quality and strategy fit
  if (filledSlots <= 3) {
    // Strategy alignment is most important early (0-10 points)
    const strategyFit = calculateStrategyFit(player, selectedStrategy, rosterAnalysis);
    score += Math.floor(strategyFit * 10);

    // Bonus for well-rounded players early (0-5 points)
    const positiveCategories = Object.values(playerImpact).filter(impact => impact > 0).length;
    if (positiveCategories >= 5) score += 5; // Very well-rounded
    else if (positiveCategories >= 3) score += 3; // Well-rounded
    else if (positiveCategories >= 2) score += 1; // Decent

    return Math.min(15, score);
  }

  // Later in draft - traditional punt analysis
  const categoryNeeds = rosterAnalysis.categoryNeeds;

  // Detect potential punt categories based on current roster
  const weakCategories = Object.entries(categoryNeeds)
    .filter(([, strength]) => strength === 'weak')
    .map(([category]) => category as FantasyCategory);

  // Auto-punt detection (0-8 points)
  if (weakCategories.length >= 2) {
    // We might be punting some categories
    let puntScore = 0;

    weakCategories.forEach(category => {
      if (playerImpact[category] < -0.3) {
        puntScore += 2; // Player helps solidify punt
      } else if (playerImpact[category] > 0.5) {
        puntScore -= 1; // Player fights against punt
      }
    });

    score += Math.max(0, Math.min(8, puntScore));
  }

  // Strategy alignment (0-7 points)
  const strategyFit = calculateStrategyFit(player, selectedStrategy, rosterAnalysis);
  score += Math.floor(strategyFit * 7);

  return Math.min(15, score);
};

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

// ROSTER CONSTRUCTION STRATEGIES

// Calculate current roster category totals
export const calculateRosterCategoryTotals = (roster: MyRoster): CategoryImpact => {
  const totals: CategoryImpact = {
    points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
    fg_pct: 0, ft_pct: 0, threePointers: 0, turnovers: 0
  };

  let playerCount = 0;
  roster.slots.forEach(slot => {
    if (slot.player) {
      const impact = slot.player.categoryStrengths;
      totals.points += impact.points;
      totals.rebounds += impact.rebounds;
      totals.assists += impact.assists;
      totals.steals += impact.steals;
      totals.blocks += impact.blocks;
      totals.fg_pct += impact.fg_pct;
      totals.ft_pct += impact.ft_pct;
      totals.threePointers += impact.threePointers;
      totals.turnovers += impact.turnovers;
      playerCount++;
    }
  });

  // Average the percentages
  if (playerCount > 0) {
    totals.fg_pct /= playerCount;
    totals.ft_pct /= playerCount;
  }

  return totals;
};

// Analyze roster category needs
export const analyzeRosterCategories = (roster: MyRoster): { [key in FantasyCategory]: 'strong' | 'weak' | 'neutral' } => {
  const totals = calculateRosterCategoryTotals(roster);

  return {
    points: totals.points > 1.5 ? 'strong' : totals.points < -0.5 ? 'weak' : 'neutral',
    rebounds: totals.rebounds > 1.5 ? 'strong' : totals.rebounds < -0.5 ? 'weak' : 'neutral',
    assists: totals.assists > 1.5 ? 'strong' : totals.assists < -0.5 ? 'weak' : 'neutral',
    steals: totals.steals > 1.0 ? 'strong' : totals.steals < -0.5 ? 'weak' : 'neutral',
    blocks: totals.blocks > 1.0 ? 'strong' : totals.blocks < -0.5 ? 'weak' : 'neutral',
    fg_pct: totals.fg_pct > 0.8 ? 'strong' : totals.fg_pct < -0.8 ? 'weak' : 'neutral',
    ft_pct: totals.ft_pct > 0.8 ? 'strong' : totals.ft_pct < -0.8 ? 'weak' : 'neutral',
    threePointers: totals.threePointers > 1.0 ? 'strong' : totals.threePointers < -0.5 ? 'weak' : 'neutral',
    turnovers: totals.turnovers > 0.8 ? 'strong' : totals.turnovers < -0.8 ? 'weak' : 'neutral'
  };
};

// Calculate strategy fit score for a player
export const calculateStrategyFit = (player: Player, strategy: RosterStrategy, rosterAnalysis: RosterAnalysis): number => {
  const impact = player.categoryStrengths;
  const needs = rosterAnalysis.categoryNeeds;

  switch (strategy) {
    case 'stars_scrubs':
      // Prioritize elite players (tier 1-2) and very cheap players
      return player.tier <= 2 ? 0.9 : player.projectedValue <= 5 ? 0.7 : 0.3;

    case 'balanced':
      // Prioritize filling weak categories
      let balanceScore = 0.5;
      Object.entries(needs).forEach(([category, strength]) => {
        const categoryKey = category as FantasyCategory;
        if (strength === 'weak' && impact[categoryKey] > 0.5) balanceScore += 0.1;
        if (strength === 'strong' && impact[categoryKey] < -0.5) balanceScore -= 0.1;
      });
      return Math.max(0, Math.min(1, balanceScore));

    case 'punt_ft':
      // Avoid good FT shooters, prioritize other stats
      return impact.ft_pct < -0.5 ? 0.8 : impact.ft_pct > 0.5 ? 0.2 : 0.6;

    case 'punt_fg':
      // Avoid good FG shooters, prioritize volume stats
      return impact.fg_pct < -0.5 ? 0.8 : impact.fg_pct > 0.5 ? 0.2 : 0.6;

    case 'punt_to':
      // Prioritize low turnover players
      return impact.turnovers > 0.5 ? 0.9 : impact.turnovers < -0.5 ? 0.3 : 0.6;

    case 'punt_assists':
      // Avoid assist-heavy players, focus on other categories
      return impact.assists < -0.5 ? 0.8 : impact.assists > 1.0 ? 0.2 : 0.6;

    default:
      return 0.5;
  }
};

// Generate roster analysis
export const generateRosterAnalysis = (roster: MyRoster, strategy: RosterStrategy): RosterAnalysis => {
  const categoryTotals = calculateRosterCategoryTotals(roster);
  const categoryNeeds = analyzeRosterCategories(roster);

  // Calculate positional flexibility
  const filledSlots = roster.slots.filter(slot => slot.player);
  const flexibilityScore = filledSlots.reduce((acc, slot) => {
    if (slot.player) {
      return acc + (slot.player.positions.length - 1) * 0.1;
    }
    return acc;
  }, 0) / Math.max(1, filledSlots.length);

  // Recommend strategy based on current roster
  let recommendedStrategy: RosterStrategy = strategy;
  const weakCategories = Object.entries(categoryNeeds).filter(([, strength]) => strength === 'weak').length;
  const strongCategories = Object.entries(categoryNeeds).filter(([, strength]) => strength === 'strong').length;

  if (weakCategories >= 3) {
    recommendedStrategy = 'punt_ft'; // Consider punting a category
  } else if (strongCategories >= 2 && roster.remainingBudget > 100) {
    recommendedStrategy = 'stars_scrubs'; // Go for stars
  } else {
    recommendedStrategy = 'balanced';
  }

  return {
    currentCategoryTotals: categoryTotals,
    categoryNeeds,
    recommendedStrategy,
    positionalFlexibility: Math.min(1, flexibilityScore)
  };
};

// ENHANCED BIDDING INTELLIGENCE

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

// Helper function to create team budget tracking
export const createTeamBudgetInfo = (
  teamName: string,
  remainingBudget: number,
  playersOwned: number,
  totalRosterSlots: number = 13
): TeamBudgetInfo => {
  return {
    teamName,
    remainingBudget,
    playersOwned,
    slotsRemaining: totalRosterSlots - playersOwned
  };
};

// Helper function to update team budget after a player is drafted
export const updateTeamBudget = (
  teamBudget: TeamBudgetInfo,
  playerCost: number
): TeamBudgetInfo => {
  return {
    ...teamBudget,
    remainingBudget: teamBudget.remainingBudget - playerCost,
    playersOwned: teamBudget.playersOwned + 1,
    slotsRemaining: teamBudget.slotsRemaining - 1
  };
};

// COMPREHENSIVE TEAM TRACKING SYSTEM

// Initialize all teams for tracking
export const initializeAllTeams = (teamNames: string[], totalBudget: number = 200): TeamInfo[] => {
  return teamNames.map(name => ({
    teamName: name,
    remainingBudget: totalBudget,
    totalSpent: 0,
    playersOwned: [],
    slotsRemaining: 13, // Standard fantasy roster size
    positionNeeds: {
      PG: 1, SG: 1, SF: 1, PF: 1, C: 2, // Required positions
      G: 1, F: 1, UTIL: 2, BENCH: 3, any: 8 // Flexible positions
    },
    categoryStrengths: {
      points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
      fg_pct: 0, ft_pct: 0, threePointers: 0, turnovers: 0
    },
    averagePlayerValue: 0,
    isMyTeam: name === 'Eyal'
  }));
};

// Calculate team's positional needs
export const calculateTeamPositionNeeds = (team: TeamInfo): { [key: string]: number } => {
  const needs = {
    PG: 1, SG: 1, SF: 1, PF: 1, C: 2,
    G: 1, F: 1, UTIL: 2, BENCH: 3, any: 0
  };

  // Count filled positions
  team.playersOwned.forEach(player => {
    player.positions.forEach(pos => {
      if (needs[pos] > 0) {
        needs[pos]--;
      }
    });
  });

  // Calculate flexible needs
  const totalFilled = team.playersOwned.length;
  needs.any = Math.max(0, 13 - totalFilled);

  return needs;
};

// Calculate team's category strengths
export const calculateTeamCategoryStrengths = (team: TeamInfo): CategoryImpact => {
  if (team.playersOwned.length === 0) {
    return {
      points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
      fg_pct: 0, ft_pct: 0, threePointers: 0, turnovers: 0
    };
  }

  const totals = team.playersOwned.reduce((acc, player) => {
    const impact = player.categoryStrengths;
    return {
      points: acc.points + impact.points,
      rebounds: acc.rebounds + impact.rebounds,
      assists: acc.assists + impact.assists,
      steals: acc.steals + impact.steals,
      blocks: acc.blocks + impact.blocks,
      fg_pct: acc.fg_pct + impact.fg_pct,
      ft_pct: acc.ft_pct + impact.ft_pct,
      threePointers: acc.threePointers + impact.threePointers,
      turnovers: acc.turnovers + impact.turnovers
    };
  }, {
    points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
    fg_pct: 0, ft_pct: 0, threePointers: 0, turnovers: 0
  });

  // Average the percentages
  const playerCount = team.playersOwned.length;
  totals.fg_pct /= playerCount;
  totals.ft_pct /= playerCount;

  return totals;
};

// Update team after a player is drafted
export const updateTeamAfterDraft = (team: TeamInfo, draftedPlayer: DraftedPlayer): TeamInfo => {
  const updatedTeam = {
    ...team,
    remainingBudget: team.remainingBudget - draftedPlayer.actualCost,
    totalSpent: team.totalSpent + draftedPlayer.actualCost,
    playersOwned: [...team.playersOwned, draftedPlayer],
    slotsRemaining: team.slotsRemaining - 1
  };

  // Recalculate derived properties
  updatedTeam.positionNeeds = calculateTeamPositionNeeds(updatedTeam);
  updatedTeam.categoryStrengths = calculateTeamCategoryStrengths(updatedTeam);
  updatedTeam.averagePlayerValue = updatedTeam.totalSpent / updatedTeam.playersOwned.length;

  return updatedTeam;
};

// Undo team draft (for undo functionality)
export const undoTeamDraft = (team: TeamInfo, playerToRemove: DraftedPlayer): TeamInfo => {
  const updatedTeam = {
    ...team,
    remainingBudget: team.remainingBudget + playerToRemove.actualCost,
    totalSpent: team.totalSpent - playerToRemove.actualCost,
    playersOwned: team.playersOwned.filter(p => p.id !== playerToRemove.id),
    slotsRemaining: team.slotsRemaining + 1
  };

  // Recalculate derived properties
  updatedTeam.positionNeeds = calculateTeamPositionNeeds(updatedTeam);
  updatedTeam.categoryStrengths = calculateTeamCategoryStrengths(updatedTeam);
  updatedTeam.averagePlayerValue = updatedTeam.playersOwned.length > 0
    ? updatedTeam.totalSpent / updatedTeam.playersOwned.length
    : 0;

  return updatedTeam;
};

// Analyze competitive landscape for a player
export const analyzeCompetitiveInterest = (
  player: Player,
  allTeams: TeamInfo[]
): { interestedTeams: number; avgBudgetPerSlot: number; maxCompetitorBudget: number } => {
  const otherTeams = allTeams.filter(team => !team.isMyTeam);

  let interestedTeams = 0;
  let totalBudgetPerSlot = 0;
  let maxBudget = 0;

  otherTeams.forEach(team => {
    const budgetPerSlot = team.slotsRemaining > 0 ? team.remainingBudget / team.slotsRemaining : 0;

    // Check if team might be interested (has positional need and budget)
    const hasPositionalNeed = player.positions.some(pos => team.positionNeeds[pos] > 0) || team.positionNeeds.any > 0;
    const canAfford = budgetPerSlot >= player.projectedValue * 0.7; // Can afford at least 70% of projected value

    if (hasPositionalNeed && canAfford && team.slotsRemaining > 0) {
      interestedTeams++;
      totalBudgetPerSlot += budgetPerSlot;
      maxBudget = Math.max(maxBudget, team.remainingBudget);
    }
  });

  return {
    interestedTeams,
    avgBudgetPerSlot: interestedTeams > 0 ? totalBudgetPerSlot / interestedTeams : 0,
    maxCompetitorBudget: maxBudget
  };
};

// ============================================================================
// ADVANCED COMPETITION ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Detect opponent strategy based on their draft picks
 */
export const detectOpponentStrategy = (team: TeamInfo, _allPlayers: DraftedPlayer[]): OpponentStrategy => {
  const teamPlayers = team.playersOwned;

  if (teamPlayers.length < 2) {
    return {
      teamName: team.teamName,
      detectedStrategy: 'unknown',
      confidence: 0,
      evidence: ['Not enough picks to determine strategy'],
      categoryFocus: [],
      positionFocus: []
    };
  }

  const evidence: string[] = [];
  const strategyScores = {
    stars_scrubs: 0,
    balanced: 0,
    punt_ft: 0,
    punt_fg: 0,
    punt_to: 0,
    punt_assists: 0
  };

  // Analyze spending patterns
  const totalSpent = team.totalSpent;
  const avgSpent = totalSpent / teamPlayers.length;
  const expensivePlayers = teamPlayers.filter(p => p.actualCost > avgSpent * 1.5);
  const cheapPlayers = teamPlayers.filter(p => p.actualCost < avgSpent * 0.7);

  // Stars & Scrubs detection
  if (expensivePlayers.length >= 2 && cheapPlayers.length >= 2) {
    strategyScores.stars_scrubs += 3;
    evidence.push(`Spent heavily on ${expensivePlayers.length} players, cheaply on ${cheapPlayers.length}`);
  }

  // Analyze category patterns
  const categoryTotals = team.categoryStrengths;
  const weakCategories: FantasyCategory[] = [];
  const strongCategories: FantasyCategory[] = [];

  Object.entries(categoryTotals).forEach(([cat, value]) => {
    const category = cat as FantasyCategory;
    if (value < -0.5) weakCategories.push(category);
    if (value > 0.5) strongCategories.push(category);
  });

  // Punt strategy detection
  if (weakCategories.includes('ft_pct') && weakCategories.length <= 2) {
    strategyScores.punt_ft += 2;
    evidence.push('Consistently weak in FT%, may be punting');
  }
  if (weakCategories.includes('fg_pct') && weakCategories.length <= 2) {
    strategyScores.punt_fg += 2;
    evidence.push('Consistently weak in FG%, may be punting');
  }
  if (weakCategories.includes('turnovers') && weakCategories.length <= 2) {
    strategyScores.punt_to += 2;
    evidence.push('High turnovers, may be punting TO');
  }
  if (weakCategories.includes('assists') && weakCategories.length <= 2) {
    strategyScores.punt_assists += 2;
    evidence.push('Low assists, may be punting AST');
  }

  // Balanced strategy detection
  if (weakCategories.length <= 1 && strongCategories.length >= 3) {
    strategyScores.balanced += 2;
    evidence.push('Well-rounded across categories');
  }

  // Position focus analysis
  const positionCounts: { [key in Position]: number } = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
  teamPlayers.forEach(player => {
    player.positions.forEach(pos => positionCounts[pos]++);
  });

  const positionFocus = Object.entries(positionCounts)
    .filter(([, count]) => count > teamPlayers.length * 0.4)
    .map(([pos]) => pos as Position);

  // Determine most likely strategy
  const maxScore = Math.max(...Object.values(strategyScores));
  const detectedStrategy = maxScore > 0
    ? Object.entries(strategyScores).find(([, score]) => score === maxScore)?.[0] as RosterStrategy || 'unknown'
    : 'unknown';

  const confidence = Math.min(maxScore / 3, 1); // Normalize to 0-1

  return {
    teamName: team.teamName,
    detectedStrategy,
    confidence,
    evidence,
    categoryFocus: strongCategories,
    positionFocus
  };
};

/**
 * Analyze bidding patterns for a team
 */
export const analyzeBiddingPatterns = (team: TeamInfo, _allDraftedPlayers: DraftedPlayer[]): BiddingPatterns => {
  const teamPlayers = team.playersOwned;

  if (teamPlayers.length === 0) {
    return {
      teamName: team.teamName,
      aggressiveness: 'moderate',
      bluffTendency: 0,
      averageOverbid: 0,
      positionPriorities: { PG: 0.2, SG: 0.2, SF: 0.2, PF: 0.2, C: 0.2 },
      tierPreferences: { 1: 0.2, 2: 0.2, 3: 0.2, 4: 0.2, 5: 0.2 },
      recentBehavior: {
        lastFiveBids: [],
        lastFiveOverbids: [],
        bluffCount: 0
      }
    };
  }

  // Calculate overbid amounts
  const overbids = teamPlayers.map(p => p.actualCost - p.projectedValue);
  const averageOverbid = overbids.reduce((sum, overbid) => sum + overbid, 0) / overbids.length;

  // Determine aggressiveness
  let aggressiveness: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
  if (averageOverbid > 5) aggressiveness = 'aggressive';
  else if (averageOverbid < -2) aggressiveness = 'conservative';

  // Position priorities based on spending
  const positionSpending: { [key in Position]: number } = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
  const positionCounts: { [key in Position]: number } = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };

  teamPlayers.forEach(player => {
    player.positions.forEach(pos => {
      positionSpending[pos] += player.actualCost;
      positionCounts[pos]++;
    });
  });

  const positionPriorities: { [key in Position]: number } = { PG: 0.2, SG: 0.2, SF: 0.2, PF: 0.2, C: 0.2 };
  const totalSpending = Object.values(positionSpending).reduce((sum, spending) => sum + spending, 0);

  if (totalSpending > 0) {
    Object.keys(positionSpending).forEach(pos => {
      const position = pos as Position;
      positionPriorities[position] = positionSpending[position] / totalSpending;
    });
  }

  // Tier preferences
  const tierSpending: { [tier: number]: number } = {};
  const tierCounts: { [tier: number]: number } = {};

  teamPlayers.forEach(player => {
    tierSpending[player.tier] = (tierSpending[player.tier] || 0) + player.actualCost;
    tierCounts[player.tier] = (tierCounts[player.tier] || 0) + 1;
  });

  const tierPreferences: { [tier: number]: number } = {};
  Object.keys(tierSpending).forEach(tier => {
    const tierNum = parseInt(tier);
    tierPreferences[tierNum] = tierSpending[tierNum] / totalSpending;
  });

  // Recent behavior (last 5 picks)
  const lastFive = teamPlayers.slice(-5);
  const lastFiveBids = lastFive.map(p => p.actualCost);
  const lastFiveOverbids = lastFive.map(p => p.actualCost - p.projectedValue);

  return {
    teamName: team.teamName,
    aggressiveness,
    bluffTendency: 0, // Would need nomination history to calculate
    averageOverbid,
    positionPriorities,
    tierPreferences,
    recentBehavior: {
      lastFiveBids,
      lastFiveOverbids,
      bluffCount: 0 // Would need nomination history
    }
  };
};

/**
 * Analyze budget pressure for a team
 */
export const analyzeBudgetPressure = (team: TeamInfo): BudgetPressure => {
  const avgBudgetPerSlot = team.slotsRemaining > 0 ? team.remainingBudget / team.slotsRemaining : 0;
  const totalSlots = 13; // Standard fantasy roster
  const draftProgress = (totalSlots - team.slotsRemaining) / totalSlots;

  // Determine pressure level
  let pressureLevel: 'desperate' | 'high' | 'moderate' | 'comfortable' = 'comfortable';

  if (avgBudgetPerSlot < 5 && team.slotsRemaining > 3) pressureLevel = 'desperate';
  else if (avgBudgetPerSlot < 10 && team.slotsRemaining > 2) pressureLevel = 'high';
  else if (avgBudgetPerSlot < 15 || draftProgress > 0.7) pressureLevel = 'moderate';

  // Must-fill positions
  const mustFillPositions: Position[] = [];
  Object.entries(team.positionNeeds).forEach(([pos, need]) => {
    if (need > 0 && pos !== 'any') {
      mustFillPositions.push(pos as Position);
    }
  });

  // Desperation factors
  const needsStarPlayer = team.playersOwned.filter(p => p.tier <= 2).length === 0 && draftProgress < 0.5;
  const runningOutOfTime = team.slotsRemaining <= 3 && draftProgress > 0.8;
  const budgetConstraints = avgBudgetPerSlot < 8;

  const likelyToOverbid = pressureLevel === 'desperate' ||
    (pressureLevel === 'high' && (needsStarPlayer || runningOutOfTime));

  // Estimate panic point
  const estimatedPanicPoint = Math.max(0, team.slotsRemaining - 3);

  return {
    teamName: team.teamName,
    pressureLevel,
    mustFillPositions,
    slotsRemaining: team.slotsRemaining,
    averageBudgetPerSlot: avgBudgetPerSlot,
    likelyToOverbid,
    estimatedPanicPoint,
    desperation: {
      needsStarPlayer,
      runningOutOfTime,
      budgetConstraints
    }
  };
};

/**
 * Generate threat assessment for a specific player
 */
export const generateThreatAssessment = (
  player: Player,
  allTeams: TeamInfo[],
  draftedPlayers: DraftedPlayer[]
): ThreatAssessment => {
  const otherTeams = allTeams.filter(team => !team.isMyTeam);
  const threateningTeams = [];

  for (const team of otherTeams) {
    const strategy = detectOpponentStrategy(team, draftedPlayers);
    const patterns = analyzeBiddingPatterns(team, draftedPlayers);
    const pressure = analyzeBudgetPressure(team);

    // Calculate strategic fit
    let strategicFit = 0.5; // Base fit

    // Position fit
    const hasPositionalNeed = player.positions.some(pos => team.positionNeeds[pos] > 0) || team.positionNeeds.any > 0;
    if (hasPositionalNeed) strategicFit += 0.2;

    // Category fit
    const categoryFit = Object.entries(player.categoryStrengths).reduce((fit, [cat, value]) => {
      const teamNeed = team.categoryStrengths[cat as keyof CategoryImpact];
      if (teamNeed < -0.5 && value > 0.5) return fit + 0.1; // Player helps weak category
      return fit;
    }, 0);
    strategicFit += Math.min(categoryFit, 0.3);

    // Budget considerations
    const avgBudgetPerSlot = team.slotsRemaining > 0 ? team.remainingBudget / team.slotsRemaining : 0;
    const canAfford = avgBudgetPerSlot >= player.projectedValue * 0.7;

    if (!canAfford) {
      strategicFit = Math.min(strategicFit, 0.3);
    }

    // Calculate bid probability
    let bidProbability = strategicFit;
    if (pressure.likelyToOverbid) bidProbability += 0.2;
    if (team.slotsRemaining <= 5) bidProbability += 0.1;
    bidProbability = Math.min(bidProbability, 0.95);

    // Estimate max likely bid
    const baseBid = player.projectedValue;
    const overbidMultiplier = 1 + (patterns.averageOverbid / baseBid);
    const pressureMultiplier = pressure.pressureLevel === 'desperate' ? 1.2 :
                              pressure.pressureLevel === 'high' ? 1.1 : 1.0;

    const maxLikelyBid = Math.min(
      baseBid * overbidMultiplier * pressureMultiplier,
      team.remainingBudget
    );

    // Determine threat level
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (bidProbability > 0.8 && maxLikelyBid > player.projectedValue * 1.1) threatLevel = 'critical';
    else if (bidProbability > 0.6 && maxLikelyBid > player.projectedValue) threatLevel = 'high';
    else if (bidProbability > 0.4) threatLevel = 'medium';

    const reasoning = [];
    if (hasPositionalNeed) reasoning.push(`Needs ${player.positions.join('/')}`);
    if (pressure.likelyToOverbid) reasoning.push(`Budget pressure (${pressure.pressureLevel})`);
    if (patterns.averageOverbid > 3) reasoning.push(`Typically overbids by $${patterns.averageOverbid.toFixed(0)}`);
    if (strategy.confidence > 0.5) reasoning.push(`Fits ${strategy.detectedStrategy} strategy`);

    threateningTeams.push({
      teamName: team.teamName,
      threatLevel,
      maxLikelyBid: Math.round(maxLikelyBid),
      bidProbability,
      reasoning,
      strategicFit
    });
  }

  // Sort by threat level and bid probability
  threateningTeams.sort((a, b) => {
    const threatOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const aThreat = threatOrder[a.threatLevel];
    const bThreat = threatOrder[b.threatLevel];

    if (aThreat !== bThreat) return bThreat - aThreat;
    return b.bidProbability - a.bidProbability;
  });

  // Calculate expected final cost
  const highThreatTeams = threateningTeams.filter(t => t.threatLevel === 'critical' || t.threatLevel === 'high');
  const expectedFinalCost = highThreatTeams.length > 0
    ? Math.max(...highThreatTeams.map(t => t.maxLikelyBid))
    : player.projectedValue;

  // Determine recommended strategy
  let recommendedStrategy: 'bid_early' | 'wait_and_see' | 'force_overbid' | 'avoid' | 'bluff_opportunity' = 'wait_and_see';

  const competitionIntensity = threateningTeams.filter(t => t.bidProbability > 0.5).length / otherTeams.length;

  if (competitionIntensity > 0.6) recommendedStrategy = 'avoid';
  else if (competitionIntensity > 0.4) recommendedStrategy = 'bid_early';
  else if (competitionIntensity < 0.2) recommendedStrategy = 'bluff_opportunity';

  return {
    player,
    threateningTeams,
    recommendedStrategy,
    expectedFinalCost: Math.round(expectedFinalCost),
    competitionIntensity
  };
};

/**
 * Generate comprehensive competitive intelligence
 */
export const generateCompetitiveIntelligence = (
  allTeams: TeamInfo[],
  draftedPlayers: DraftedPlayer[]
): CompetitiveIntelligence => {
  const otherTeams = allTeams.filter(team => !team.isMyTeam);

  // Generate opponent strategies
  const opponentStrategies = otherTeams.map(team =>
    detectOpponentStrategy(team, draftedPlayers)
  );

  // Generate bidding patterns
  const biddingPatterns = otherTeams.map(team =>
    analyzeBiddingPatterns(team, draftedPlayers)
  );

  // Generate budget pressures
  const budgetPressures = otherTeams.map(team =>
    analyzeBudgetPressure(team)
  );

  // Calculate market trends
  const allOverbids = draftedPlayers.map(p => p.actualCost - p.projectedValue);
  const averageOverbid = allOverbids.length > 0
    ? allOverbids.reduce((sum, overbid) => sum + overbid, 0) / allOverbids.length
    : 0;

  const inflationRate = averageOverbid / (draftedPlayers.length > 0
    ? draftedPlayers.reduce((sum, p) => sum + p.projectedValue, 0) / draftedPlayers.length
    : 20);

  // Position inflation
  const positionInflation: { [key in Position]: number } = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
  Object.keys(positionInflation).forEach(pos => {
    const position = pos as Position;
    const positionPlayers = draftedPlayers.filter(p => p.positions.includes(position));
    if (positionPlayers.length > 0) {
      const posOverbids = positionPlayers.map(p => p.actualCost - p.projectedValue);
      positionInflation[position] = posOverbids.reduce((sum, overbid) => sum + overbid, 0) / posOverbids.length;
    }
  });

  // Tier inflation
  const tierInflation: { [tier: number]: number } = {};
  [1, 2, 3, 4, 5].forEach(tier => {
    const tierPlayers = draftedPlayers.filter(p => p.tier === tier);
    if (tierPlayers.length > 0) {
      const tierOverbids = tierPlayers.map(p => p.actualCost - p.projectedValue);
      tierInflation[tier] = tierOverbids.reduce((sum, overbid) => sum + overbid, 0) / tierOverbids.length;
    } else {
      tierInflation[tier] = 0;
    }
  });

  return {
    opponentStrategies,
    biddingPatterns,
    budgetPressures,
    marketTrends: {
      averageOverbid,
      inflationRate,
      positionInflation,
      tierInflation
    }
  };
};

/**
 * Generate complete advanced competition analysis for a player
 */
export const generateAdvancedCompetitionAnalysis = (
  player: Player,
  draftState: DraftState
): AdvancedCompetitionAnalysis => {
  const threatAssessment = generateThreatAssessment(player, draftState.allTeams, draftState.playersDrafted);
  const competitiveIntelligence = generateCompetitiveIntelligence(draftState.allTeams, draftState.playersDrafted);

  // Generate strategic recommendations
  const highThreatCount = threatAssessment.threateningTeams.filter(t =>
    t.threatLevel === 'critical' || t.threatLevel === 'high'
  ).length;

  let nominationTiming: 'now' | 'wait' | 'never' = 'wait';
  let biddingApproach: 'aggressive' | 'patient' | 'bluff' | 'avoid' = 'patient';

  if (highThreatCount === 0) {
    nominationTiming = 'now';
    biddingApproach = 'patient';
  } else if (highThreatCount >= 3) {
    nominationTiming = 'never';
    biddingApproach = 'avoid';
  } else if (threatAssessment.competitionIntensity > 0.5) {
    biddingApproach = 'aggressive';
  }

  const maxRecommendedBid = Math.min(
    threatAssessment.expectedFinalCost * 1.05, // 5% buffer
    player.projectedValue * 1.1 // Don't exceed 110% of value
  );

  const confidenceLevel = 1 - threatAssessment.competitionIntensity;

  return {
    threatAssessment,
    competitiveIntelligence,
    strategicRecommendations: {
      nominationTiming,
      biddingApproach,
      maxRecommendedBid: Math.round(maxRecommendedBid),
      confidenceLevel
    }
  };
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
