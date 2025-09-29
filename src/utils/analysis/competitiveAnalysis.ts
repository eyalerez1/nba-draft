import {
  TeamInfo,
  DraftedPlayer,
  Player,
  OpponentStrategy,
  BiddingPatterns,
  BudgetPressure,
  RosterStrategy,
  Position,
  FantasyCategory
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

// Detect opponent's draft strategy
export const detectOpponentStrategy = (team: TeamInfo, playersDrafted: DraftedPlayer[]): OpponentStrategy => {
  const teamPlayers = team.playersOwned;

  if (teamPlayers.length < 2) {
    return {
      teamName: team.teamName,
      detectedStrategy: 'unknown',
      confidence: 0,
      evidence: ['Not enough data'],
      categoryFocus: [],
      positionFocus: []
    };
  }

  // Analyze category strengths
  const avgCategoryStrengths = {
    points: team.categoryStrengths.points / teamPlayers.length,
    rebounds: team.categoryStrengths.rebounds / teamPlayers.length,
    assists: team.categoryStrengths.assists / teamPlayers.length,
    steals: team.categoryStrengths.steals / teamPlayers.length,
    blocks: team.categoryStrengths.blocks / teamPlayers.length,
    fg_pct: team.categoryStrengths.fg_pct / teamPlayers.length,
    ft_pct: team.categoryStrengths.ft_pct / teamPlayers.length,
    threePointers: team.categoryStrengths.threePointers / teamPlayers.length,
    turnovers: team.categoryStrengths.turnovers / teamPlayers.length
  };

  // Detect punt strategies
  let detectedStrategy: RosterStrategy | 'unknown' = 'balanced';
  const evidence: string[] = [];
  const categoryFocus: FantasyCategory[] = [];

  if (avgCategoryStrengths.ft_pct < -1) {
    detectedStrategy = 'punt_ft';
    evidence.push('Consistently drafting poor FT% players');
  } else if (avgCategoryStrengths.fg_pct < -1) {
    detectedStrategy = 'punt_fg';
    evidence.push('Consistently drafting poor FG% players');
  } else if (avgCategoryStrengths.assists < -1) {
    detectedStrategy = 'punt_assists';
    evidence.push('Avoiding assist-heavy players');
  } else if (avgCategoryStrengths.turnovers < -1) {
    detectedStrategy = 'punt_to';
    evidence.push('Drafting high-turnover players');
  }

  // Identify category focus
  Object.entries(avgCategoryStrengths).forEach(([category, strength]) => {
    if (strength > 1) {
      categoryFocus.push(category as FantasyCategory);
      evidence.push(`Strong focus on ${category}`);
    }
  });

  // Analyze positional focus
  const positionCounts: { [key in Position]?: number } = {};
  teamPlayers.forEach(player => {
    player.positions.forEach(pos => {
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });
  });

  const positionFocus: Position[] = [];
  Object.entries(positionCounts).forEach(([position, count]) => {
    if (count && count > teamPlayers.length * 0.4) {
      positionFocus.push(position as Position);
      evidence.push(`Heavy focus on ${position} position`);
    }
  });

  // Calculate confidence based on evidence strength
  const confidence = Math.min(evidence.length * 0.25, 1);

  return {
    teamName: team.teamName,
    detectedStrategy,
    confidence,
    evidence,
    categoryFocus,
    positionFocus
  };
};

// Analyze team's bidding patterns
export const analyzeBiddingPatterns = (team: TeamInfo, playersDrafted: DraftedPlayer[]): BiddingPatterns => {
  const teamPlayers = team.playersOwned;

  if (teamPlayers.length === 0) {
    return {
      teamName: team.teamName,
      aggressiveness: 'moderate',
      bluffTendency: 0,
      averageOverbid: 0,
      positionPriorities: {
        PG: 0.2, SG: 0.2, SF: 0.2, PF: 0.2, C: 0.2
      },
      tierPreferences: { 1: 0.2, 2: 0.3, 3: 0.3, 4: 0.2 },
      recentBehavior: {
        lastFiveBids: [],
        lastFiveOverbids: [],
        bluffCount: 0
      }
    };
  }

  // Calculate average overbid
  const overbids = teamPlayers.map(player => player.actualCost - player.projectedValue);
  const averageOverbid = overbids.reduce((sum, overbid) => sum + overbid, 0) / overbids.length;

  // Determine aggressiveness based on overbid patterns
  let aggressiveness: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
  if (averageOverbid > 10) {
    aggressiveness = 'aggressive';
  } else if (averageOverbid < -5) {
    aggressiveness = 'conservative';
  }

  // Analyze position priorities
  const positionCounts: { [key in Position]: number } = {
    PG: 0, SG: 0, SF: 0, PF: 0, C: 0
  };

  teamPlayers.forEach(player => {
    player.positions.forEach(pos => {
      positionCounts[pos]++;
    });
  });

  const totalPositions = Object.values(positionCounts).reduce((sum, count) => sum + count, 0);
  const positionPriorities: { [key in Position]: number } = {
    PG: totalPositions > 0 ? positionCounts.PG / totalPositions : 0.2,
    SG: totalPositions > 0 ? positionCounts.SG / totalPositions : 0.2,
    SF: totalPositions > 0 ? positionCounts.SF / totalPositions : 0.2,
    PF: totalPositions > 0 ? positionCounts.PF / totalPositions : 0.2,
    C: totalPositions > 0 ? positionCounts.C / totalPositions : 0.2
  };

  // Analyze tier preferences
  const tierCounts: { [tier: number]: number } = {};
  teamPlayers.forEach(player => {
    tierCounts[player.tier] = (tierCounts[player.tier] || 0) + 1;
  });

  const tierPreferences: { [tier: number]: number } = {};
  Object.keys(tierCounts).forEach(tier => {
    const tierNum = parseInt(tier);
    tierPreferences[tierNum] = tierCounts[tierNum] / teamPlayers.length;
  });

  // Recent behavior analysis (last 5 players)
  const recentPlayers = teamPlayers.slice(-5);
  const lastFiveBids = recentPlayers.map(player => player.actualCost);
  const lastFiveOverbids = recentPlayers.map(player => player.actualCost - player.projectedValue);

  return {
    teamName: team.teamName,
    aggressiveness,
    bluffTendency: 0, // Would need more complex tracking
    averageOverbid,
    positionPriorities,
    tierPreferences,
    recentBehavior: {
      lastFiveBids,
      lastFiveOverbids,
      bluffCount: 0 // Would need bid tracking
    }
  };
};

// Analyze team's budget pressure
export const analyzeBudgetPressure = (team: TeamInfo): BudgetPressure => {
  const budgetPerSlot = team.slotsRemaining > 0 ? team.remainingBudget / team.slotsRemaining : 0;

  let pressureLevel: 'desperate' | 'high' | 'moderate' | 'comfortable' = 'comfortable';
  let likelyToOverbid = false;

  if (budgetPerSlot < 5) {
    pressureLevel = 'desperate';
    likelyToOverbid = true;
  } else if (budgetPerSlot < 10) {
    pressureLevel = 'high';
    likelyToOverbid = true;
  } else if (budgetPerSlot < 15) {
    pressureLevel = 'moderate';
  }

  // Estimate panic point (when they'll start overpaying)
  const estimatedPanicPoint = Math.max(0, team.slotsRemaining - 3);

  // Analyze what positions they must fill
  const needs = calculateTeamPositionNeeds(team);
  const mustFillPositions: Position[] = [];

  Object.entries(needs).forEach(([position, count]) => {
    if (count > 0 && position !== 'any') {
      mustFillPositions.push(position as Position);
    }
  });

  return {
    teamName: team.teamName,
    pressureLevel,
    mustFillPositions,
    slotsRemaining: team.slotsRemaining,
    averageBudgetPerSlot: budgetPerSlot,
    likelyToOverbid,
    estimatedPanicPoint,
    desperation: {
      needsStarPlayer: team.playersOwned.filter(p => p.tier <= 2).length === 0 && team.slotsRemaining <= 5,
      runningOutOfTime: team.slotsRemaining <= 3,
      budgetConstraints: budgetPerSlot < 10
    }
  };
};
