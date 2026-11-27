'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Dices,
  RefreshCw,
  WifiOff,
  Flame,
  Gamepad2,
  Trophy,
  Maximize2,
  X,
  Clock,
} from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { useVoting } from '@/lib/contexts/VotingContext';
import {
  VotingSessionCard,
  StartVotingButton,
  VotingResultsModal,
  VotingTimer,
} from '@/components/voting';
import type { Group } from '@/components/groups/index';
import type { VotingSession } from './types';
import { formatArgentinaTime } from '@/lib/utils/timezone';

export type VotingMode = 'classic' | 'roulette';

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
  const [minigameModalOpen, setMinigameModalOpen] = useState(true);

  useEffect(() => {
    if (activeSession?.VotingSessionID) {
      setMinigameModalOpen(true);
    }
  }, [activeSession?.VotingSessionID]);

  const handleVotingStarted = (createdSession?: VotingSession) => {
    setMinigameModalOpen(true);
    void startSession(createdSession);
  };

  const handleCloseResults = () => {
    setShowResultsModal(false);
  };

  if (loading) {
    return (
      <Card className={`rounded-2xl border-border bg-card shadow-sm ${className}`}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            <span className="text-sm text-muted-foreground">Loading game stage...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (date: Date | null) => {
    if (!date) return 'Just now';
    return formatArgentinaTime(date);
  };

  const SyncBar = () => {
    if (isOffline) {
      return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-200">
            <WifiOff className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="text-xs font-medium">
              Connection interrupted · Showing state from {formatTime(lastSyncTime)}
            </span>
          </div>
          <button
            type="button"
            onClick={forceSyncNow}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            <RefreshCw className="h-3 w-3" />
            Reconnect
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Live multiplayer sync · Updated {formatTime(lastSyncTime)}
        </span>
        <button
          type="button"
          onClick={forceSyncNow}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
    );
  };

  if (activeSession) {
    const canShowPortal = minigameModalOpen && typeof document !== 'undefined';

    return (
      <>
        <div className={`space-y-3 ${className}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SyncBar />
            {!minigameModalOpen && (
              <Button
                type="button"
                size="sm"
                onClick={() => setMinigameModalOpen(true)}
                className="rounded-xl bg-secondary text-xs font-bold text-secondary-foreground hover:bg-secondary/90"
              >
                <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                Open Minigame View
              </Button>
            )}
          </div>

          {!canShowPortal && (
            <VotingSessionCard
              session={activeSession}
              onVotingComplete={onVotingComplete}
            />
          )}
        </div>

        {/* Full-Focus Arcade Minigame Modal */}
        {canShowPortal &&
          createPortal(
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-6"
              onClick={() => setMinigameModalOpen(false)}
            >
              <div
                className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-secondary/40 bg-background shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                      <Gamepad2 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-secondary">
                        Meal Showdown · Minigame
                      </p>
                      <p className="text-xs text-muted-foreground">{group.name}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {activeSession.status === 'proposal_phase' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/35 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                        <Clock className="h-3.5 w-3.5" />
                        <VotingTimer endTime={activeSession.proposalEndsAt} label="Round" />
                      </span>
                    )}
                    {activeSession.votingEndsAt &&
                      (activeSession.status === 'proposal_phase' ||
                        activeSession.status === 'voting_phase') && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          <Clock className="h-3.5 w-3.5" />
                          <VotingTimer endTime={activeSession.votingEndsAt} label="Total" />
                        </span>
                      )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMinigameModalOpen(false)}
                      className="h-8 rounded-xl border-border bg-background text-xs font-semibold text-foreground hover:bg-muted"
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Exit Minigame
                    </Button>
                  </div>
                </div>

                <div className="overflow-y-auto p-3 sm:p-5">
                  <VotingSessionCard
                    session={activeSession}
                    onVotingComplete={onVotingComplete}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}

        {showResultsModal && activeSession && (
          <VotingResultsModal
            isOpen={showResultsModal}
            onClose={handleCloseResults}
            onViewMeal={handleCloseResults}
            session={activeSession}
            winnerProposal={activeSession.proposals?.find(
              (p) => p.mealId === activeSession.winnerMealId
            )}
          />
        )}
      </>
    );
  }

  const members = group.members || [];

  return (
    <div className={`space-y-3 ${className}`}>
      <SyncBar />

      {/* Immersive Game Lobby */}
      <Card className="relative overflow-hidden rounded-3xl border-border bg-card shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-secondary/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl"
        />

        <CardContent className="relative p-6 sm:p-10">
          <div className="mx-auto max-w-xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-secondary/30 bg-secondary/10 shadow-sm">
              <Gamepad2 className="h-8 w-8 text-secondary" />
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.16em] text-secondary">
              Multiplayer Food Showdown
            </span>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Ready to Play What We Eat?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Swipe dishes matched to your personal tastes &amp; diet, add favorites manually or let fate load random dishes, then enter <strong className="font-semibold text-foreground">Classic List</strong> or <strong className="font-semibold text-foreground">Meal Roulette</strong>!
            </p>

            {/* Connected Group Players */}
            {members.length > 0 && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="flex -space-x-2">
                  {members.slice(0, 7).map((member) => (
                    <div
                      key={member.profile.id}
                      title={member.profile.username}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-primary/15 text-xs font-bold text-primary shadow-sm"
                    >
                      {(member.profile.username || 'P').slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {members.length > 7 && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-semibold text-muted-foreground">
                      +{members.length - 7}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {members.length} {members.length === 1 ? 'player' : 'players'} in {group.name}
                </span>
              </div>
            )}

            {/* Start Game CTA */}
            <div className="mt-7">
              {isGroupMember ? (
                <StartVotingButton
                  group={group}
                  onVotingStarted={handleVotingStarted}
                  className="h-12 rounded-2xl px-9 text-base font-bold"
                />
              ) : (
                <div className="rounded-2xl border border-border bg-muted/40 p-4">
                  <Users className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    You must be a member of this group to start a game round.
                  </p>
                </div>
              )}
            </div>

            {/* 3-Round Preview Strip */}
            <div className="mt-8 grid grid-cols-1 gap-2.5 border-t border-border/70 pt-6 text-left sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                  <Flame className="h-4 w-4" />
                  Round 1 · Cravings
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Swipe dishes tailored to your tastes &amp; restrictions, or add manually.
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <Dices className="h-4 w-4" />
                  Round 2 · Choose Arena
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Play Classic List or Meal Roulette with your pool — or random dishes!
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/30 p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Trophy className="h-4 w-4" />
                  Round 3 · Podium
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Crown the winning meal and pick each member&apos;s portion.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
