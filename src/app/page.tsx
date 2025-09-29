'use client';

import React, { useState } from 'react';
import { Player } from '../types';
import { samplePlayers } from '../data/players';
import { useDraftState } from '../hooks/useDraftState';
import { TeamComparisonModal } from '../components/modals/TeamComparisonModal';
import { NominationModal } from '../components/modals/NominationModal';
import { BiddingSection } from '../components/sections/BiddingSection';
import { LeagueOverview } from '../components/sections/LeagueOverview';
import {
  detectOpponentStrategy,
  analyzeBiddingPatterns,
  analyzeBudgetPressure
} from '../utils/analysis/advancedCompetitionAnalysis';

export default function Home() {
  const {
    draftState,
    currentNomination,
    biddingRec,
    nominationRecs,
    teamNames,
    handleStrategyChange,
    handleDraftPlayer,
    handleUndoLastPick,
    handleNominatePlayer,
    handleResetDraft
  } = useDraftState();

  // Modal states
  const [showNominationForm, setShowNominationForm] = useState(false);
  const [showTeamComparisonModal, setShowTeamComparisonModal] = useState(false);
  const [comparisonTeam1, setComparisonTeam1] = useState<string>('');
  const [comparisonTeam2, setComparisonTeam2] = useState<string>('');

  // Search and selection states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayerForNomination, setSelectedPlayerForNomination] = useState<Player | null>(null);

  // Filter players based on search query
  const filteredPlayers = samplePlayers.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.positions.some(pos => pos.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openTeamComparison = () => {
    setComparisonTeam1('Eyal');
    setComparisonTeam2('');
    setShowTeamComparisonModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">NBA Draft Assistant</h1>
          {draftState.playersDrafted.length > 0 && (
            <p className="text-sm text-green-600 mt-2">
              ✓ Draft state restored from browser storage ({draftState.playersDrafted.length} picks)
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - My Roster & Strategy */}
          <div className="space-y-6">
            {/* Strategy Selection & Draft Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Draft Strategy</h2>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to reset the entire draft? This will clear all picks and cannot be undone.')) {
                      handleResetDraft();
                    }
                  }}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  title="Reset entire draft"
                >
                  Reset Draft
                </button>
              </div>
              <select
                value={draftState.selectedStrategy}
                onChange={(e) => handleStrategyChange(e.target.value as 'balanced' | 'stars_scrubs' | 'punt_ft' | 'punt_fg' | 'punt_to' | 'punt_assists')}
                className="w-full border rounded px-3 py-2"
              >
                <option value="balanced">Balanced</option>
                <option value="stars_scrubs">Stars & Scrubs</option>
                <option value="punt_ft">Punt FT%</option>
                <option value="punt_fg">Punt FG%</option>
                <option value="punt_to">Punt Turnovers</option>
                <option value="punt_assists">Punt Assists</option>
              </select>
            </div>

            {/* My Roster */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">My Roster</h2>
              <div className="space-y-2">
                {draftState.myRoster.slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex justify-between items-center p-2 border rounded">
                    <span className="font-medium">{slot.position}</span>
                    {slot.player ? (
                      <div className="text-right">
                        <div className="font-medium">{slot.player.name}</div>
                        <div className="text-sm text-gray-600">${slot.player.actualCost}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Empty</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between">
                  <span>Budget Remaining:</span>
                  <span className="font-semibold">${draftState.myRoster.remainingBudget}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Spent:</span>
                  <span className="font-semibold">${draftState.myRoster.totalSpent}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Current Nomination & Recommendations */}
          <div className="space-y-6">
            {/* Current Nomination */}
            <BiddingSection
              currentNomination={currentNomination}
              biddingRec={biddingRec}
              onDraftPlayer={handleDraftPlayer}
              teamNames={teamNames}
            />

            {/* Nomination Recommendations */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Nomination Targets</h2>
                <button
                  onClick={() => setShowNominationForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Nominate Player
                </button>
              </div>

              <div className="space-y-3">
                {nominationRecs.slice(0, 8).map((rec) => (
                  <div
                    key={rec.player.id}
                    className="border rounded-lg p-3 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-all duration-200"
                    onClick={() => {
                      setSelectedPlayerForNomination(rec.player);
                      setShowNominationForm(true);
                    }}
                    title="Click to nominate this player"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rec.player.name}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            rec.player.tier === 1 ? 'bg-purple-100 text-purple-800' :
                            rec.player.tier === 2 ? 'bg-blue-100 text-blue-800' :
                            rec.player.tier === 3 ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            Tier {rec.player.tier}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {rec.player.team} - {rec.player.positions.join('/')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${rec.player.projectedValue}</div>
                        <div className="text-xs text-gray-500">{rec.strategy}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - League Overview */}
          <div className="space-y-6">
            <LeagueOverview
              draftState={draftState}
              onOpenTeamComparison={openTeamComparison}
              onUndoLastPick={handleUndoLastPick}
              detectOpponentStrategy={detectOpponentStrategy}
              analyzeBiddingPatterns={analyzeBiddingPatterns}
              analyzeBudgetPressure={analyzeBudgetPressure}
            />

            {/* Recent Picks */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Picks</h2>
              <div className="space-y-2">
                {draftState.playersDrafted
                  .slice(-10)
                  .reverse()
                  .map((player) => (
                    <div key={player.id} className="flex justify-between items-center p-2 border rounded text-sm">
                      <div>
                        <span className="font-medium">{player.name}</span>
                        <span className="text-gray-600 ml-2">to {player.draftedBy}</span>
                      </div>
                      <span className="font-semibold">${player.actualCost}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <TeamComparisonModal
          isOpen={showTeamComparisonModal}
          onClose={() => setShowTeamComparisonModal(false)}
          draftState={draftState}
          teamNames={teamNames}
          comparisonTeam1={comparisonTeam1}
          comparisonTeam2={comparisonTeam2}
          setComparisonTeam1={setComparisonTeam1}
          setComparisonTeam2={setComparisonTeam2}
        />

        <NominationModal
          isOpen={showNominationForm}
          onClose={() => {
            setShowNominationForm(false);
            setSelectedPlayerForNomination(null);
            setSearchQuery('');
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredPlayers={filteredPlayers}
          selectedPlayerForNomination={selectedPlayerForNomination}
          setSelectedPlayerForNomination={setSelectedPlayerForNomination}
          onNominatePlayer={handleNominatePlayer}
          teamNames={teamNames}
        />
      </div>
    </div>
  );
}
