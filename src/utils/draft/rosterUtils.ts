import { MyRoster, RosterSlot, DraftedPlayer, Position, RosterStrategy, CategoryImpact, RosterAnalysis, FantasyCategory } from '../../types';

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
    case 'BENCH':
      return true; // Any player can fill UTIL or BENCH
    default:
      return false;
  }
};

// Get roster needs analysis
export const getRosterNeeds = (roster: MyRoster): { [key: string]: number } => {
  const needs: { [key: string]: number } = {
    PG: 0, SG: 0, SF: 0, PF: 0, C: 0, any: 0
  };

  roster.slots.forEach(slot => {
    if (!slot.player) {
      if (slot.position === 'PG') needs.PG++;
      else if (slot.position === 'SG') needs.SG++;
      else if (slot.position === 'G') {
        // Flexible guard slot - prefer PG if we need one, otherwise SG
        if (needs.PG > 0) needs.PG++;
        else needs.SG++;
      }
      else if (slot.position === 'SF') needs.SF++;
      else if (slot.position === 'PF') needs.PF++;
      else if (slot.position === 'F') {
        // Flexible forward slot - prefer SF if we need one, otherwise PF
        if (needs.SF > 0) needs.SF++;
        else needs.PF++;
      }
      else if (slot.position === 'C') needs.C++;
      else needs.any++; // UTIL or BENCH
    }
  });

  return needs;
};

// Generate comprehensive roster analysis
export const generateRosterAnalysis = (roster: MyRoster, strategy: RosterStrategy): RosterAnalysis => {
  const filledSlots = roster.slots.filter(slot => slot.player);

  // Calculate current category totals
  const currentCategoryTotals: CategoryImpact = filledSlots.reduce((totals, slot) => {
    if (!slot.player) return totals;

    return {
      points: totals.points + slot.player.categoryStrengths.points,
      rebounds: totals.rebounds + slot.player.categoryStrengths.rebounds,
      assists: totals.assists + slot.player.categoryStrengths.assists,
      steals: totals.steals + slot.player.categoryStrengths.steals,
      blocks: totals.blocks + slot.player.categoryStrengths.blocks,
      fg_pct: totals.fg_pct + slot.player.categoryStrengths.fg_pct,
      ft_pct: totals.ft_pct + slot.player.categoryStrengths.ft_pct,
      threePointers: totals.threePointers + slot.player.categoryStrengths.threePointers,
      turnovers: totals.turnovers + slot.player.categoryStrengths.turnovers
    };
  }, {
    points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
    fg_pct: 0, ft_pct: 0, threePointers: 0, turnovers: 0
  });

  // Determine category needs based on current totals and strategy
  const categoryNeeds: { [key in FantasyCategory]: 'strong' | 'weak' | 'neutral' } = {
    points: currentCategoryTotals.points > 2 ? 'strong' : currentCategoryTotals.points < -1 ? 'weak' : 'neutral',
    rebounds: currentCategoryTotals.rebounds > 2 ? 'strong' : currentCategoryTotals.rebounds < -1 ? 'weak' : 'neutral',
    assists: currentCategoryTotals.assists > 2 ? 'strong' : currentCategoryTotals.assists < -1 ? 'weak' : 'neutral',
    steals: currentCategoryTotals.steals > 1.5 ? 'strong' : currentCategoryTotals.steals < -1 ? 'weak' : 'neutral',
    blocks: currentCategoryTotals.blocks > 1.5 ? 'strong' : currentCategoryTotals.blocks < -1 ? 'weak' : 'neutral',
    fg_pct: currentCategoryTotals.fg_pct > 1.5 ? 'strong' : currentCategoryTotals.fg_pct < -1.5 ? 'weak' : 'neutral',
    ft_pct: currentCategoryTotals.ft_pct > 1.5 ? 'strong' : currentCategoryTotals.ft_pct < -1.5 ? 'weak' : 'neutral',
    threePointers: currentCategoryTotals.threePointers > 2 ? 'strong' : currentCategoryTotals.threePointers < -1 ? 'weak' : 'neutral',
    turnovers: currentCategoryTotals.turnovers > 1.5 ? 'strong' : currentCategoryTotals.turnovers < -1.5 ? 'weak' : 'neutral'
  };

  // Adjust category needs based on punt strategy
  if (strategy === 'punt_ft') {
    categoryNeeds.ft_pct = 'weak'; // Intentionally punt FT%
  } else if (strategy === 'punt_fg') {
    categoryNeeds.fg_pct = 'weak'; // Intentionally punt FG%
  } else if (strategy === 'punt_to') {
    categoryNeeds.turnovers = 'weak'; // Intentionally punt turnovers (accept high TO)
  } else if (strategy === 'punt_assists') {
    categoryNeeds.assists = 'weak'; // Intentionally punt assists
  }

  // Calculate positional flexibility
  const positionCounts = filledSlots.reduce((counts, slot) => {
    if (!slot.player) return counts;
    slot.player.positions.forEach(pos => {
      counts[pos] = (counts[pos] || 0) + 1;
    });
    return counts;
  }, {} as { [key in Position]?: number });

  const totalPositions = Object.values(positionCounts).reduce((sum, count) => sum + count, 0);
  const uniquePositions = Object.keys(positionCounts).length;
  const positionalFlexibility = totalPositions > 0 ? uniquePositions / totalPositions : 0;

  return {
    currentCategoryTotals,
    categoryNeeds,
    recommendedStrategy: strategy, // For now, keep the selected strategy
    positionalFlexibility
  };
};
