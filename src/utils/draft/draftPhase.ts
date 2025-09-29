import { DraftState, BudgetAllocation } from '../../types';

// Determine current draft phase
export const getDraftPhase = (playersDrafted: any[], totalPlayers: number): 'early' | 'middle' | 'late' => {
  const draftProgress = playersDrafted.length / totalPlayers;

  if (draftProgress < 0.3) return 'early';
  if (draftProgress < 0.7) return 'middle';
  return 'late';
};

// Calculate budget allocation strategy
export const calculateBudgetAllocation = (draftState: DraftState): BudgetAllocation => {
  const { myRoster, draftPhase, totalBudget } = draftState;
  const remainingSlots = myRoster.slots.filter(slot => !slot.player).length;
  const spentBudget = myRoster.totalSpent;
  const remainingBudget = totalBudget - spentBudget;

  let earlyPhaseTarget = 0;
  let middlePhaseTarget = 0;
  let latePhaseTarget = 0;
  let starPlayerBudget = 0;
  const reasoning: string[] = [];

  if (draftPhase === 'early') {
    // Early phase: Secure 1-2 star players
    starPlayerBudget = Math.min(remainingBudget * 0.6, 120);
    earlyPhaseTarget = remainingBudget * 0.4;
    middlePhaseTarget = remainingBudget * 0.4;
    latePhaseTarget = remainingBudget * 0.2;

    reasoning.push('Early phase: Focus on securing star players');
    reasoning.push(`Reserve $${starPlayerBudget} for tier 1-2 players`);
  } else if (draftPhase === 'middle') {
    // Middle phase: Fill core roster spots
    starPlayerBudget = Math.min(remainingBudget * 0.3, 60);
    middlePhaseTarget = remainingBudget * 0.6;
    latePhaseTarget = remainingBudget * 0.4;

    reasoning.push('Middle phase: Fill core roster positions');
    reasoning.push('Balance value and positional needs');
  } else {
    // Late phase: Fill remaining slots with value picks
    starPlayerBudget = Math.min(remainingBudget * 0.2, 30);
    latePhaseTarget = remainingBudget * 0.8;

    reasoning.push('Late phase: Focus on value and roster completion');
    reasoning.push('Target undervalued players and sleepers');
  }

  // Adjust based on remaining slots
  if (remainingSlots <= 3) {
    latePhaseTarget = remainingBudget * 0.9;
    reasoning.push('Few slots remaining: Spend aggressively');
  }

  return {
    earlyPhaseTarget,
    middlePhaseTarget,
    latePhaseTarget,
    starPlayerBudget,
    reasoning
  };
};
