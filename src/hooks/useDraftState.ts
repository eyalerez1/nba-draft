import { useState, useEffect } from 'react';
import { DraftState, Player, RosterStrategy, BiddingRecommendation, NominationRecommendation } from '../types';
import { samplePlayers } from '../data/players';
import {
  initializeRoster,
  generateRosterAnalysis,
  getDraftPhase,
  getBiddingRecommendation,
  getNominationRecommendations,
  calculateBudgetAllocation,
  initializeAllTeams,
  updateTeamAfterDraft,
  undoTeamDraft
} from '../utils';

export const useDraftState = () => {
  const initialRoster = initializeRoster();
  const initialStrategy: RosterStrategy = 'balanced';
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
  }, [draftState]);

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

  const handleDraftPlayer = (playerId: string, finalBid: number, draftedBy: string) => {
    const player = draftState.playersRemaining.find(p => p.id === playerId);
    if (!player) return;

    const draftedPlayer = {
      ...player,
      draftedBy,
      actualCost: finalBid,
      draftOrder: draftState.playersDrafted.length + 1
    };

    // Update team tracking
    const updatedTeams = draftState.allTeams.map(team => {
      if (team.teamName === draftedBy) {
        return updateTeamAfterDraft(team, draftedPlayer);
      }
      return team;
    });

    if (draftedBy === 'Eyal') {
      // Update my roster
      const updatedRoster = { ...draftState.myRoster };
      const availableSlot = updatedRoster.slots.find(slot =>
        !slot.player && (
          slot.position === 'BENCH' ||
          slot.position === 'UTIL' ||
          player.positions.includes(slot.position as 'PG' | 'SG' | 'SF' | 'PF' | 'C') ||
          (slot.position === 'G' && (player.positions.includes('PG') || player.positions.includes('SG'))) ||
          (slot.position === 'F' && (player.positions.includes('SF') || player.positions.includes('PF')))
        )
      );

      if (availableSlot) {
        availableSlot.player = draftedPlayer;
        updatedRoster.totalSpent += finalBid;
        updatedRoster.remainingBudget -= finalBid;
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
  };

  const handleUndoLastPick = () => {
    if (draftState.playersDrafted.length === 0) return;

    const lastDraftedPlayer = draftState.playersDrafted[draftState.playersDrafted.length - 1];
    const { draftedBy, actualCost, ...originalPlayer } = lastDraftedPlayer;

    // Update team tracking - undo the draft for the team
    const updatedTeams = draftState.allTeams.map(team => {
      if (team.teamName === draftedBy) {
        return undoTeamDraft(team, lastDraftedPlayer);
      }
      return team;
    });

    if (draftedBy === 'Eyal') {
      // Update my roster - remove the player
      const updatedRoster = { ...draftState.myRoster };
      const playerSlot = updatedRoster.slots.find(slot => slot.player?.id === lastDraftedPlayer.id);

      if (playerSlot) {
        playerSlot.player = undefined;
        updatedRoster.totalSpent -= actualCost;
        updatedRoster.remainingBudget += actualCost;
      }

      setDraftState(prev => ({
        ...prev,
        playersRemaining: [
          ...prev.playersRemaining,
          originalPlayer
        ].sort((a, b) =>
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
        playersRemaining: [
          ...prev.playersRemaining,
          originalPlayer
        ].sort((a, b) =>
          b.projectedValue - a.projectedValue
        ),
        playersDrafted: prev.playersDrafted.slice(0, -1),
        allTeams: updatedTeams
      }));
    }
  };

  const handleNominatePlayer = (playerId: string, startingBid: number, nominatedBy: string) => {
    const player = draftState.playersRemaining.find(p => p.id === playerId);
    if (!player) return;

    setCurrentNomination({
      player,
      currentBid: startingBid,
      nominatedBy
    });
  };

  return {
    draftState,
    currentNomination,
    biddingRec,
    nominationRecs,
    teamNames,
    handleStrategyChange,
    handleDraftPlayer,
    handleUndoLastPick,
    handleNominatePlayer,
    setCurrentNomination
  };
};
