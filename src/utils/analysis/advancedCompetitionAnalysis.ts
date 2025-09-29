import {
  Player,
  DraftedPlayer,
  DraftState,
  TeamInfo,
  OpponentStrategy,
  BiddingPatterns,
  ThreatAssessment,
  BudgetPressure,
  CompetitiveIntelligence,
  AdvancedCompetitionAnalysis,
  RosterStrategy,
  Position,
  FantasyCategory
} from '../../types';

/**
 * Detect opponent strategy based on their draft picks
 */
export const detectOpponentStrategy = (team: TeamInfo): OpponentStrategy => {
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
export const analyzeBiddingPatterns = (team: TeamInfo): BiddingPatterns => {
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
  allTeams: TeamInfo[]
): ThreatAssessment => {
  const otherTeams = allTeams.filter(team => !team.isMyTeam);
  const threateningTeams = [];

  for (const team of otherTeams) {
    const strategy = detectOpponentStrategy(team);
    const patterns = analyzeBiddingPatterns(team);
    const pressure = analyzeBudgetPressure(team);

    // Calculate strategic fit
    let strategicFit = 0.5; // Base fit

    // Position fit
    const hasPositionalNeed = player.positions.some(pos => team.positionNeeds[pos] > 0) || team.positionNeeds.any > 0;
    if (hasPositionalNeed) strategicFit += 0.2;

    // Category fit
    const categoryFit = Object.entries(player.categoryStrengths).reduce((fit, [cat, value]) => {
      const teamNeed = team.categoryStrengths[cat as keyof typeof team.categoryStrengths];
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
    detectOpponentStrategy(team)
  );

  // Generate bidding patterns
  const biddingPatterns = otherTeams.map(team =>
    analyzeBiddingPatterns(team)
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
  const threatAssessment = generateThreatAssessment(player, draftState.allTeams);
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
