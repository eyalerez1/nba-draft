import { useState, useEffect, useMemo, useCallback } from 'react';
import { DraftState, Player, RosterStrategy, BiddingRecommendation, NominationRecommendation, DraftedPlayer, MyRoster, TeamInfo } from '../types';

// Core state type (without derived values)
type CoreDraftState = {
  totalBudget: number;
  playersRemaining: Player[];
  playersDrafted: DraftedPlayer[];
  myRoster: MyRoster;
  totalTeams: number;
  selectedStrategy: RosterStrategy;
  allTeams: TeamInfo[];
};
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

// localStorage key for persisting draft state
const DRAFT_STATE_KEY = 'nba-draft-state';

// Utility functions for localStorage
const saveDraftStateToStorage = (state: CoreDraftState) => {
  try {
    localStorage.setItem(DRAFT_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save draft state to localStorage:', error);
  }
};

const loadDraftStateFromStorage = (): CoreDraftState | null => {
  try {
    const saved = localStorage.getItem(DRAFT_STATE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Failed to load draft state from localStorage:', error);
  }
  return null;
};

const clearDraftStateFromStorage = () => {
  try {
    localStorage.removeItem(DRAFT_STATE_KEY);
  } catch (error) {
    console.warn('Failed to clear draft state from localStorage:', error);
  }
};

export const useDraftState = () => {
  const initialRoster = initializeRoster();
  const initialStrategy: RosterStrategy = 'balanced';
  const teamNames = ['Eyal', 'Ben', 'Shtemler', 'Shtark', 'Topaz', 'Yoav', 'Hertz', 'Lior', 'Shachar', 'Shay'];
  const initialTeams = initializeAllTeams(teamNames, 200);

  // Create initial state
  const createInitialState = useCallback((): CoreDraftState => ({
    totalBudget: 200,
    playersRemaining: samplePlayers,
    playersDrafted: [],
    myRoster: initialRoster,
    totalTeams: 10,
    selectedStrategy: initialStrategy,
    allTeams: initialTeams
  }), [initialRoster, initialStrategy, initialTeams]);

  // Initialize state from localStorage or create new
  const [coreState, setCoreState] = useState<CoreDraftState>(() => {
    // Only try to load from localStorage on client side
    if (typeof window !== 'undefined') {
      const savedState = loadDraftStateFromStorage();
      if (savedState) {
        return savedState;
      }
    }
    return createInitialState();
  });

  // Derived values computed from core state
  const draftPhase = useMemo(() =>
    getDraftPhase(coreState.playersDrafted, coreState.totalTeams * 13),
    [coreState.playersDrafted, coreState.totalTeams]
  );

  const rosterAnalysis = useMemo(() =>
    generateRosterAnalysis(coreState.myRoster, coreState.selectedStrategy),
    [coreState.myRoster, coreState.selectedStrategy]
  );

  const budgetAllocation = useMemo(() => {
    const tempDraftState = {
      ...coreState,
      draftPhase,
      rosterAnalysis,
      budgetAllocation: { earlyPhaseTarget: 80, middlePhaseTarget: 80, latePhaseTarget: 40, starPlayerBudget: 100, reasoning: [] }
    };
    return calculateBudgetAllocation(tempDraftState);
  }, [coreState, draftPhase, rosterAnalysis]);

  // Complete draft state combining core and derived values
  const draftState: DraftState = useMemo(() => ({
    ...coreState,
    draftPhase,
    rosterAnalysis,
    budgetAllocation
  }), [coreState, draftPhase, rosterAnalysis, budgetAllocation]);

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

  // Save state to localStorage whenever coreState changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      saveDraftStateToStorage(coreState);
    }
  }, [coreState]);

  // Reset draft function
  const handleResetDraft = useCallback(() => {
    const newState = createInitialState();
    setCoreState(newState);
    setCurrentNomination(null);
    clearDraftStateFromStorage();
  }, [createInitialState]);

  const handleStrategyChange = (newStrategy: RosterStrategy) => {
    setCoreState(prev => ({
      ...prev,
      selectedStrategy: newStrategy
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

      setCoreState(prev => ({
        ...prev,
        playersRemaining: prev.playersRemaining.filter(p => p.id !== playerId),
        playersDrafted: [...prev.playersDrafted, draftedPlayer],
        myRoster: updatedRoster,
        allTeams: updatedTeams
      }));
    } else {
      setCoreState(prev => ({
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

      setCoreState(prev => ({
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
      setCoreState(prev => ({
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
    handleResetDraft,
    setCurrentNomination
  };
};
