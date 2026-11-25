'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { VotingService } from '@/components/voting/VotingService';
import type { VotingSession } from '@/components/voting/types';

interface VotingContextType {
  activeSession: VotingSession | null;
  loading: boolean;
  error: string | null;

  refreshSession: () => Promise<void>;
  startSession: () => Promise<void>;
  clearSession: () => void;

  showResultsModal: boolean;
  setShowResultsModal: (show: boolean) => void;

  notifyVotingCompleted: (sessionId: number) => void;
  onVotingCompleted: (callback: (sessionId: number) => void) => () => void;

  updateSessionOptimistically: (updates: Partial<VotingSession>) => void;
  isOffline: boolean;

  forceSyncNow: () => Promise<void>;
  lastSyncTime: Date | null;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

interface VotingProviderProps {
  children: React.ReactNode;
  groupId: number;
}

function hasSessionChanged(prev: VotingSession | null, next: VotingSession | null): boolean {
  if (!prev && !next) return false;
  if (!prev || !next) return true;
  if (prev.VotingSessionID !== next.VotingSessionID) return true;
  if (prev.status !== next.status) return true;
  if (prev.totalVotes !== next.totalVotes) return true;
  if (prev.winnerMealId !== next.winnerMealId) return true;
  if ((prev.proposals?.length || 0) !== (next.proposals?.length || 0)) return true;
  if ((prev.proposalConfirmations?.length || 0) !== (next.proposalConfirmations?.length || 0)) return true;
  if ((prev.voteConfirmations?.length || 0) !== (next.voteConfirmations?.length || 0)) return true;

  const prevProposals = prev.proposals || [];
  const nextProposals = next.proposals || [];
  for (let i = 0; i < prevProposals.length; i++) {
    if (
      prevProposals[i].MealProposalID !== nextProposals[i]?.MealProposalID ||
      prevProposals[i].voteCount !== nextProposals[i]?.voteCount ||
      (prevProposals[i].votes?.length || 0) !== (nextProposals[i]?.votes?.length || 0)
    ) {
      return true;
    }
  }
  return false;
}

export function VotingProvider({ children, groupId }: VotingProviderProps) {
  const [activeSession, setActiveSession] = useState<VotingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const completionListenersRef = useRef<Set<(sessionId: number) => void>>(new Set());
  const lastNetworkAttemptRef = useRef<number>(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchActiveSession = useCallback(async (showLoader = true) => {
    if (!mountedRef.current) return;
    if (typeof groupId !== 'number' || Number.isNaN(groupId)) {
      setActiveSession(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);

      const sessions = await VotingService.getActiveVotingSessions(groupId);
      const session = sessions && sessions.length > 0 ? sessions[0] : null;

      if (!mountedRef.current) return;

      setLastSyncTime(new Date());
      setIsOffline(false);
      setError(null);

      setActiveSession((prev) => {
        if (prev && session && prev.status !== 'completed' && session.status === 'completed') {
          setShowResultsModal(true);
        }
        return session;
      });
    } catch (err) {
      if (!mountedRef.current) return;

      if (err instanceof Error) {
        if (err.message.includes('404')) {
          setActiveSession(null);
          setError(null);
          setIsOffline(false);
        } else if (
          err.message.includes('timeout') ||
          err.name === 'AbortError' ||
          err.message.includes('fetch') ||
          err.message.includes('network')
        ) {
          setIsOffline(true);
          setError(`Connection issue: ${err.message}`);
        } else {
          setError(err.message);
          setIsOffline(false);
        }
      } else {
        setError('Unknown error occurred');
        setIsOffline(true);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [groupId]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (groupId && typeof groupId === 'number') {
        void fetchActiveSession(false);
      }
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [groupId, fetchActiveSession]);

  const updateSessionOptimistically = useCallback(
    (updates: Partial<VotingSession>) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, ...updates };

        const now = Date.now();
        if (now - lastNetworkAttemptRef.current > 1500) {
          lastNetworkAttemptRef.current = now;
          setTimeout(() => {
            if (mountedRef.current && !isOffline) {
              void fetchActiveSession(false);
            }
          }, 800);
        }

        return updated;
      });
    },
    [isOffline, fetchActiveSession]
  );

  const refreshSession = useCallback(async () => {
    if (typeof groupId !== 'number' || Number.isNaN(groupId)) return;
    await fetchActiveSession(false);
  }, [fetchActiveSession, groupId]);

  const forceSyncNow = useCallback(async () => {
    if (typeof groupId !== 'number' || Number.isNaN(groupId)) return;
    await fetchActiveSession(true);
  }, [fetchActiveSession, groupId]);

  const startSession = useCallback(async () => {
    if (typeof groupId !== 'number' || Number.isNaN(groupId)) return;
    await fetchActiveSession(true);
  }, [fetchActiveSession, groupId]);

  const clearSession = useCallback(() => {
    setActiveSession(null);
    setShowResultsModal(false);
    setError(null);
  }, []);

  const notifyVotingCompleted = useCallback((sessionId: number) => {
    completionListenersRef.current.forEach((callback) => {
      try {
        callback(sessionId);
      } catch (err) {
        console.error('[VotingContext] Error in completion listener:', err);
      }
    });
  }, []);

  const onVotingCompleted = useCallback((callback: (sessionId: number) => void) => {
    completionListenersRef.current.add(callback);
    return () => {
      completionListenersRef.current.delete(callback);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    void fetchActiveSession(true);
  }, [fetchActiveSession]);

  // Live polling without stale closure traps
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    if (!isOffline && groupId) {
      pollIntervalRef.current = setInterval(async () => {
        if (!mountedRef.current || isOffline) return;

        try {
          const sessions = await VotingService.getActiveVotingSessions(groupId);
          const next = sessions.length > 0 ? sessions[0] : null;
          if (!mountedRef.current) return;

          setLastSyncTime(new Date());
          setIsOffline(false);

          setActiveSession((prev) => {
            if (!hasSessionChanged(prev, next)) return prev;
            if (prev && next && prev.status !== 'completed' && next.status === 'completed') {
              setShowResultsModal(true);
            }
            return next;
          });
        } catch (err) {
          console.error('[VotingContext] polling error:', err);
        }
      }, 6000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [groupId, isOffline]);

  const value: VotingContextType = {
    activeSession,
    loading,
    error,
    refreshSession,
    startSession,
    clearSession,
    showResultsModal,
    setShowResultsModal,
    notifyVotingCompleted,
    onVotingCompleted,
    updateSessionOptimistically,
    isOffline,
    forceSyncNow,
    lastSyncTime,
  };

  return <VotingContext.Provider value={value}>{children}</VotingContext.Provider>;
}

export function useVoting() {
  const context = useContext(VotingContext);
  if (context === undefined) {
    throw new Error('useVoting must be used within a VotingProvider');
  }
  return context;
}
