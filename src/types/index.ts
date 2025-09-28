export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface Player {
  id: string;
  name: string;
  team: string;
  positions: Position[];
  projectedValue: number;
  stats: {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    fg_pct: number;
    ft_pct: number;
    threePointers: number;
    turnovers: number;
    games: number;
  };
  tier: number; // 1 = elite, 2 = very good, 3 = good, etc.
  categoryStrengths: CategoryImpact;
}

export interface DraftedPlayer extends Player {
  draftedBy: string;
  actualCost: number;
  draftOrder: number;
}

export interface RosterSlot {
  position: 'PG' | 'SG' | 'G' | 'SF' | 'PF' | 'F' | 'C' | 'UTIL' | 'BENCH';
  player?: DraftedPlayer;
  required: boolean;
}

export interface MyRoster {
  slots: RosterSlot[];
  totalSpent: number;
  remainingBudget: number;
}

export interface TeamInfo {
  teamName: string;
  remainingBudget: number;
  totalSpent: number;
  playersOwned: DraftedPlayer[];
  slotsRemaining: number;
  positionNeeds: { [key: string]: number }; // PG, SG, SF, PF, C, any
  categoryStrengths: CategoryImpact; // Current team's category totals
  averagePlayerValue: number; // Average cost per player
  isMyTeam: boolean;
}

// Keep the old interface for backward compatibility
export interface TeamBudgetInfo {
  teamName: string;
  remainingBudget: number;
  playersOwned: number;
  slotsRemaining: number;
}

export interface DraftState {
  totalBudget: number;
  playersRemaining: Player[];
  playersDrafted: DraftedPlayer[];
  myRoster: MyRoster;
  currentNomination?: {
    player: Player;
    currentBid: number;
    nominatedBy: string;
  };
  draftPhase: 'early' | 'middle' | 'late';
  totalTeams: number;
  selectedStrategy: RosterStrategy;
  rosterAnalysis: RosterAnalysis;
  budgetAllocation: BudgetAllocation;
  otherTeamsBudgets?: TeamBudgetInfo[]; // Optional tracking of other teams (legacy)
  allTeams: TeamInfo[]; // Comprehensive team tracking including my team
  competitiveIntelligence?: CompetitiveIntelligence; // Advanced competition analysis
}

export interface BiddingRecommendation {
  shouldBid: boolean;
  maxBid: number;
  reasoning: string[];
  confidence: 'low' | 'medium' | 'high';
  categoryImpact: CategoryImpact;
  biddingTiming: BiddingTiming;
  strategyFit: number; // 0-1 score for how well player fits selected strategy
  biddingScore: number; // 0-100 granular ranking
  scoreBreakdown: {
    rosterFit: number; // 0-25 points
    remainingPlayersValue: number; // 0-20 points
    budgetSituation: number; // 0-20 points
    valueEfficiency: number; // 0-20 points
    puntStrategy: number; // 0-15 points
  };
  advancedCompetitionAnalysis?: AdvancedCompetitionAnalysis; // Enhanced competition intelligence
}

export interface NominationRecommendation {
  player: Player;
  strategy: 'target' | 'force_spend';
  reasoning: string[];
  priority: number;
}

export type RosterStrategy = 'stars_scrubs' | 'balanced' | 'punt_ft' | 'punt_fg' | 'punt_to' | 'punt_assists';

export type FantasyCategory = 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'fg_pct' | 'ft_pct' | 'threePointers' | 'turnovers';

export interface CategoryImpact {
  points: number; // z-score impact
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fg_pct: number;
  ft_pct: number;
  threePointers: number;
  turnovers: number; // negative is better
}

export interface RosterAnalysis {
  currentCategoryTotals: CategoryImpact;
  categoryNeeds: { [key in FantasyCategory]: 'strong' | 'weak' | 'neutral' };
  recommendedStrategy: RosterStrategy;
  positionalFlexibility: number; // 0-1 score
}

export interface BiddingTiming {
  shouldWaitForOthers: boolean;
  aggressivenessLevel: 'passive' | 'moderate' | 'aggressive';
  bluffRecommendation?: {
    shouldBluff: boolean;
    maxBluffBid: number;
    reasoning: string;
  };
}

export interface BudgetAllocation {
  earlyPhaseTarget: number; // $ to spend in early phase
  middlePhaseTarget: number;
  latePhaseTarget: number;
  starPlayerBudget: number; // $ reserved for tier 1-2 players
  reasoning: string[];
}

// Advanced Competition Analysis Types
export interface OpponentStrategy {
  teamName: string;
  detectedStrategy: RosterStrategy | 'unknown';
  confidence: number; // 0-1
  evidence: string[];
  categoryFocus: FantasyCategory[]; // Categories they're prioritizing
  positionFocus: Position[]; // Positions they're prioritizing
}

export interface BiddingPatterns {
  teamName: string;
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  bluffTendency: number; // 0-1, how often they bid without winning
  averageOverbid: number; // How much above projected value they typically pay
  positionPriorities: { [key in Position]: number }; // 0-1 priority score
  tierPreferences: { [tier: number]: number }; // Preference for each tier
  recentBehavior: {
    lastFiveBids: number[]; // Actual costs of last 5 players they won
    lastFiveOverbids: number[]; // Amount over projected value
    bluffCount: number; // Times they bid but didn't win in last 10 nominations
  };
}

export interface ThreatAssessment {
  player: Player;
  threateningTeams: {
    teamName: string;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    maxLikelyBid: number;
    bidProbability: number; // 0-1 chance they'll bid
    reasoning: string[];
    strategicFit: number; // 0-1 how well player fits their strategy
  }[];
  recommendedStrategy: 'bid_early' | 'wait_and_see' | 'force_overbid' | 'avoid' | 'bluff_opportunity';
  expectedFinalCost: number;
  competitionIntensity: number; // 0-1 overall competition level
}

export interface BudgetPressure {
  teamName: string;
  pressureLevel: 'desperate' | 'high' | 'moderate' | 'comfortable';
  mustFillPositions: Position[];
  slotsRemaining: number;
  averageBudgetPerSlot: number;
  likelyToOverbid: boolean;
  estimatedPanicPoint: number; // How many more picks until desperation
  desperation: {
    needsStarPlayer: boolean;
    runningOutOfTime: boolean;
    budgetConstraints: boolean;
  };
}

export interface CompetitiveIntelligence {
  opponentStrategies: OpponentStrategy[];
  biddingPatterns: BiddingPatterns[];
  budgetPressures: BudgetPressure[];
  marketTrends: {
    averageOverbid: number;
    inflationRate: number; // How much above projected values players are going
    positionInflation: { [key in Position]: number };
    tierInflation: { [tier: number]: number };
  };
}

export interface AdvancedCompetitionAnalysis {
  threatAssessment: ThreatAssessment;
  competitiveIntelligence: CompetitiveIntelligence;
  strategicRecommendations: {
    nominationTiming: 'now' | 'wait' | 'never';
    biddingApproach: 'aggressive' | 'patient' | 'bluff' | 'avoid';
    maxRecommendedBid: number;
    confidenceLevel: number; // 0-1
  };
}
