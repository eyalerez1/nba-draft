import React from 'react';
import { DraftState } from '../../types';

interface TeamComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftState: DraftState;
  teamNames: string[];
  comparisonTeam1: string;
  comparisonTeam2: string;
  setComparisonTeam1: (team: string) => void;
  setComparisonTeam2: (team: string) => void;
}

export const TeamComparisonModal: React.FC<TeamComparisonModalProps> = ({
  isOpen,
  onClose,
  draftState,
  teamNames,
  comparisonTeam1,
  comparisonTeam2,
  setComparisonTeam1,
  setComparisonTeam2
}) => {
  // Team comparison utility function
  const getTeamActualStats = (teamName: string) => {
    const team = draftState.allTeams.find(t => t.teamName === teamName);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold">Team Comparison</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Team Selection */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Team 1</label>
            <select
              value={comparisonTeam1}
              onChange={(e) => setComparisonTeam1(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Team</option>
              {teamNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Team 2</label>
            <select
              value={comparisonTeam2}
              onChange={(e) => setComparisonTeam2(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Team</option>
              {teamNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Results */}
        {comparisonTeam1 && comparisonTeam2 && comparisonTeam1 !== comparisonTeam2 && (
          <div className="flex-1 overflow-y-auto">
            {(() => {
              const team1 = draftState.allTeams.find(t => t.teamName === comparisonTeam1);
              const team2 = draftState.allTeams.find(t => t.teamName === comparisonTeam2);
              const team1Stats = getTeamActualStats(comparisonTeam1);
              const team2Stats = getTeamActualStats(comparisonTeam2);

              const categories = [
                { key: 'points', label: 'Points', format: (val: number) => val.toFixed(1) },
                { key: 'rebounds', label: 'Rebounds', format: (val: number) => val.toFixed(1) },
                { key: 'assists', label: 'Assists', format: (val: number) => val.toFixed(1) },
                { key: 'steals', label: 'Steals', format: (val: number) => val.toFixed(1) },
                { key: 'blocks', label: 'Blocks', format: (val: number) => val.toFixed(1) },
                { key: 'fg_pct', label: 'FG%', format: (val: number) => (val * 100).toFixed(1) + '%' },
                { key: 'ft_pct', label: 'FT%', format: (val: number) => (val * 100).toFixed(1) + '%' },
                { key: 'threePointers', label: '3PM', format: (val: number) => val.toFixed(1) },
                { key: 'turnovers', label: 'Turnovers', format: (val: number) => val.toFixed(1), lowerIsBetter: true }
              ];

              return (
                <div className="space-y-6">
                  {/* Team Info Header */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <h4 className="text-xl font-bold text-blue-800">{comparisonTeam1}</h4>
                      <div className="text-sm text-blue-600 mt-2">
                        <div>{team1?.playersOwned.length || 0} players</div>
                        <div>${team1?.remainingBudget || 0} remaining</div>
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <h4 className="text-xl font-bold text-green-800">{comparisonTeam2}</h4>
                      <div className="text-sm text-green-600 mt-2">
                        <div>{team2?.playersOwned.length || 0} players</div>
                        <div>${team2?.remainingBudget || 0} remaining</div>
                      </div>
                    </div>
                  </div>

                  {/* Category Comparison */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">Actual Statistical Totals Comparison</h4>
                    {categories.map(category => {
                      const team1Val = team1Stats[category.key as keyof typeof team1Stats];
                      const team2Val = team2Stats[category.key as keyof typeof team2Stats];
                      const team1Better = category.lowerIsBetter ? team1Val < team2Val : team1Val > team2Val;
                      const team2Better = category.lowerIsBetter ? team2Val < team1Val : team2Val > team1Val;

                      return (
                        <div key={category.key} className="grid grid-cols-3 gap-4 items-center p-3 bg-gray-50 rounded-lg">
                          <div className={`text-center p-2 rounded ${team1Better ? 'bg-blue-100 text-blue-800 font-semibold' : 'bg-white'}`}>
                            {category.format(team1Val)}
                          </div>
                          <div className="text-center font-medium text-gray-700">
                            {category.label}
                          </div>
                          <div className={`text-center p-2 rounded ${team2Better ? 'bg-green-100 text-green-800 font-semibold' : 'bg-white'}`}>
                            {category.format(team2Val)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-6 mt-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-semibold text-blue-800 mb-2">{comparisonTeam1} Advantages</h5>
                      <div className="text-sm text-blue-700 space-y-1">
                        {categories.filter(cat => {
                          const team1Val = team1Stats[cat.key as keyof typeof team1Stats];
                          const team2Val = team2Stats[cat.key as keyof typeof team2Stats];
                          return cat.lowerIsBetter ? team1Val < team2Val : team1Val > team2Val;
                        }).map(cat => (
                          <div key={cat.key}>• Better {cat.label}</div>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h5 className="font-semibold text-green-800 mb-2">{comparisonTeam2} Advantages</h5>
                      <div className="text-sm text-green-700 space-y-1">
                        {categories.filter(cat => {
                          const team1Val = team1Stats[cat.key as keyof typeof team1Stats];
                          const team2Val = team2Stats[cat.key as keyof typeof team2Stats];
                          return cat.lowerIsBetter ? team2Val < team1Val : team2Val > team1Val;
                        }).map(cat => (
                          <div key={cat.key}>• Better {cat.label}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Instructions */}
        {(!comparisonTeam1 || !comparisonTeam2 || comparisonTeam1 === comparisonTeam2) && (
          <div className="text-center text-gray-500 py-8">
            {!comparisonTeam1 || !comparisonTeam2
              ? "Select two teams to compare their actual statistical totals across all nine categories."
              : "Please select two different teams to compare."
            }
          </div>
        )}
      </div>
    </div>
  );
};
