import React from 'react';
import { Player } from '../../types';

interface NominationModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredPlayers: Player[];
  selectedPlayerForNomination: Player | null;
  setSelectedPlayerForNomination: (player: Player | null) => void;
  onNominatePlayer: (playerId: string, startingBid: number, nominatedBy: string) => void;
  teamNames: string[];
}

export const NominationModal: React.FC<NominationModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  filteredPlayers,
  selectedPlayerForNomination,
  setSelectedPlayerForNomination,
  onNominatePlayer,
  teamNames
}) => {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPlayerForNomination) return;

    const formData = new FormData(e.currentTarget);
    const nominatedBy = formData.get('nominatedBy') as string;
    const startingBid = parseInt(formData.get('startingBid') as string);

    onNominatePlayer(selectedPlayerForNomination.id, startingBid, nominatedBy);
    setSelectedPlayerForNomination(null);
    onClose();
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Nominate Player</h3>

        {!selectedPlayerForNomination ? (
          <>
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
              {filteredPlayers.slice(0, 20).map(player => (
                <div
                  key={player.id}
                  onClick={() => setSelectedPlayerForNomination(player)}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
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
                      <div className="text-sm text-gray-600">
                        {player.team} - {player.positions.join('/')} - ${player.projectedValue}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Selected Player Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-lg">{selectedPlayerForNomination.name}</span>
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

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nominated By</label>
                  <select name="nominatedBy" className="w-full border rounded px-3 py-2" required>
                    {teamNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
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
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setSelectedPlayerForNomination(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Nominate Player
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
