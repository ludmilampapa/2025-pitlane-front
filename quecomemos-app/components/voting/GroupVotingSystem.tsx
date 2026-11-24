'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Vote, ChefHat, Users, Clock, ListChecks, Flame, Dices } from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { useVoting } from '@/lib/contexts/VotingContext';
import {
  VotingSessionCard,
  StartVotingButton,
  VotingInfoCard,
  VotingResultsModal,
} from '@/components/voting';
import type { Group } from '@/components/groups/index';

export type VotingMode = 'classic' | 'match' | 'roulette';

interface GroupVotingSystemProps {
  group: Group;
  onVotingComplete?: () => void;
  selectedMode?: VotingMode;
  onSelectMode?: (mode: VotingMode) => void;
  className?: string;
}

export function GroupVotingSystem({
  group,
  onVotingComplete,
  selectedMode = 'classic',
  onSelectMode,
  className = '',
}: GroupVotingSystemProps) {
  const { userData } = useUser();
  const {
    activeSession,
    loading,
    startSession,
    showResultsModal,
    setShowResultsModal,
    isOffline,
    forceSyncNow,
    lastSyncTime,
  } = useVoting();

  const userId = userData?.profile?.id;
  const isGroupMember = group.members?.some((member) => member.profile.id === userId) || false;

  const handleVotingStarted = () => {
    startSession();
  };

  const handleCloseResults = () => {
    setShowResultsModal(false);
  };

  if (loading) {
    return (
      <Card className={`border-border bg-card ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <span className="ml-3 text-muted-foreground">Loading voting system...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Enhanced connection status indicator with manual sync
  const ConnectionStatusIndicator = () => {
    const formatTime = (date: Date | null) => {
      if (!date) return 'Never';
      return date.toLocaleTimeString();
    };

    if (isOffline) {
      return (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center text-amber-800 dark:text-amber-200">
              <div className="mr-3 h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <div>
                <div className="text-sm font-medium">Connection Issues Detected</div>
                <div className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-300/80">
                  Showing last known state. Last sync: {formatTime(lastSyncTime)}
                </div>
              </div>
            </div>
            <button
              onClick={forceSyncNow}
              className="flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1 text-xs text-white transition-colors hover:bg-amber-700"
            >
              Sync Now
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
        <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center">
            <div className="mr-3 h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm">Connected • Last sync: {formatTime(lastSyncTime)}</span>
          </div>
          <button
            onClick={forceSyncNow}
            className="px-2 py-1 text-xs font-medium opacity-80 transition-opacity hover:opacity-100"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  };

  // If there's an active voting session, show the voting interface
  if (activeSession) {
    return (
      <>
        <div className={`space-y-4 ${className}`}>
          <ConnectionStatusIndicator />

          <VotingSessionCard
            session={activeSession}
            onVotingComplete={onVotingComplete}
            className="border-border"
          />
        </div>

        {/* Results modal displayed independently at group level */}
        {showResultsModal && activeSession && (
          <VotingResultsModal
            isOpen={showResultsModal}
            onClose={handleCloseResults}
            onViewMeal={() => {
              handleCloseResults();
            }}
            session={activeSession}
            winnerProposal={activeSession.proposals?.find((p) => p.mealId === activeSession.winnerMealId)}
          />
        )}
      </>
    );
  }

  // No active session - show the start voting interface with mode picker
  return (
    <div className={`space-y-4 ${className}`}>
      <ConnectionStatusIndicator />

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <Vote className="mr-2 h-5 w-5 text-amber-600" />
            Group Meal Voting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-amber-500/15 p-4">
                <Vote className="h-10 w-10 text-amber-600" />
              </div>
            </div>

            <h3 className="mb-2 text-xl font-semibold text-foreground">
              Ready to Decide What to Eat?
            </h3>

            <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
              Choose how your group wants to vote, then start a session. Everyone can also switch views at any time.
            </p>

            {/* Voting Style Picker */}
            {onSelectMode && (
              <div className="mx-auto mb-6 grid max-w-2xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => onSelectMode('classic')}
                  className={`rounded-xl border p-3.5 transition-all ${
                    selectedMode === 'classic'
                      ? 'border-amber-600 bg-amber-500/10 ring-1 ring-amber-600/40'
                      : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <ListChecks className="h-4 w-4 text-amber-600" />
                    Classic List
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Propose meals to a shared list and upvote your favorites with a live timer.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('match')}
                  className={`rounded-xl border p-3.5 transition-all ${
                    selectedMode === 'match'
                      ? 'border-amber-600 bg-amber-500/10 ring-1 ring-amber-600/40'
                      : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Flame className="h-4 w-4 text-[#C85A32]" />
                    Swipe Match
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Swipe Like or Pass through group-safe meal cards one by one.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMode('roulette')}
                  className={`rounded-xl border p-3.5 transition-all ${
                    selectedMode === 'roulette'
                      ? 'border-amber-600 bg-amber-500/10 ring-1 ring-amber-600/40'
                      : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Dices className="h-4 w-4 text-emerald-600" />
                    Meal Roulette
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Spin the wheel to randomly pick from proposals or safe meals.
                  </p>
                </button>
              </div>
            )}

            <div className="space-y-4">
              {isGroupMember ? (
                <StartVotingButton
                  group={group}
                  onVotingStarted={handleVotingStarted}
                  className="px-8 py-3 text-base"
                />
              ) : (
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    You must be a member of this group to start voting sessions.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>5 min proposals</span>
                </div>
                <div className="hidden h-1 w-1 rounded-full bg-muted-foreground/50 sm:block" />
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Democratic voting</span>
                </div>
                <div className="hidden h-1 w-1 rounded-full bg-muted-foreground/50 sm:block" />
                <div className="flex items-center gap-1">
                  <ChefHat className="h-4 w-4" />
                  <span>Automatic registration</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information card for new users */}
      <VotingInfoCard />
    </div>
  );
}
