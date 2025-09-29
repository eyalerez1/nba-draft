import {
  Player,
  MyRoster,
  RosterStrategy,
  RosterAnalysis,
  FantasyCategory,
  CategoryImpact
} from '../../types';

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
