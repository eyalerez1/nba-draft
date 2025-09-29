import {
  Player,
  DraftedPlayer,
  MyRoster,
  DraftState,
  Position,
  FantasyCategory,
  TeamBudgetInfo,
  TeamInfo
} from '../../types';
import { getRosterNeeds } from '../draft/rosterUtils';
import { analyzeCompetitiveInterest } from '../analysis/competitiveAnalysis';

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
