'use client';

import { useState, useEffect } from 'react';
import {
  Player,
  DraftedPlayer,
  DraftState,
  BiddingRecommendation,
  NominationRecommendation,
  RosterStrategy
} from '../types';
import { samplePlayers } from '../data/players';
import {
  initializeRoster,
  getBiddingRecommendation,
  getNominationRecommendations,
  canFillSlot,
  getRosterNeeds,
  getDraftPhase,
  generateRosterAnalysis,
  calculateBudgetAllocation,
  initializeAllTeams,
  updateTeamAfterDraft,
  undoTeamDraft,
  analyzeCompetitiveInterest,
  detectOpponentStrategy,
  analyzeBiddingPatterns,
  analyzeBudgetPressure
} from '../utils/draftLogic';

export default function Home() {
  const initialRoster = initializeRoster();
  const initialStrategy: RosterStrategy = 'balanced';

  // Initialize all teams for comprehensive tracking
  const teamNames = ['Eyal', 'Ben', 'Shtemler', 'Shtark', 'Topaz', 'Yoav', 'Hertz', 'Lior', 'Shachar', 'Shay'];
  const initialTeams = initializeAllTeams(teamNames, 200);

  const [draftState, setDraftState] = useState<DraftState>({
    totalBudget: 200,
    playersRemaining: samplePlayers,
    playersDrafted: [],
    myRoster: initialRoster,
    draftPhase: 'early',
    totalTeams: 10,
    selectedStrategy: initialStrategy,
    rosterAnalysis: generateRosterAnalysis(initialRoster, initialStrategy),
    budgetAllocation: calculateBudgetAllocation({
      totalBudget: 200,
      playersRemaining: samplePlayers,
      playersDrafted: [],
      myRoster: initialRoster,
      draftPhase: 'early',
      totalTeams: 10,
      selectedStrategy: initialStrategy,
      rosterAnalysis: generateRosterAnalysis(initialRoster, initialStrategy),
      budgetAllocation: { earlyPhaseTarget: 80, middlePhaseTarget: 80, latePhaseTarget: 40, starPlayerBudget: 100, reasoning: [] },
      allTeams: initialTeams
    }),
    allTeams: initialTeams
  });

  const [currentNomination, setCurrentNomination] = useState<{
    player: Player;
    currentBid: number;
    nominatedBy: string;
  } | null>(null);

  const [biddingRec, setBiddingRec] = useState<BiddingRecommendation | null>(null);
  const [nominationRecs, setNominationRecs] = useState<NominationRecommendation[]>([]);
  const [showNominationForm, setShowNominationForm] = useState(false);
  const [showDraftPlayerForm, setShowDraftPlayerForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerForNomination, setSelectedPlayerForNomination] = useState<Player | null>(null);

  // Update recommendations when nomination changes
  useEffect(() => {
    if (currentNomination) {
      const rec = getBiddingRecommendation(
        currentNomination.player,
        currentNomination.currentBid,
        draftState
      );
      setBiddingRec(rec);
    } else {
      setBiddingRec(null);
    }
  }, [currentNomination, draftState]);

  // Update nomination recommendations
  useEffect(() => {
    const recs = getNominationRecommendations(draftState, 12);
    setNominationRecs(recs);
  }, [draftState]);

  // Update draft phase and analysis
  useEffect(() => {
    const phase = getDraftPhase(draftState.playersDrafted, draftState.totalTeams * 13);
    const rosterAnalysis = generateRosterAnalysis(draftState.myRoster, draftState.selectedStrategy);
    const budgetAllocation = calculateBudgetAllocation({ ...draftState, draftPhase: phase, rosterAnalysis });

    setDraftState(prev => ({
      ...prev,
      draftPhase: phase,
      rosterAnalysis,
      budgetAllocation
    }));
  }, [draftState.playersDrafted, draftState.myRoster, draftState.selectedStrategy, draftState.totalTeams]);

  const handleStrategyChange = (newStrategy: RosterStrategy) => {
    const rosterAnalysis = generateRosterAnalysis(draftState.myRoster, newStrategy);
    const budgetAllocation = calculateBudgetAllocation({ ...draftState, selectedStrategy: newStrategy, rosterAnalysis });

    setDraftState(prev => ({
      ...prev,
      selectedStrategy: newStrategy,
      rosterAnalysis,
      budgetAllocation
    }));
  };

  const handleNominatePlayer = (playerId: string, currentBid: number, nominatedBy: string) => {
    const player = draftState.playersRemaining.find(p => p.id === playerId);
    if (player) {
      setCurrentNomination({
        player,
        currentBid,
        nominatedBy
      });
      setShowNominationForm(false);
    }
  };

  const handleDraftPlayer = (playerId: string, finalCost: number, draftedBy: string) => {
    const player = draftState.playersRemaining.find(p => p.id === playerId);
    if (!player) return;

    const draftedPlayer: DraftedPlayer = {
      ...player,
      draftedBy,
      actualCost: finalCost,
      draftOrder: draftState.playersDrafted.length + 1
    };

    // Update team tracking
    const updatedTeams = draftState.allTeams.map(team => {
      if (team.teamName === draftedBy) {
        return updateTeamAfterDraft(team, draftedPlayer);
      }
      return team;
    });

    // If I drafted the player, add to my roster
    if (draftedBy === 'Eyal') {
      const updatedRoster = { ...draftState.myRoster };

      // Find best slot for the player
      const availableSlots = updatedRoster.slots.filter(slot => !slot.player);
      const bestSlot = availableSlots.find(slot => canFillSlot(draftedPlayer, slot));

      if (bestSlot) {
        bestSlot.player = draftedPlayer;
        updatedRoster.totalSpent += finalCost;
        updatedRoster.remainingBudget -= finalCost;
      }

      setDraftState(prev => ({
        ...prev,
        playersRemaining: prev.playersRemaining.filter(p => p.id !== playerId),
        playersDrafted: [...prev.playersDrafted, draftedPlayer],
        myRoster: updatedRoster,
        allTeams: updatedTeams
      }));
    } else {
      setDraftState(prev => ({
        ...prev,
        playersRemaining: prev.playersRemaining.filter(p => p.id !== playerId),
        playersDrafted: [...prev.playersDrafted, draftedPlayer],
        allTeams: updatedTeams
      }));
    }

    setCurrentNomination(null);
    setShowDraftPlayerForm(false);
  };

  const handleUndoLastPick = () => {
    if (draftState.playersDrafted.length === 0) return;

    // Get the last drafted player
    const lastDraftedPlayer = draftState.playersDrafted[draftState.playersDrafted.length - 1];

    // Convert back to regular player (remove draft-specific fields)
    const { draftedBy, actualCost, ...originalPlayer } = lastDraftedPlayer;

    // Update team tracking - undo the draft for the team
    const updatedTeams = draftState.allTeams.map(team => {
      if (team.teamName === draftedBy) {
        return undoTeamDraft(team, lastDraftedPlayer);
      }
      return team;
    });

    // If it was my pick, remove from roster and restore budget
    if (draftedBy === 'Eyal') {
      const updatedRoster = { ...draftState.myRoster };

      // Find the slot with this player and clear it
      const playerSlot = updatedRoster.slots.find(slot =>
        slot.player && slot.player.id === lastDraftedPlayer.id
      );

      if (playerSlot) {
        playerSlot.player = undefined;
        updatedRoster.totalSpent -= actualCost;
        updatedRoster.remainingBudget += actualCost;
      }

      setDraftState(prev => ({
        ...prev,
        playersRemaining: [...prev.playersRemaining, originalPlayer].sort((a, b) =>
          b.projectedValue - a.projectedValue
        ),
        playersDrafted: prev.playersDrafted.slice(0, -1),
        myRoster: updatedRoster,
        allTeams: updatedTeams
      }));
    } else {
      // Just remove from drafted players and add back to available
      setDraftState(prev => ({
        ...prev,
        playersRemaining: [...prev.playersRemaining, originalPlayer].sort((a, b) =>
          b.projectedValue - a.projectedValue
        ),
        playersDrafted: prev.playersDrafted.slice(0, -1),
        allTeams: updatedTeams
      }));
    }
  };

  // Filter players based on search query
  const filteredPlayers = draftState.playersRemaining.filter(player => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      player.name.toLowerCase().includes(query) ||
      player.team.toLowerCase().includes(query) ||
      player.positions.some(pos => pos.toLowerCase().includes(query))
    );
  });

  const rosterNeeds = getRosterNeeds(draftState.myRoster);
  const filledSlots = draftState.myRoster.slots.filter(slot => slot.player).length;
  const emptySlots = draftState.myRoster.slots.length - filledSlots;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            NBA Fantasy Auction Draft Assistant
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            <span>Budget: ${draftState.myRoster.remainingBudget}</span>
            <span>Spent: ${draftState.myRoster.totalSpent}</span>
            <span>Roster: {filledSlots}/13</span>
            <span>Phase: {draftState.draftPhase}</span>
          </div>

          {/* Strategy Selection */}
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="font-medium text-gray-700">Draft Strategy:</label>
              <select
                value={draftState.selectedStrategy}
                onChange={(e) => handleStrategyChange(e.target.value as RosterStrategy)}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="balanced">Balanced Build</option>
                <option value="stars_scrubs">Stars & Scrubs</option>
                <option value="punt_ft">Punt FT%</option>
                <option value="punt_fg">Punt FG%</option>
                <option value="punt_to">Punt Turnovers</option>
                <option value="punt_assists">Punt Assists</option>
              </select>

              {/* Budget Allocation Display */}
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Early: ${draftState.budgetAllocation.earlyPhaseTarget}</span>
                <span>Mid: ${draftState.budgetAllocation.middlePhaseTarget}</span>
                <span>Late: ${draftState.budgetAllocation.latePhaseTarget}</span>
                <span>Stars: ${draftState.budgetAllocation.starPlayerBudget}</span>
              </div>

              {/* Undo Button */}
              {draftState.playersDrafted.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm(
                      `Undo last pick: ${draftState.playersDrafted[draftState.playersDrafted.length - 1].name} drafted by ${draftState.playersDrafted[draftState.playersDrafted.length - 1].draftedBy} for $${draftState.playersDrafted[draftState.playersDrafted.length - 1].actualCost}?`
                    )) {
                      handleUndoLastPick();
                    }
                  }}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 flex items-center gap-1"
                  title="Undo last draft pick"
                >
                  ↶ Undo Last Pick
                </button>
              )}
            </div>

            {/* Category Needs */}
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(draftState.rosterAnalysis.categoryNeeds).map(([category, strength]) => (
                <span
                  key={category}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    strength === 'strong' ? 'bg-green-100 text-green-800' :
                    strength === 'weak' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  {category.replace('_', ' ')}: {strength}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Nomination & Bidding */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Nomination */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Current Nomination</h2>
                <button
                  onClick={() => setShowNominationForm(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Nominate Player
                </button>
              </div>

              {currentNomination ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">{currentNomination.player.name}</h3>
                      <p className="text-gray-600">
                        {currentNomination.player.team} - {currentNomination.player.positions.join('/')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Projected Value: ${currentNomination.player.projectedValue}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${currentNomination.currentBid}</p>
                      <p className="text-sm text-gray-500">Current Bid</p>
                    </div>
                  </div>

                  {/* Advanced Competition Analysis */}
                  {biddingRec?.advancedCompetitionAnalysis && (
                    (() => {
                      const analysis = biddingRec.advancedCompetitionAnalysis;
                      const threatAssessment = analysis.threatAssessment;
                      const highThreats = threatAssessment.threateningTeams.filter(t =>
                        t.threatLevel === 'critical' || t.threatLevel === 'high'
                      );
                      const mediumThreats = threatAssessment.threateningTeams.filter(t =>
                        t.threatLevel === 'medium'
                      );

                      return (
                        <div className="bg-gray-50 p-4 rounded border space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">🎯 Advanced Competition Analysis</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                threatAssessment.competitionIntensity > 0.7 ? 'bg-red-100 text-red-800' :
                                threatAssessment.competitionIntensity > 0.4 ? 'bg-orange-100 text-orange-800' :
                                threatAssessment.competitionIntensity > 0.2 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {threatAssessment.competitionIntensity > 0.7 ? '🔥 Intense' :
                                 threatAssessment.competitionIntensity > 0.4 ? '⚠️ High' :
                                 threatAssessment.competitionIntensity > 0.2 ? '⚡ Moderate' :
                                 '🎯 Low'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Strategy: {threatAssessment.recommendedStrategy.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Key Metrics */}
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div className="text-center">
                              <span className="block text-lg font-bold text-gray-900">
                                ${threatAssessment.expectedFinalCost}
                              </span>
                              <span className="text-gray-600">Expected Cost</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-lg font-bold text-gray-900">
                                {highThreats.length + mediumThreats.length}
                              </span>
                              <span className="text-gray-600">Active Bidders</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-lg font-bold text-gray-900">
                                {Math.round(analysis.strategicRecommendations.confidenceLevel * 100)}%
                              </span>
                              <span className="text-gray-600">Confidence</span>
                            </div>
                          </div>

                          {/* Threat Assessment */}
                          {(highThreats.length > 0 || mediumThreats.length > 0) && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-medium text-gray-700">🚨 Team Threats</h4>

                              {/* High Threats */}
                              {highThreats.slice(0, 3).map((threat) => (
                                <div key={threat.teamName} className="flex justify-between items-center p-2 bg-white rounded border-l-4 border-red-400">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${
                                      threat.threatLevel === 'critical' ? 'bg-red-600' : 'bg-orange-500'
                                    }`}></span>
                                    <span className="font-medium text-sm">{threat.teamName}</span>
                                    <span className="text-xs text-gray-500">
                                      ({Math.round(threat.bidProbability * 100)}% likely)
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium">${threat.maxLikelyBid}</div>
                                    <div className="text-xs text-gray-500">max bid</div>
                                  </div>
                                </div>
                              ))}

                              {/* Medium Threats (collapsed) */}
                              {mediumThreats.length > 0 && (
                                <div className="text-xs text-gray-600">
                                  + {mediumThreats.length} other teams with moderate interest
                                </div>
                              )}
                            </div>
                          )}

                          {/* Strategic Recommendation */}
                          <div className={`p-2 rounded text-xs ${
                            analysis.strategicRecommendations.biddingApproach === 'aggressive' ? 'bg-red-50 text-red-700' :
                            analysis.strategicRecommendations.biddingApproach === 'avoid' ? 'bg-gray-50 text-gray-700' :
                            analysis.strategicRecommendations.biddingApproach === 'bluff' ? 'bg-orange-50 text-orange-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            <span className="font-medium">
                              {analysis.strategicRecommendations.biddingApproach === 'aggressive' ? '⚡ Bid Aggressively' :
                               analysis.strategicRecommendations.biddingApproach === 'avoid' ? '🚫 Avoid This Player' :
                               analysis.strategicRecommendations.biddingApproach === 'bluff' ? '🎭 Bluff Opportunity' :
                               '⏳ Patient Bidding'}
                            </span>
                            {analysis.strategicRecommendations.biddingApproach !== 'avoid' && (
                              <span className="ml-2">
                                - Max recommended: ${analysis.strategicRecommendations.maxRecommendedBid}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {biddingRec && (
                    <div className={`p-4 rounded-lg ${
                      biddingRec.shouldBid
                        ? biddingRec.confidence === 'high'
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-yellow-50 border border-yellow-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">
                          {biddingRec.shouldBid ? '✅ Recommended' : '❌ Not Recommended'}
                        </h4>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            biddingRec.confidence === 'high'
                              ? 'bg-green-100 text-green-800'
                              : biddingRec.confidence === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {biddingRec.confidence} confidence
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            biddingRec.strategyFit > 0.7 ? 'bg-blue-100 text-blue-800' :
                            biddingRec.strategyFit < 0.4 ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {Math.round(biddingRec.strategyFit * 100)}% strategy fit
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        {biddingRec.shouldBid && (
                          <div>
                            <p className="font-medium text-lg">Max Bid: ${biddingRec.maxBid}</p>
                            <p className="text-sm text-gray-600">
                              Timing: {biddingRec.biddingTiming.aggressivenessLevel}
                            </p>
                          </div>
                        )}

                        {/* Category Impact Preview */}
                        <div>
                          <p className="text-sm font-medium mb-1">Category Impact:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(biddingRec.categoryImpact).slice(0, 4).map(([cat, impact]) => (
                              <span key={cat} className={`px-1 py-0.5 rounded text-xs ${
                                impact > 1 ? 'bg-green-100 text-green-700' :
                                impact > 0.5 ? 'bg-blue-100 text-blue-700' :
                                impact < -0.5 ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {cat}: {impact > 0 ? '+' : ''}{impact.toFixed(1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <ul className="text-sm space-y-1">
                        {biddingRec.reasoning.map((reason, index) => (
                          <li key={index}>• {reason}</li>
                        ))}
                      </ul>

                      {/* Bluff Recommendation */}
                      {biddingRec.biddingTiming.bluffRecommendation?.shouldBluff && (
                        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded">
                          <p className="text-sm font-medium text-orange-800">
                            💡 Bluff Opportunity: Bid up to ${biddingRec.biddingTiming.bluffRecommendation.maxBluffBid}
                          </p>
                          <p className="text-xs text-orange-700">
                            {biddingRec.biddingTiming.bluffRecommendation.reasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setShowDraftPlayerForm(true)}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Complete Draft
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No player currently nominated
                </p>
              )}
            </div>

            {/* Player Search & Nomination Recommendations */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Player Search & Recommendations</h2>
              </div>

              {/* Quick Search */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Quick search: player name, team, or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {searchQuery.trim() && (
                  <div className="mt-2 text-sm text-gray-600">
                    Found {filteredPlayers.length} players matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>

              {/* Search Results or Nomination Recommendations */}
              {searchQuery.trim() ? (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Search Results</h3>
                  {filteredPlayers.slice(0, 5).map(player => {
                    const competitiveAnalysis = draftState.allTeams ?
                      analyzeCompetitiveInterest(player, draftState.allTeams) :
                      { interestedTeams: 0, avgBudgetPerSlot: 0, maxCompetitorBudget: 0 };

                    return (
                      <div key={player.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{player.name}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                player.tier === 1 ? 'bg-purple-100 text-purple-800' :
                                player.tier === 2 ? 'bg-blue-100 text-blue-800' :
                                player.tier === 3 ? 'bg-green-100 text-green-800' :
                                player.tier === 4 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                Tier {player.tier}
                              </span>
                              {/* Competition Indicator */}
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                competitiveAnalysis.interestedTeams === 0 ? 'bg-green-100 text-green-700' :
                                competitiveAnalysis.interestedTeams <= 2 ? 'bg-yellow-100 text-yellow-700' :
                                competitiveAnalysis.interestedTeams <= 4 ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`} title={`${competitiveAnalysis.interestedTeams} teams interested`}>
                                {competitiveAnalysis.interestedTeams === 0 ? '🎯' :
                                 competitiveAnalysis.interestedTeams <= 2 ? '⚡' :
                                 competitiveAnalysis.interestedTeams <= 4 ? '⚠️' : '🔥'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {player.team} - {player.positions.join('/')} - ${player.projectedValue}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {player.stats.points.toFixed(1)} PTS, {player.stats.rebounds.toFixed(1)} REB, {player.stats.assists.toFixed(1)} AST
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedPlayerForNomination(player);
                            }}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 ml-3"
                          >
                            Nominate
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredPlayers.length > 5 && (
                    <button
                      onClick={() => setShowNominationForm(true)}
                      className="w-full text-blue-500 hover:text-blue-700 text-sm font-medium py-2"
                    >
                      View all {filteredPlayers.length} results →
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-900">Nomination Recommendations</h3>
                    <span className="text-sm text-gray-500">{nominationRecs.length} suggestions</span>
                  </div>
                  <div className="relative">
                    <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {nominationRecs.map((rec) => {
                    const competitiveAnalysis = draftState.allTeams ?
                      analyzeCompetitiveInterest(rec.player, draftState.allTeams) :
                      { interestedTeams: 0, avgBudgetPerSlot: 0, maxCompetitorBudget: 0 };

                    return (
                      <div key={rec.player.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm truncate">{rec.player.name}</h4>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                rec.player.tier === 1 ? 'bg-purple-100 text-purple-800' :
                                rec.player.tier === 2 ? 'bg-blue-100 text-blue-800' :
                                rec.player.tier === 3 ? 'bg-green-100 text-green-800' :
                                rec.player.tier === 4 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                T{rec.player.tier}
                              </span>
                              {/* Competition Indicator */}
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                competitiveAnalysis.interestedTeams === 0 ? 'bg-green-100 text-green-700' :
                                competitiveAnalysis.interestedTeams <= 2 ? 'bg-yellow-100 text-yellow-700' :
                                competitiveAnalysis.interestedTeams <= 4 ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`} title={`${competitiveAnalysis.interestedTeams} teams interested`}>
                                {competitiveAnalysis.interestedTeams === 0 ? '🎯' :
                                 competitiveAnalysis.interestedTeams <= 2 ? '⚡' :
                                 competitiveAnalysis.interestedTeams <= 4 ? '⚠️' : '🔥'}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                rec.strategy === 'target'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {rec.strategy === 'target' ? 'Target' : 'Force'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">
                              {rec.player.team} - {rec.player.positions.join('/')} - ${rec.player.projectedValue}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {rec.reasoning[0]} {rec.reasoning.length > 1 && `(+${rec.reasoning.length - 1} more)`}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedPlayerForNomination(rec.player)}
                            className="ml-3 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 flex-shrink-0"
                          >
                            Nominate
                          </button>
                        </div>
                      </div>
                    );
                  })}
                    </div>
                    {/* Scroll indicator gradient */}
                    {nominationRecs.length > 6 && (
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* My Roster */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">My Roster</h2>
              <div className="space-y-2">
                {draftState.myRoster.slots.map((slot, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium text-sm">{slot.position}</span>
                    {slot.player ? (
                      <div className="text-right">
                        <p className="text-sm font-medium">{slot.player.name}</p>
                        <p className="text-xs text-gray-500">${slot.player.actualCost}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Empty</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Total Spent:</span>
                  <span className="font-medium">${draftState.myRoster.totalSpent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining:</span>
                  <span className="font-medium">${draftState.myRoster.remainingBudget}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avg per slot:</span>
                  <span className="font-medium">
                    ${emptySlots > 0 ? Math.floor(draftState.myRoster.remainingBudget / emptySlots) : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Roster Needs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Roster Needs</h2>
              <div className="space-y-2">
                {Object.entries(rosterNeeds).map(([position, count]) => (
                  count > 0 && (
                    <div key={position} className="flex justify-between">
                      <span className="text-sm">{position === 'any' ? 'UTIL/BENCH' : position}:</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Other Teams Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">League Overview</h2>
              <div className="space-y-3">
                {draftState.allTeams
                  .sort((a, b) => {
                    // Sort by budget per slot (descending), then by total budget
                    const aBudgetPerSlot = a.slotsRemaining > 0 ? a.remainingBudget / a.slotsRemaining : 0;
                    const bBudgetPerSlot = b.slotsRemaining > 0 ? b.remainingBudget / b.slotsRemaining : 0;
                    if (aBudgetPerSlot !== bBudgetPerSlot) return bBudgetPerSlot - aBudgetPerSlot;
                    return b.remainingBudget - a.remainingBudget;
                  })
                  .map((team) => {
                    const budgetPerSlot = team.slotsRemaining > 0 ? Math.floor(team.remainingBudget / team.slotsRemaining) : 0;
                    const isMyTeam = team.isMyTeam;

                    // Get advanced analysis for opponent teams
                    const strategy = !isMyTeam ? detectOpponentStrategy(team, draftState.playersDrafted) : null;
                    const patterns = !isMyTeam ? analyzeBiddingPatterns(team, draftState.playersDrafted) : null;
                    const pressure = !isMyTeam ? analyzeBudgetPressure(team) : null;

                    return (
                      <div
                        key={team.teamName}
                        className={`p-3 rounded border ${
                          isMyTeam ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isMyTeam ? 'text-blue-700' : ''}`}>
                              {team.teamName} {isMyTeam && '(You)'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {team.playersOwned.length}/13 players
                            </span>

                            {/* Strategy indicator for opponents */}
                            {strategy && strategy.confidence > 0.3 && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                strategy.detectedStrategy === 'stars_scrubs' ? 'bg-purple-100 text-purple-700' :
                                strategy.detectedStrategy === 'punt_ft' ? 'bg-red-100 text-red-700' :
                                strategy.detectedStrategy === 'punt_fg' ? 'bg-orange-100 text-orange-700' :
                                strategy.detectedStrategy === 'balanced' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`} title={strategy.evidence.join(', ')}>
                                {strategy.detectedStrategy === 'stars_scrubs' ? '⭐💰' :
                                 strategy.detectedStrategy === 'punt_ft' ? '🚫FT' :
                                 strategy.detectedStrategy === 'punt_fg' ? '🚫FG' :
                                 strategy.detectedStrategy === 'punt_to' ? '🚫TO' :
                                 strategy.detectedStrategy === 'punt_assists' ? '🚫AST' :
                                 strategy.detectedStrategy === 'balanced' ? '⚖️' : '❓'}
                              </span>
                            )}

                            {/* Budget pressure indicator */}
                            {pressure && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                pressure.pressureLevel === 'desperate' ? 'bg-red-100 text-red-700' :
                                pressure.pressureLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                                pressure.pressureLevel === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`} title={`Budget pressure: ${pressure.pressureLevel}`}>
                                {pressure.pressureLevel === 'desperate' ? '🆘' :
                                 pressure.pressureLevel === 'high' ? '⚠️' :
                                 pressure.pressureLevel === 'moderate' ? '⚡' : '😌'}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">${team.remainingBudget}</div>
                            <div className="text-xs text-gray-500">
                              ${budgetPerSlot}/slot
                              {patterns && patterns.averageOverbid !== 0 && (
                                <span className={`ml-1 ${patterns.averageOverbid > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  ({patterns.averageOverbid > 0 ? '+' : ''}${patterns.averageOverbid.toFixed(0)})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {team.playersOwned.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            <div className="flex flex-wrap gap-1">
                              {team.playersOwned
                                .sort((a, b) => b.actualCost - a.actualCost)
                                .slice(0, 3)
                                .map((player) => (
                                <span key={player.id} className="bg-gray-100 px-1 rounded">
                                  {player.name} (${player.actualCost})
                                </span>
                              ))}
                              {team.playersOwned.length > 3 && (
                                <span className="text-gray-400">
                                  +{team.playersOwned.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Advanced insights for opponents */}
                        {!isMyTeam && strategy && strategy.confidence > 0.5 && (
                          <div className="mt-2 text-xs text-gray-500 italic">
                            💡 {strategy.evidence[0]}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* League Stats Summary */}
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Avg Budget:</span>
                    <span className="ml-1 font-medium">
                      ${Math.floor(draftState.allTeams.reduce((sum, team) => sum + team.remainingBudget, 0) / draftState.allTeams.length)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Players Left:</span>
                    <span className="ml-1 font-medium">
                      {draftState.playersRemaining.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Spent:</span>
                    <span className="ml-1 font-medium">
                      ${draftState.allTeams.reduce((sum, team) => sum + team.totalSpent, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg/Player:</span>
                    <span className="ml-1 font-medium">
                      ${draftState.playersDrafted.length > 0
                        ? Math.floor(draftState.allTeams.reduce((sum, team) => sum + team.totalSpent, 0) / draftState.playersDrafted.length)
                        : 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Draft History */}
          {draftState.playersDrafted.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Draft Picks</h2>
                <span className="text-sm text-gray-500">
                  {draftState.playersDrafted.length} players drafted
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {draftState.playersDrafted
                  .slice(-10) // Show last 10 picks
                  .reverse() // Most recent first
                  .map((player, index) => (
                  <div
                    key={`${player.id}-${player.draftOrder}`}
                    className={`flex justify-between items-center p-3 rounded border ${
                      index === 0 ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">#{player.draftOrder}</span>
                        <span className="font-medium">{player.name}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          player.tier === 1 ? 'bg-purple-100 text-purple-800' :
                          player.tier === 2 ? 'bg-blue-100 text-blue-800' :
                          player.tier === 3 ? 'bg-green-100 text-green-800' :
                          player.tier === 4 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          T{player.tier}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {player.team} - {player.positions.join('/')} - Projected: ${player.projectedValue}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${player.actualCost}</div>
                      <div className="text-sm text-gray-500">{player.draftedBy}</div>
                    </div>
                    {index === 0 && (
                      <button
                        onClick={() => {
                          if (window.confirm(
                            `Undo this pick: ${player.name} drafted by ${player.draftedBy} for $${player.actualCost}?`
                          )) {
                            handleUndoLastPick();
                          }
                        }}
                        className="ml-3 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        title="Undo this pick"
                      >
                        ↶ Undo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nomination Form Modal */}
        {showNominationForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Nominate Player</h3>

              {/* Search Input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search players by name, team, or position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Player List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredPlayers
                  .sort((a, b) => {
                    // If searching, sort by relevance (name matches first)
                    if (searchQuery.trim()) {
                      const aNameMatch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
                      const bNameMatch = b.name.toLowerCase().includes(searchQuery.toLowerCase());
                      if (aNameMatch && !bNameMatch) return -1;
                      if (!aNameMatch && bNameMatch) return 1;
                    }
                    // Default sort by projected value
                    return b.projectedValue - a.projectedValue;
                  })
                  .slice(0, searchQuery.trim() ? 50 : 20) // Show more results when searching
                  .map(player => (
                  <div key={player.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{player.name}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          player.tier === 1 ? 'bg-purple-100 text-purple-800' :
                          player.tier === 2 ? 'bg-blue-100 text-blue-800' :
                          player.tier === 3 ? 'bg-green-100 text-green-800' :
                          player.tier === 4 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          Tier {player.tier}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {player.team} - {player.positions.join('/')} - ${player.projectedValue}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {player.stats.points.toFixed(1)} PTS, {player.stats.rebounds.toFixed(1)} REB, {player.stats.assists.toFixed(1)} AST
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPlayerForNomination(player);
                      }}
                      className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 ml-4"
                    >
                      Nominate
                    </button>
                  </div>
                ))}

                {filteredPlayers.length === 0 && searchQuery.trim() && (
                  <div className="text-center py-8 text-gray-500">
                    No players found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Showing {Math.min(filteredPlayers.length, searchQuery.trim() ? 50 : 20)} of {filteredPlayers.length} players
                </div>
                <button
                  onClick={() => {
                    setShowNominationForm(false);
                    setSearchQuery(''); // Clear search when closing
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Draft Player Form Modal */}
        {showDraftPlayerForm && currentNomination && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Complete Draft</h3>
              <p className="mb-4">Player: {currentNomination.player.name}</p>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const finalCost = parseInt(formData.get('finalCost') as string);
                const draftedBy = formData.get('draftedBy') as string;
                handleDraftPlayer(currentNomination.player.id, finalCost, draftedBy);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Final Cost</label>
                    <input
                      type="number"
                      name="finalCost"
                      defaultValue={currentNomination.currentBid}
                      min="1"
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Drafted By</label>
                    <select name="draftedBy" className="w-full border rounded px-3 py-2" required>
                      <option value="Eyal">Eyal</option>
                      <option value="Ben">Ben</option>
                      <option value="Shtemler">Shtemler</option>
                      <option value="Shtark">Shtark</option>
                      <option value="Topaz">Topaz</option>
                      <option value="Yoav">Yoav</option>
                      <option value="Hertz">Hertz</option>
                      <option value="Lior">Lior</option>
                      <option value="Shachar">Shachar</option>
                      <option value="Shay">Shay</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Complete Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDraftPlayerForm(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Nomination Confirmation Modal */}
        {selectedPlayerForNomination && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Nominate Player</h3>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{selectedPlayerForNomination.name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedPlayerForNomination.tier === 1 ? 'bg-purple-100 text-purple-800' :
                    selectedPlayerForNomination.tier === 2 ? 'bg-blue-100 text-blue-800' :
                    selectedPlayerForNomination.tier === 3 ? 'bg-green-100 text-green-800' :
                    selectedPlayerForNomination.tier === 4 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    Tier {selectedPlayerForNomination.tier}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {selectedPlayerForNomination.team} - {selectedPlayerForNomination.positions.join('/')} - ${selectedPlayerForNomination.projectedValue}
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const nominatedBy = formData.get('nominatedBy') as string;
                const startingBid = parseInt(formData.get('startingBid') as string);

                handleNominatePlayer(selectedPlayerForNomination.id, startingBid, nominatedBy);
                setSelectedPlayerForNomination(null);
                setShowNominationForm(false);
                setSearchQuery('');
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nominated By</label>
                    <select name="nominatedBy" className="w-full border rounded px-3 py-2" required>
                      <option value="Eyal">Eyal</option>
                      <option value="Ben">Ben</option>
                      <option value="Shtemler">Shtemler</option>
                      <option value="Shtark">Shtark</option>
                      <option value="Topaz">Topaz</option>
                      <option value="Yoav">Yoav</option>
                      <option value="Hertz">Hertz</option>
                      <option value="Lior">Lior</option>
                      <option value="Shachar">Shachar</option>
                      <option value="Shay">Shay</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Starting Bid</label>
                    <input
                      type="number"
                      name="startingBid"
                      defaultValue="1"
                      min="1"
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Nominate
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerForNomination(null)}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
