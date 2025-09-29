import React from 'react';
import { DraftState, TeamInfo, OpponentStrategy, BiddingPatterns, BudgetPressure } from '../../types';

interface LeagueOverviewProps {
  draftState: DraftState;
  onOpenTeamComparison: () => void;
  onUndoLastPick: () => void;
  detectOpponentStrategy: (team: TeamInfo) => OpponentStrategy;
  analyzeBiddingPatterns: (team: TeamInfo) => BiddingPatterns;
  analyzeBudgetPressure: (team: TeamInfo) => BudgetPressure;
}

export const LeagueOverview: React.FC<LeagueOverviewProps> = ({
  draftState,
  onOpenTeamComparison,
  onUndoLastPick,
  detectOpponentStrategy,
  analyzeBiddingPatterns,
  analyzeBudgetPressure
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">League Overview</h2>
        <button
          onClick={onOpenTeamComparison}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Compare Teams
        </button>
      </div>

      <div className="space-y-3">
        {draftState.allTeams
          .sort((a, b) => {
            // Sort by budget per slot (descending), then by total budget
            const aBudgetPerSlot = a.slotsRemaining > 0 ? a.remainingBudget / a.slotsRemaining : 0;
            const bBudgetPerSlot = b.slotsRemaining > 0 ? b.remainingBudget / b.slotsRemaining : 0;
            if (Math.abs(aBudgetPerSlot - bBudgetPerSlot) > 1) {
              return bBudgetPerSlot - aBudgetPerSlot;
            }
            return b.remainingBudget - a.remainingBudget;
          })
          .map((team) => {
            const isMyTeam = team.isMyTeam;
            const budgetPerSlot = team.slotsRemaining > 0 ? team.remainingBudget / team.slotsRemaining : 0;

            // Get advanced analysis for opponent teams
            const strategy = !isMyTeam ? detectOpponentStrategy(team) : null;
            const patterns = !isMyTeam ? analyzeBiddingPatterns(team) : null;
            const pressure = !isMyTeam ? analyzeBudgetPressure(team) : null;

            return (
              <div
                key={team.teamName}
                className={`p-3 rounded-lg border ${
                  isMyTeam ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium ${isMyTeam ? 'text-blue-800' : 'text-gray-800'}`}>
                        {team.teamName} {isMyTeam && '(You)'}
                      </span>
                      {!isMyTeam && strategy && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          {strategy.detectedStrategy.replace('_', ' ')}
                        </span>
                      )}
                      {!isMyTeam && pressure && pressure.pressureLevel !== 'comfortable' && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          pressure.pressureLevel === 'desperate' ? 'bg-red-100 text-red-700' :
                          pressure.pressureLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {pressure.pressureLevel} pressure
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                      <div>
                        <span className="block font-medium">${team.remainingBudget}</span>
                        <span>Remaining</span>
                      </div>
                      <div>
                        <span className="block font-medium">{team.playersOwned.length}</span>
                        <span>Players</span>
                      </div>
                      <div>
                        <span className="block font-medium">${budgetPerSlot.toFixed(0)}</span>
                        <span>Per Slot</span>
                      </div>
                    </div>

                    {!isMyTeam && patterns && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="capitalize">{patterns.aggressiveness}</span> bidder
                        {patterns.averageOverbid > 0 && (
                          <span> • Avg overbid: ${patterns.averageOverbid.toFixed(0)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* League Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="font-medium text-gray-700 mb-3">League Statistics</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Players Drafted:</span>
            <span className="ml-1 font-medium">{draftState.playersDrafted.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Avg Budget:</span>
            <span className="ml-1 font-medium">
              ${Math.floor(draftState.allTeams.reduce((sum, team) => sum + team.remainingBudget, 0) / draftState.allTeams.length)}
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

      {/* Undo Button */}
      {draftState.playersDrafted.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onUndoLastPick}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
          >
            Undo Last Pick ({draftState.playersDrafted[draftState.playersDrafted.length - 1]?.name})
          </button>
        </div>
      )}
    </div>
  );
};
