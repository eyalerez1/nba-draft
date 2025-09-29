import {
  TeamInfo,
  Player
} from '../../types';

// Analyze competitive interest in a player
export const analyzeCompetitiveInterest = (player: Player, allTeams: TeamInfo[]) => {
  const otherTeams = allTeams.filter(team => !team.isMyTeam);

  let interestedTeams = 0;
  let totalBudget = 0;
  let maxCompetitorBudget = 0;

  otherTeams.forEach(team => {
    const budgetPerSlot = team.slotsRemaining > 0 ? team.remainingBudget / team.slotsRemaining : 0;
    totalBudget += team.remainingBudget;
    maxCompetitorBudget = Math.max(maxCompetitorBudget, team.remainingBudget);

    // Consider a team interested if they have budget and positional need
    const hasPositionalNeed = player.positions.some(pos => {
      const needs = calculateTeamPositionNeeds(team);
      return needs[pos] > 0 || needs.any > 0;
    });

    if (budgetPerSlot >= player.projectedValue * 0.8 && hasPositionalNeed) {
      interestedTeams++;
    }
  });

  const avgBudgetPerSlot = otherTeams.length > 0
    ? totalBudget / otherTeams.reduce((sum, team) => sum + team.slotsRemaining, 0)
    : 0;

  return {
    interestedTeams,
    avgBudgetPerSlot,
    maxCompetitorBudget
  };
};

// Helper function for position needs calculation
const calculateTeamPositionNeeds = (team: TeamInfo): { [key: string]: number } => {
  const needs = { ...team.positionNeeds };

  team.playersOwned.forEach(player => {
    player.positions.forEach(position => {
      if (needs[position] > 0) {
        needs[position]--;
      } else if (needs.any > 0) {
        needs.any--;
      }
    });
  });

  return needs;
};

// Note: detectOpponentStrategy, analyzeBiddingPatterns, and analyzeBudgetPressure
// have been moved to advancedCompetitionAnalysis.ts for more comprehensive implementations
