import React from 'react';
import { Player, BiddingRecommendation } from '../../types';

interface BiddingSectionProps {
  currentNomination: {
    player: Player;
    currentBid: number;
    nominatedBy: string;
  } | null;
  biddingRec: BiddingRecommendation | null;
  onDraftPlayer: (playerId: string, finalBid: number, draftedBy: string) => void;
  teamNames: string[];
}

export const BiddingSection: React.FC<BiddingSectionProps> = ({
  currentNomination,
  biddingRec,
  onDraftPlayer,
  teamNames
}) => {
  if (!currentNomination) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const finalBid = parseInt(formData.get('finalBid') as string);
    const draftedBy = formData.get('draftedBy') as string;

    onDraftPlayer(currentNomination.player.id, finalBid, draftedBy);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Current Nomination</h2>

      <div className="space-y-4">
        {/* Player Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">{currentNomination.player.name}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  currentNomination.player.tier === 1 ? 'bg-purple-100 text-purple-800' :
                  currentNomination.player.tier === 2 ? 'bg-blue-100 text-blue-800' :
                  currentNomination.player.tier === 3 ? 'bg-green-100 text-green-800' :
                  currentNomination.player.tier === 4 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  Tier {currentNomination.player.tier}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {currentNomination.player.team} - {currentNomination.player.positions.join('/')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">${currentNomination.player.projectedValue}</div>
              <div className="text-sm text-gray-500">Projected Value</div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Nominated by: {currentNomination.nominatedBy}</span>
            <span className="text-lg font-semibold text-blue-600">${currentNomination.currentBid}</span>
          </div>
        </div>

        {/* Bidding Recommendation */}
        {biddingRec && (
          <div className="space-y-4">
            {/* Main Recommendation */}
            <div className={`p-4 rounded-lg border-2 ${
              biddingRec.biddingScore >= 85 ? 'bg-red-50 border-red-200' :
              biddingRec.biddingScore >= 75 ? 'bg-orange-50 border-orange-200' :
              biddingRec.biddingScore >= 65 ? 'bg-green-50 border-green-200' :
              biddingRec.biddingScore >= 55 ? 'bg-yellow-50 border-yellow-200' :
              biddingRec.biddingScore >= 45 ? 'bg-gray-50 border-gray-200' :
              'bg-red-50 border-red-300'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-lg font-bold ${
                  biddingRec.biddingScore >= 85 ? 'text-red-800' :
                  biddingRec.biddingScore >= 75 ? 'text-orange-800' :
                  biddingRec.biddingScore >= 65 ? 'text-green-800' :
                  biddingRec.biddingScore >= 55 ? 'text-yellow-800' :
                  biddingRec.biddingScore >= 45 ? 'text-gray-800' :
                  'text-red-800'
                }`}>
                  {biddingRec.biddingScore >= 85 ? '🔥 EXCEPTIONAL' :
                   biddingRec.biddingScore >= 75 ? '⭐ EXCELLENT' :
                   biddingRec.biddingScore >= 65 ? '✅ GOOD' :
                   biddingRec.biddingScore >= 55 ? '⚖️ FAIR' :
                   biddingRec.biddingScore >= 45 ? '⚠️ BELOW AVERAGE' :
                   biddingRec.biddingScore >= 35 ? '❌ POOR' : '🚫 AVOID'}
                </span>
                <span className="text-2xl font-bold">{biddingRec.biddingScore}/100</span>
              </div>
              <div className="text-sm mb-2">
                <strong>Max Recommended Bid: ${biddingRec.maxBid}</strong>
              </div>
              <div className="text-xs space-y-1">
                {biddingRec.reasoning.slice(0, 3).map((reason, index) => (
                  <div key={index}>• {reason}</div>
                ))}
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-gray-50 p-3 rounded text-xs">
              <div className="font-medium mb-2">Score Breakdown:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>Roster Fit: {biddingRec.scoreBreakdown.rosterFit}/25</div>
                <div>Remaining Value: {biddingRec.scoreBreakdown.remainingPlayersValue}/20</div>
                <div>Budget Situation: {biddingRec.scoreBreakdown.budgetSituation}/20</div>
                <div>Value Efficiency: {biddingRec.scoreBreakdown.valueEfficiency}/20</div>
                <div>Punt Strategy: {biddingRec.scoreBreakdown.puntStrategy}/15</div>
              </div>
            </div>
          </div>
        )}

        {/* Draft Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Final Bid</label>
              <input
                type="number"
                name="finalBid"
                defaultValue={currentNomination.currentBid}
                min={currentNomination.currentBid}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Drafted By</label>
              <select name="draftedBy" className="w-full border rounded px-3 py-2" required>
                {teamNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
          >
            Draft Player
          </button>
        </form>
      </div>
    </div>
  );
};
