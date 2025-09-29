import { TeamInfo, DraftedPlayer, Position } from '../../types';

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
  const needs = { ...team.positionNeeds };

  // Reduce needs based on players owned
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

// Update team after drafting a player
export const updateTeamAfterDraft = (team: TeamInfo, draftedPlayer: DraftedPlayer): TeamInfo => {
  const updatedCategoryStrengths = {
    points: team.categoryStrengths.points + draftedPlayer.categoryStrengths.points,
    rebounds: team.categoryStrengths.rebounds + draftedPlayer.categoryStrengths.rebounds,
    assists: team.categoryStrengths.assists + draftedPlayer.categoryStrengths.assists,
    steals: team.categoryStrengths.steals + draftedPlayer.categoryStrengths.steals,
    blocks: team.categoryStrengths.blocks + draftedPlayer.categoryStrengths.blocks,
    fg_pct: team.categoryStrengths.fg_pct + draftedPlayer.categoryStrengths.fg_pct,
    ft_pct: team.categoryStrengths.ft_pct + draftedPlayer.categoryStrengths.ft_pct,
    threePointers: team.categoryStrengths.threePointers + draftedPlayer.categoryStrengths.threePointers,
    turnovers: team.categoryStrengths.turnovers + draftedPlayer.categoryStrengths.turnovers
  };

  const newPlayersOwned = [...team.playersOwned, draftedPlayer];
  const newTotalSpent = team.totalSpent + draftedPlayer.actualCost;
  const newRemainingBudget = team.remainingBudget - draftedPlayer.actualCost;
  const newAveragePlayerValue = newPlayersOwned.length > 0 ? newTotalSpent / newPlayersOwned.length : 0;

  return {
    ...team,
    remainingBudget: newRemainingBudget,
    totalSpent: newTotalSpent,
    playersOwned: newPlayersOwned,
    slotsRemaining: team.slotsRemaining - 1,
    categoryStrengths: updatedCategoryStrengths,
    averagePlayerValue: newAveragePlayerValue
  };
};

// Undo team draft (remove last player)
export const undoTeamDraft = (team: TeamInfo, playerToRemove: DraftedPlayer): TeamInfo => {
  const updatedCategoryStrengths = {
    points: team.categoryStrengths.points - playerToRemove.categoryStrengths.points,
    rebounds: team.categoryStrengths.rebounds - playerToRemove.categoryStrengths.rebounds,
    assists: team.categoryStrengths.assists - playerToRemove.categoryStrengths.assists,
    steals: team.categoryStrengths.steals - playerToRemove.categoryStrengths.steals,
    blocks: team.categoryStrengths.blocks - playerToRemove.categoryStrengths.blocks,
    fg_pct: team.categoryStrengths.fg_pct - playerToRemove.categoryStrengths.fg_pct,
    ft_pct: team.categoryStrengths.ft_pct - playerToRemove.categoryStrengths.ft_pct,
    threePointers: team.categoryStrengths.threePointers - playerToRemove.categoryStrengths.threePointers,
    turnovers: team.categoryStrengths.turnovers - playerToRemove.categoryStrengths.turnovers
  };

  const newPlayersOwned = team.playersOwned.filter(p => p.id !== playerToRemove.id);
  const newTotalSpent = team.totalSpent - playerToRemove.actualCost;
  const newRemainingBudget = team.remainingBudget + playerToRemove.actualCost;
  const newAveragePlayerValue = newPlayersOwned.length > 0 ? newTotalSpent / newPlayersOwned.length : 0;

  return {
    ...team,
    remainingBudget: newRemainingBudget,
    totalSpent: newTotalSpent,
    playersOwned: newPlayersOwned,
    slotsRemaining: team.slotsRemaining + 1,
    categoryStrengths: updatedCategoryStrengths,
    averagePlayerValue: newAveragePlayerValue
  };
};

// Get team's actual statistical totals
export const getTeamActualStats = (team: TeamInfo) => {
  if (!team || team.playersOwned.length === 0) {
    return {
      points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
      fg_pct: 0, ft_pct: 0, threePointers: 0, turnovers: 0
    };
  }

  // Calculate actual statistical totals from player stats
  const totals = team.playersOwned.reduce((acc, player) => {
    return {
      points: acc.points + player.stats.points,
      rebounds: acc.rebounds + player.stats.rebounds,
      assists: acc.assists + player.stats.assists,
      steals: acc.steals + player.stats.steals,
      blocks: acc.blocks + player.stats.blocks,
      fg_pct: acc.fg_pct + player.stats.fg_pct,
      ft_pct: acc.ft_pct + player.stats.ft_pct,
      threePointers: acc.threePointers + player.stats.threePointers,
      turnovers: acc.turnovers + player.stats.turnovers
    };
  }, {
    points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
    fg_pct: 0, ft_pct: 0, threePointers: 0, turnovers: 0
  });

  // For percentages, calculate weighted average based on games played
  const totalGames = team.playersOwned.reduce((sum, player) => sum + player.stats.games, 0);
  if (totalGames > 0) {
    totals.fg_pct = team.playersOwned.reduce((sum, player) =>
      sum + (player.stats.fg_pct * player.stats.games), 0) / totalGames;
    totals.ft_pct = team.playersOwned.reduce((sum, player) =>
      sum + (player.stats.ft_pct * player.stats.games), 0) / totalGames;
  }

  return totals;
};
