'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Users,
  Trophy,
  CheckCircle,
  Flame,
  Sparkles,
  Dices,
  ListChecks,
  ArrowLeft,
  ArrowRight,
  Shuffle,
  Gamepad2,
  XCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { isGameSfxMuted, playGameSfx, setGameSfxMuted } from '@/lib/utils/gameSfx';
import { markBadgesSeen, triggerBadgeCheck } from '@/components/common/BadgeUnlockWatcher';
import { useUser } from '@/lib/contexts/UserContext';
import { useGlobalNotification } from '@/lib/contexts/NotificationContext';
import { useVoting } from '@/lib/contexts/VotingContext';
import { formatArgentinaDateTime } from '@/lib/utils/timezone';
import { VotingService } from './VotingService';
import { MealProposalCard } from './MealProposalCard';
import { VotingTimer } from './VotingTimer';
import { ProposeMealModal } from './ProposeMealModal';
import { EarlyCompletionModal } from './EarlyCompletionModal';
import { GroupSwipeMatch } from './GroupSwipeMatch';
import { GroupMealRoulette } from './GroupMealRoulette';
import { isMealCompatibleWithRestrictions } from '@/lib/utils/dietaryCompatibility';
import type { VotingSession, MealProposal } from './types';
import { API_BASE_URL } from '@/lib/config/api';
import { toast } from 'sonner';

interface VotingSessionCardProps {
  session: VotingSession;
  onVotingComplete?: () => void;
  className?: string;
}

interface DietaryRestriction {
  DietaryRestrictionID: number;
  name: string;
}

type ArenaMode = 'chooser' | 'classic' | 'roulette';

export function VotingSessionCard({
  session: initialSession,
  onVotingComplete,
  className = '',
}: VotingSessionCardProps) {
  const { userData } = useUser();
  const { showSuccess, showError } = useGlobalNotification();
  const {
    setShowResultsModal,
    refreshSession,
    setSessionDirectly,
    clearSession,
    notifyVotingCompleted,
    updateSessionOptimistically,
    isOffline,
  } = useVoting();

  const [loading, setLoading] = useState(false);
  const [forceClosing, setForceClosing] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);

  useEffect(() => {
    setSfxMuted(isGameSfxMuted());
  }, []);

  const toggleSfx = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    setGameSfxMuted(next);
  };
  const [proposeModalTab, setProposeModalTab] = useState<'swipe' | 'manual'>('manual');
  const [showProposeMeal, setShowProposeMeal] = useState(false);
  const [showEarlyCompletion, setShowEarlyCompletion] = useState(false);
  const [groupRestrictions, setGroupRestrictions] = useState<DietaryRestriction[]>([]);
  const [arenaMode, setArenaMode] = useState<ArenaMode>('chooser');

  const userId = userData?.profile?.id;
  const updatedSession = initialSession;

  // Reset to the game-mode chooser whenever a new session enters voting_phase
  useEffect(() => {
    setArenaMode('chooser');
  }, [updatedSession.VotingSessionID]);

  const showLoggedMealToast = useCallback(
    (winnerName: string, consumptionId?: number) => {
      toast.success('Group meal logged', {
        description: `"${winnerName}" was added to the group history.`,
        action:
          consumptionId && userId
            ? {
                label: 'Undo',
                onClick: () => {
                  fetch(`${API_BASE_URL}/consumptions/${consumptionId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profileId: userId }),
                  })
                    .then((response) => {
                      if (!response.ok) throw new Error('Could not undo consumption');
                      toast.success('Meal log undone');
                      onVotingComplete?.();
                      refreshSession();
                    })
                    .catch((error: unknown) => {
                      toast.error(error instanceof Error ? error.message : 'Could not undo');
                    });
                },
              }
            : undefined,
      });
    },
    [userId, onVotingComplete, refreshSession]
  );

  const isGroupOwner = updatedSession.group?.createdBy === userId;
  const isInitiator = updatedSession.initiatorId === userId;
  const isGroupAdmin =
    updatedSession.group?.members?.some(
      (member) => member.profile.id === userId && member.role === 'admin'
    ) || false;
  const isGroupMember =
    updatedSession.group?.members?.some((member) => member.profile.id === userId) || false;
  const canParticipate = isGroupOwner || isGroupAdmin || isGroupMember;
  const canAdvancePhase = isGroupOwner || isGroupAdmin || isInitiator;

  const isExpired = () => {
    const now = new Date();
    if (updatedSession.status === 'proposal_phase') {
      return now > new Date(updatedSession.proposalEndsAt);
    } else if (updatedSession.status === 'voting_phase' && updatedSession.votingEndsAt) {
      return now > new Date(updatedSession.votingEndsAt);
    }
    return false;
  };

  const hasUserVoted = (proposal: MealProposal) =>
    proposal.votes?.some((vote) => vote.voterId === userId && vote.isActive) || false;
  const userVoteCount =
    updatedSession.proposals?.reduce(
      (count, proposal) => count + (hasUserVoted(proposal) ? 1 : 0),
      0
    ) || 0;

  const hasUserConfirmedReady =
    updatedSession.proposalConfirmations?.some((confirmation) => confirmation.userId === userId) ||
    false;

  const hasUserConfirmedVotes =
    updatedSession.voteConfirmations?.some((confirmation) => confirmation.userId === userId) ||
    false;

  const shouldShowEarlyCompletion = useCallback(() => {
    if (updatedSession.status !== 'voting_phase') return false;

    const totalMembers = updatedSession.group?.members?.length || 0;
    const totalVoters = new Set(
      updatedSession.proposals?.flatMap((p) =>
        (p.votes || []).filter((v) => v.isActive).map((v) => v.voterId)
      ) || []
    ).size;

    const majorityThreshold = Math.ceil(totalMembers * 0.6);
    return totalVoters >= majorityThreshold && totalMembers > 1;
  }, [updatedSession.status, updatedSession.group?.members?.length, updatedSession.proposals]);

  useEffect(() => {
    if (shouldShowEarlyCompletion() && !showEarlyCompletion) {
      const timer = setTimeout(() => {
        setShowEarlyCompletion(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [updatedSession.status, updatedSession.proposals, shouldShowEarlyCompletion, showEarlyCompletion]);

  const ensureRandomPoolIfEmpty = useCallback(async () => {
    if ((updatedSession.proposals?.length || 0) > 0 || !userId) return;

    let pool: Array<{ MealID: number }> = [];
    const allRes = await fetch(`${API_BASE_URL}/meals/all`);
    if (allRes.ok) {
      const allMeals = (await allRes.json()) as Array<{
        MealID: number;
        name?: string;
        mealFoods?: Array<{
          food?: {
            name?: string;
            dietaryRestrictions?: Array<{ DietaryRestrictionID?: number; name?: string } | number>;
          };
        }>;
      }>;
      pool = allMeals.filter((m) => isMealCompatibleWithRestrictions(m, groupRestrictions));
    }

    if (pool.length === 0) return;

    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const picks = shuffled.slice(0, Math.min(5, shuffled.length));
    for (const meal of picks) {
      try {
        await VotingService.proposeMeal(updatedSession.VotingSessionID, {
          mealId: meal.MealID,
          proposedById: userId,
        });
      } catch {
        // Ignore duplicates if another member proposed simultaneously
      }
    }
  }, [
    updatedSession.proposals?.length,
    updatedSession.VotingSessionID,
    userId,
    groupRestrictions,
  ]);

  const handleRouletteWin = async (winnerProposalId: number, mealName: string) => {
    setLoading(true);
    try {
      const result = await VotingService.completeVotingSession(
        updatedSession.VotingSessionID,
        winnerProposalId
      );
      const iWon = Boolean(
        userId &&
          (result?.winnerUserId === userId || result?.winnerProposal?.proposedById === userId)
      );
      const earnedBadges = Array.isArray(result?.winnerBadges)
        ? result.winnerBadges
        : Array.isArray(result?.session?.winnerBadges)
        ? result.session.winnerBadges
        : [];
      showSuccess(
        iWon ? 'You won the vote!' : 'Roulette Winner Crowned!',
        iWon
          ? `Your proposal "${mealName}" won on the Meal Roulette!`
          : `"${mealName}" won on the Meal Roulette!`
      );
      if (iWon && earnedBadges.length > 0) {
        playGameSfx('badge');
        if (userId) {
          markBadgesSeen(
            userId,
            earnedBadges
              .map((b: { BadgeID?: number }) => b.BadgeID)
              .filter((id: number | undefined): id is number => typeof id === 'number')
          );
        }
        showSuccess(
          'Badge Unlocked!',
          `You earned: ${earnedBadges.map((b: { name?: string }) => b.name || 'Vote Winner').join(', ')}`
        );
      } else {
        triggerBadgeCheck();
      }
      if (userId && result?.session?.winnerMealId) {
        try {
          const consumption = (await VotingService.createConsumptionFromVote(
            updatedSession.VotingSessionID,
            {
              profileId: userId,
              name: mealName,
              description: `Group meal from Meal Roulette: ${updatedSession.title || 'Meal Vote'}`,
              quantity: 1,
            }
          )) as { ConsumptionID?: number };
          showLoggedMealToast(mealName, consumption.ConsumptionID);
        } catch {
          // Ignore duplicate consumption creation if another client already logged it
        }
      }
      await refreshSession();
      setShowResultsModal(true);
      onVotingComplete?.();
      notifyVotingCompleted(updatedSession.VotingSessionID);
    } catch (error) {
      showError(
        'Could Not Crown Roulette Winner',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForceClose = async () => {
    if (!canAdvancePhase || forceClosing) return;
    setForceClosing(true);
    try {
      await VotingService.forceCloseVotingSession(updatedSession.VotingSessionID, userId);
      clearSession();
      toast.success('Voting session closed', {
        description: 'You can now start a new voting session whenever you are ready.',
      });
      onVotingComplete?.();
      await refreshSession();
    } catch (error) {
      showError(
        'Could Not Close Voting',
        error instanceof Error ? error.message : 'Failed to force-close voting session'
      );
    } finally {
      setForceClosing(false);
    }
  };

  const handleStartVoting = async () => {
    if (!canParticipate || !canAdvancePhase) {
      showError('Access Denied', 'Only the host or group admins can advance the round early.');
      return;
    }

    const hadZeroProposals = (updatedSession.proposals?.length || 0) === 0;
    setLoading(true);
    try {
      setArenaMode('chooser');
      if (hadZeroProposals) {
        await ensureRandomPoolIfEmpty();
      }
      const nextSession = await VotingService.startVotingPhase(updatedSession.VotingSessionID);
      if (nextSession && nextSession.VotingSessionID) {
        setSessionDirectly(nextSession);
      } else {
        await refreshSession();
      }
      showSuccess(
        hadZeroProposals ? 'Random Pool Loaded' : 'Pool Ready',
        hadZeroProposals
          ? 'Random compatible dishes are ready. Pick Classic List or Meal Roulette.'
          : 'Choose Classic List or Meal Roulette to cast your votes.'
      );
    } catch (error) {
      showError(
        'Error Starting Arena',
        error instanceof Error ? error.message : 'Failed to start voting round'
      );
    } finally {
      setLoading(false);
    }
  };

  const finalizeVotingAndLog = async (early = false) => {
    setLoading(true);
    try {
      const result = await VotingService.completeVotingSession(updatedSession.VotingSessionID);
      const winnerName = result.winnerProposal?.meal?.name || 'Unknown meal';
      const voteCount = result.winnerProposal?.voteCount || 0;
      const iWon = Boolean(
        userId &&
          (result?.winnerUserId === userId || result?.winnerProposal?.proposedById === userId)
      );
      const earnedBadges = Array.isArray(result?.winnerBadges)
        ? result.winnerBadges
        : Array.isArray(result?.session?.winnerBadges)
        ? result.session.winnerBadges
        : [];

      showSuccess(
        iWon ? 'You won the vote!' : early ? 'Voting Completed Early!' : 'Winner Crowned!',
        iWon
          ? `Your proposal "${winnerName}" won with ${voteCount} ${voteCount === 1 ? 'vote' : 'votes'}!`
          : `The winning meal is "${winnerName}" with ${voteCount} ${voteCount === 1 ? 'vote' : 'votes'}!`
      );
      if (iWon && earnedBadges.length > 0) {
        playGameSfx('badge');
        if (userId) {
          markBadgesSeen(
            userId,
            earnedBadges
              .map((b: { BadgeID?: number }) => b.BadgeID)
              .filter((id: number | undefined): id is number => typeof id === 'number')
          );
        }
        showSuccess(
          'Badge Unlocked!',
          `You earned: ${earnedBadges.map((b: { name?: string }) => b.name || 'Vote Winner').join(', ')}`
        );
      } else {
        triggerBadgeCheck();
      }
      if (early) setShowEarlyCompletion(false);

      if (userId && result.session?.winnerMealId) {
        try {
          const consumption = (await VotingService.createConsumptionFromVote(
            updatedSession.VotingSessionID,
            {
              profileId: userId,
              name: winnerName,
              description: `Group meal from voting session: ${updatedSession.title || 'Meal Vote'}`,
              quantity: 1,
            }
          )) as { ConsumptionID?: number };

          showLoggedMealToast(winnerName, consumption.ConsumptionID);
          onVotingComplete?.();
          notifyVotingCompleted(updatedSession.VotingSessionID);
        } catch (consumptionError) {
          console.error('Error creating consumption:', consumptionError);
          const errorMessage =
            consumptionError instanceof Error ? consumptionError.message : '';
          if (!errorMessage.includes('already') && !errorMessage.includes('duplicate')) {
            showError(
              'Consumption Failed',
              'Could not register the meal consumption automatically.'
            );
          }
        }
      }

      // Update UI immediately to Winner Podium without wiping the completed session
      setSessionDirectly({
        ...updatedSession,
        status: 'completed',
        completedAt: new Date().toISOString(),
        winnerMealId: result.session?.winnerMealId ?? result.winnerProposal?.mealId,
        winnerMeal: result.session?.winnerMeal ?? result.winnerProposal?.meal,
        totalVotes: result.totalVotes ?? updatedSession.totalVotes,
      });

      setShowResultsModal(true);
      onVotingComplete?.();
      notifyVotingCompleted(updatedSession.VotingSessionID);
    } catch (error) {
      showError(
        'Error Completing Voting',
        error instanceof Error ? error.message : 'Failed to complete voting'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteVoting = async () => {
    if (!canParticipate || !canAdvancePhase) {
      showError('Access Denied', 'Only the host or group admins can finalize voting.');
      return;
    }
    await finalizeVotingAndLog(false);
  };

  const handleEarlyCompleteVoting = async () => {
    await finalizeVotingAndLog(true);
  };

  const handleVote = async (proposalId: number) => {
    if (!userId || !canParticipate) {
      showError('Access Denied', 'You must be a member of this group to vote.');
      return;
    }

    setLoading(true);
    try {
      const updatedProposals = updatedSession.proposals.map((proposal) => {
        if (proposal.MealProposalID === proposalId) {
          return {
            ...proposal,
            voteCount: proposal.voteCount + 1,
            votes: [
              ...proposal.votes,
              {
                VoteID: Date.now(),
                votingSessionId: updatedSession.VotingSessionID,
                mealProposalId: proposalId,
                voterId: userId,
                voteType: 'up' as const,
                votedAt: new Date().toISOString(),
                isActive: true,
                voter: {
                  id: userId,
                  username: userData?.profile?.username || 'You',
                },
              },
            ],
          };
        }
        return proposal;
      });

      updateSessionOptimistically({
        proposals: updatedProposals,
        totalVotes: updatedSession.totalVotes + 1,
      });

      await VotingService.castVote(updatedSession.VotingSessionID, {
        mealProposalId: proposalId,
        voterId: userId,
        voteType: 'up',
      });

      toast.success('Vote cast!', {
        description: 'You can undo it while the round stays open.',
        action: {
          label: 'Undo',
          onClick: () => {
            void handleUndoVote(proposalId);
          },
        },
      });

      if (!isOffline) {
        setTimeout(() => refreshSession(), 1200);
      }
    } catch (error) {
      showError('Error Casting Vote', error instanceof Error ? error.message : 'Failed to cast vote');
      refreshSession();
    } finally {
      setLoading(false);
    }
  };

  const handleUndoVote = async (proposalId: number) => {
    if (!userId || !canParticipate) return;

    setLoading(true);
    try {
      const updatedProposals = updatedSession.proposals.map((proposal) => {
        if (proposal.MealProposalID === proposalId) {
          return {
            ...proposal,
            voteCount: Math.max(0, proposal.voteCount - 1),
            votes: (proposal.votes || []).filter(
              (v) => !(v.voterId === userId && v.isActive)
            ),
          };
        }
        return proposal;
      });

      updateSessionOptimistically({
        proposals: updatedProposals,
        totalVotes: Math.max(0, updatedSession.totalVotes - 1),
      });

      await VotingService.undoVote(updatedSession.VotingSessionID, proposalId, userId);
      toast.success('Vote removed');
      await refreshSession();
    } catch (error) {
      showError('Could not remove vote', error instanceof Error ? error.message : 'Try again');
      await refreshSession();
    } finally {
      setLoading(false);
    }
  };

  const handleProposeMeal = async (mealId: number) => {
    if (!userId || !canParticipate) {
      showError('Access Denied', 'You must be a member of this group to propose meals.');
      return;
    }

    try {
      const createdProposal = await VotingService.proposeMeal(updatedSession.VotingSessionID, {
        mealId,
        proposedById: userId,
      });
      if (createdProposal) {
        const normalizedProposal: MealProposal = {
          ...createdProposal,
          voteCount: createdProposal.voteCount ?? 0,
          votes: createdProposal.votes ?? [],
        };
        updateSessionOptimistically({
          proposals: [...(updatedSession.proposals || []), normalizedProposal],
        });
      }
      showSuccess('Dish Added to Pool!', 'Your dish is now in the game pool.');
      setShowProposeMeal(false);
      await refreshSession();
    } catch (error) {
      showError(
        'Error Adding Dish',
        error instanceof Error ? error.message : 'Failed to propose meal'
      );
    }
  };

  const handleConfirmReadyForVoting = async () => {
    if (!userId || !canParticipate) {
      showError('Access Denied', 'You must be a member of this group to confirm readiness.');
      return;
    }

    setLoading(true);
    try {
      const totalMembers = updatedSession.group?.members?.length || 1;
      const confirmedSoFar = updatedSession.proposalConfirmations?.length || 0;
      if (confirmedSoFar + 1 >= totalMembers && (updatedSession.proposals?.length || 0) === 0) {
        await ensureRandomPoolIfEmpty();
      }

      const result = await VotingService.confirmReadyForVoting(
        updatedSession.VotingSessionID,
        userId
      );
      showSuccess('Ready Confirmed!', 'Waiting for remaining players or host.');

      if (result.votingStarted) {
        setArenaMode('chooser');
        if (result.transitionResult) {
          setSessionDirectly(result.transitionResult);
        }
        showSuccess('Round 2 Unlocked!', 'Choose Classic List or Meal Roulette to play!');
      } else {
        await refreshSession();
      }
    } catch (error) {
      showError(
        'Error Confirming Readiness',
        error instanceof Error ? error.message : 'Failed to confirm readiness'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVotes = async () => {
    if (!userId || !canParticipate) {
      showError('Access Denied', 'You must be a member of this group to confirm votes.');
      return;
    }

    setLoading(true);
    try {
      const result = await VotingService.confirmVotes(updatedSession.VotingSessionID, userId);
      showSuccess('Votes Locked In!', 'Your final choices have been recorded.');
      await refreshSession();

      if (result.votingCompleted && result.completionResult) {
        const winnerName = result.completionResult.winnerProposal?.meal?.name || 'Unknown meal';
        const voteCount = result.completionResult.winnerProposal?.voteCount || 0;

        setTimeout(() => {
          showSuccess(
            'Winner Crowned!',
            `All players locked in! "${winnerName}" won with ${voteCount} votes!`
          );
        }, 800);

        setTimeout(async () => {
          if (userId && result.completionResult?.session?.winnerMealId) {
            try {
              const consumption = (await VotingService.createConsumptionFromVote(
                updatedSession.VotingSessionID,
                {
                  profileId: userId,
                  name: winnerName,
                  description: `Group meal from voting session: ${updatedSession.title || 'Meal Vote'}`,
                  quantity: 1,
                }
              )) as { ConsumptionID?: number };

              showLoggedMealToast(winnerName, consumption.ConsumptionID);
            } catch (consumptionError) {
              console.error('Error creating consumption:', consumptionError);
              const errorMessage =
                consumptionError instanceof Error ? consumptionError.message : '';
              if (!errorMessage.includes('already') && !errorMessage.includes('duplicate')) {
                showError(
                  'Consumption Failed',
                  'Could not register the meal consumption automatically.'
                );
              }
            }
          }
        }, 1600);

        setTimeout(() => {
          setShowResultsModal(true);
        }, 2400);

        setTimeout(() => {
          onVotingComplete?.();
          notifyVotingCompleted(updatedSession.VotingSessionID);
        }, 2600);
      }

      await refreshSession();
    } catch (error) {
      console.error('Error confirming votes:', error);
      showError(
        'Error Confirming Votes',
        error instanceof Error ? error.message : 'Failed to confirm votes'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const groupId = initialSession.groupId;
    if (!groupId) return;

    fetch(`${API_BASE_URL}/groups/${groupId}/dietary-info`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load group dietary information');
        const data = (await response.json()) as { dietaryRestrictions?: DietaryRestriction[] };
        setGroupRestrictions(data.dietaryRestrictions || []);
      })
      .catch((error: unknown) => {
        console.error('Error loading group dietary restrictions:', error);
      });
  }, [initialSession.groupId]);

  const getStatusBadge = () => {
    switch (updatedSession.status) {
      case 'proposal_phase':
        return (
          <Badge className="border border-secondary/35 bg-secondary/15 text-secondary hover:bg-secondary/15">
            Round 1 · Build Pool
          </Badge>
        );
      case 'voting_phase':
        return (
          <Badge className="border border-primary/35 bg-primary/15 text-primary hover:bg-primary/15">
            Round 2 · {arenaMode === 'chooser' ? 'Pick Arena' : arenaMode === 'classic' ? 'Classic List' : 'Meal Roulette'}
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="border border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15">
            Winner Crowned
          </Badge>
        );
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{updatedSession.status}</Badge>;
    }
  };

  const getPhaseProgress = () => {
    const now = new Date().getTime();

    if (updatedSession.status === 'proposal_phase') {
      const start = new Date(updatedSession.createdAt).getTime();
      const end = new Date(updatedSession.proposalEndsAt).getTime();
      return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    }

    if (updatedSession.status === 'voting_phase' && updatedSession.votingEndsAt) {
      const start = new Date(updatedSession.proposalEndsAt).getTime();
      const end = new Date(updatedSession.votingEndsAt).getTime();
      return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    }

    return 100;
  };

  const activeStep =
    updatedSession.status === 'proposal_phase'
      ? 1
      : updatedSession.status === 'voting_phase'
        ? 2
        : 3;

  const expiredNow = isExpired() && updatedSession.status !== 'completed';
  useEffect(() => {
    if (!expiredNow) return;
    const t = setTimeout(() => {
      void refreshSession();
    }, 1000);
    return () => clearTimeout(t);
  }, [expiredNow, refreshSession]);

  const proposalCount = updatedSession.proposals?.length || 0;

  return (
    <>
      <Card className={`overflow-hidden rounded-3xl border-border bg-card shadow-sm ${className}`}>
        {/* Game Stage Top HUD */}
        <CardHeader className="space-y-4 border-b border-border/70 bg-muted/25 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
                <Gamepad2 className="h-5 w-5 text-secondary" />
                {updatedSession.title || 'Group Meal Game'}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {updatedSession.description ||
                  `Hosted by ${updatedSession.initiator?.username || 'Member'}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge()}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleSfx}
                title={sfxMuted ? 'Unmute game sounds' : 'Mute game sounds'}
                aria-label={sfxMuted ? 'Unmute game sounds' : 'Mute game sounds'}
                className="h-7 w-7 rounded-full border-border bg-card text-muted-foreground hover:text-foreground"
              >
                {sfxMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-primary" />}
              </Button>
              {canAdvancePhase &&
                (updatedSession.status === 'proposal_phase' ||
                  updatedSession.status === 'voting_phase') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleForceClose()}
                    disabled={forceClosing || loading}
                    className="h-7 rounded-full border-destructive/40 px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    {forceClosing ? 'Closing...' : 'Force close voting'}
                  </Button>
                )}
            </div>
          </div>

          {/* Party Game Players Ready Strip */}
          {(updatedSession.group?.members?.length || 0) > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {updatedSession.group?.members?.map((member, idx) => {
                const mId = member.profile.id;
                const mName = member.profile.username || 'Player';
                const isReady =
                  updatedSession.status === 'proposal_phase'
                    ? updatedSession.proposalConfirmations?.some((c) => c.userId === mId)
                    : updatedSession.status === 'voting_phase'
                      ? updatedSession.voteConfirmations?.some((c) => c.userId === mId)
                      : true;
                const avatarColors = [
                  'bg-primary text-primary-foreground',
                  'bg-secondary text-secondary-foreground',
                  'bg-amber-600 text-white',
                  'bg-emerald-600 text-white',
                ];
                return (
                  <div
                    key={mId}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition-all ${
                      isReady
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold uppercase ${
                        avatarColors[idx % avatarColors.length]
                      }`}
                    >
                      {mName.slice(0, 2)}
                    </span>
                    <span className="max-w-[90px] truncate">{mName}</span>
                    {isReady && (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold uppercase">
                        Ready
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3-Round Stepper */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { step: 1, label: '1. Swipe & Pool' },
              { step: 2, label: '2. Play Mode' },
              { step: 3, label: '3. Winner' },
            ].map((item) => {
              const isCurrent = activeStep === item.step;
              const isDone = activeStep > item.step;
              return (
                <div
                  key={item.step}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-semibold transition-colors ${
                    isCurrent
                      ? 'border-secondary/50 bg-secondary/10 text-secondary'
                      : isDone
                        ? 'border-primary/35 bg-primary/10 text-primary'
                        : 'border-border/70 bg-background/50 text-muted-foreground'
                  }`}
                >
                  {isDone && <CheckCircle className="h-3.5 w-3.5 shrink-0" />}
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Countdown & Players */}
          <div className="space-y-2">
            <Progress value={getPhaseProgress()} className="h-2" />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-secondary" />
                  {updatedSession.status === 'proposal_phase' && (
                    <VotingTimer endTime={updatedSession.proposalEndsAt} label="Pool closes in" />
                  )}
                  {updatedSession.status === 'voting_phase' && updatedSession.votingEndsAt && (
                    <VotingTimer endTime={updatedSession.votingEndsAt} label="Game ends in" />
                  )}
                  {updatedSession.status === 'completed' && updatedSession.completedAt && (
                    <span>Completed {formatArgentinaDateTime(updatedSession.completedAt)}</span>
                  )}
                </span>

                {updatedSession.status === 'proposal_phase' && updatedSession.votingEndsAt && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                    <Clock className="h-3 w-3 text-primary" />
                    <VotingTimer endTime={updatedSession.votingEndsAt} label="Total game" />
                  </span>
                )}
              </div>

              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                {updatedSession.group?.members?.length || 0} players
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-5 sm:p-6">
          {/* ROUND 1: SWIPE PERSONAL MATCHES + MANUAL ADD + POOL TRAY */}
          {updatedSession.status === 'proposal_phase' && (
            <div className="space-y-6">
              {/* Personalized Swipe Stage */}
              {canParticipate ? (
                <GroupSwipeMatch
                  groupId={updatedSession.groupId}
                  session={updatedSession}
                  onOpenManualAdd={() => {
                    setProposeModalTab('manual');
                    setShowProposeMeal(true);
                  }}
                  onAdvanceToGame={
                    canAdvancePhase
                      ? () => void handleStartVoting()
                      : () => void handleConfirmReadyForVoting()
                  }
                  advanceLabel={
                    canAdvancePhase
                      ? proposalCount > 0
                        ? `Next Stage: Pick a Game (${proposalCount})`
                        : 'Next Stage: Play with Random Dishes'
                      : hasUserConfirmedReady
                        ? 'Ready! Waiting for group...'
                        : "I'm Ready for Next Stage"
                  }
                  advancing={loading}
                />
              ) : (
                <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center text-sm text-muted-foreground">
                  Join this group to swipe dishes and participate in the game.
                </div>
              )}

              {/* Live Pool Tray + Advance Bar */}
              <div className="rounded-2xl border border-border bg-muted/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">
                        Current Game Pool ({proposalCount})
                      </h4>
                      {proposalCount === 0 && (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          Random fallback ready
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {proposalCount > 0
                        ? 'These dishes will load into Classic List and Meal Roulette.'
                        : 'No dishes picked yet. If you continue now, random compatible dishes will load automatically.'}
                    </p>
                  </div>

                  {canParticipate && (
                    <div className="flex flex-wrap items-center gap-2">
                      {!hasUserConfirmedReady ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleConfirmReadyForVoting}
                          disabled={loading}
                          className="rounded-xl border-primary/40 bg-card text-xs text-primary hover:bg-primary/10"
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          {loading ? 'Confirming...' : "I'm Ready"}
                        </Button>
                      ) : (
                        <Badge className="border border-primary/30 bg-primary/15 text-primary hover:bg-primary/15">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Ready
                        </Badge>
                      )}

                      {canAdvancePhase && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleStartVoting}
                          disabled={loading}
                          className="rounded-xl bg-secondary text-xs font-semibold text-secondary-foreground shadow-sm hover:bg-secondary/90"
                        >
                          {proposalCount > 0 ? (
                            <>
                              Choose Game Mode ({proposalCount})
                              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              <Shuffle className="mr-1.5 h-3.5 w-3.5" />
                              Play with Random Dishes
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pool Dish Chips */}
                {proposalCount > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-2 border-t border-border/60 pt-3.5">
                    {updatedSession.proposals.map((p) => (
                      <div
                        key={p.MealProposalID}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs shadow-sm"
                      >
                        <Flame className="h-3.5 w-3.5 text-secondary" />
                        <span className="font-semibold text-foreground">{p.meal.name}</span>
                        <span className="text-muted-foreground">
                          by {p.proposedBy?.username || 'Player'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ROUND 2: IMMERSIVE GAME MODE CHOOSER -> EXCLUSIVE ARENA */}
          {updatedSession.status === 'voting_phase' && (
            <div className="space-y-5">
              {/* Shared Round 2 Action HUD */}
              {canParticipate && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {arenaMode !== 'chooser' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setArenaMode('chooser')}
                        className="rounded-xl bg-card text-xs"
                      >
                        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                        Switch Game Mode
                      </Button>
                    )}

                    <span className="text-xs font-medium text-foreground sm:text-sm">
                      Voted on <span className="font-bold text-secondary">{userVoteCount}</span> of{' '}
                      {proposalCount} dishes
                    </span>

                    {!hasUserConfirmedVotes && userVoteCount > 0 && (
                      <Button
                        onClick={handleConfirmVotes}
                        size="sm"
                        disabled={loading}
                        className="rounded-xl bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                      >
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                        {loading ? 'Locking in...' : 'Lock In My Votes'}
                      </Button>
                    )}

                    {hasUserConfirmedVotes && (
                      <Badge className="border border-primary/30 bg-primary/15 text-primary hover:bg-primary/15">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Locked In
                      </Badge>
                    )}
                  </div>

                  {canAdvancePhase && (
                    <div className="flex flex-wrap gap-2">
                      {shouldShowEarlyCompletion() && (
                        <Button
                          onClick={() => setShowEarlyCompletion(true)}
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-primary/50 text-xs text-primary hover:bg-primary/10"
                        >
                          End Early
                        </Button>
                      )}
                      <Button
                        onClick={handleCompleteVoting}
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        className="rounded-xl border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
                      >
                        {loading ? 'Finishing...' : 'Crown Winner Now'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW A: IMMERSIVE MODE CHOOSER (NOT SIDE-BY-SIDE WIDGETS) */}
              {arenaMode === 'chooser' && (
                <div className="space-y-5 rounded-3xl border border-border bg-gradient-to-b from-muted/35 via-card to-card p-6 sm:p-8">
                  <div className="mx-auto max-w-lg text-center">
                    <Badge className="border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/10">
                      <Sparkles className="mr-1 h-3 w-3" />
                      {proposalCount} {proposalCount === 1 ? 'Dish' : 'Dishes'} Ready in the Pool
                    </Badge>
                    <h3 className="mt-2.5 text-2xl font-bold tracking-tight text-foreground">
                      Choose How to Vote
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Both modes use the same meal pool and sync live with everyone in the group.
                    </p>
                  </div>

                  {/* Pool Dish Preview Strip */}
                  {proposalCount > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {updatedSession.proposals.slice(0, 6).map((p) => (
                        <span
                          key={p.MealProposalID}
                          className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm"
                        >
                          {p.meal.name}
                        </span>
                      ))}
                      {proposalCount > 6 && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          +{proposalCount - 6} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Two Exclusive Game Portals */}
                  <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setArenaMode('classic')}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary hover:shadow-md"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-secondary/10 transition-transform group-hover:scale-125"
                      />
                      <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                          <ListChecks className="h-6 w-6" />
                        </div>
                        <h4 className="mt-4 text-xl font-bold text-foreground">
                          Classic List Vote
                        </h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          Compare dishes side by side, check calories and ingredients, and vote for your favorites.
                        </p>
                      </div>

                      <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-secondary">
                        Open Classic List
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setArenaMode('roulette')}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-border bg-card p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 transition-transform group-hover:scale-125"
                      />
                      <div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                          <Dices className="h-6 w-6" />
                        </div>
                        <h4 className="mt-4 text-xl font-bold text-foreground">
                          Meal Roulette Wheel
                        </h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          Load the pool onto an interactive spinning wheel, test your luck, and lock in your vote where it stops!
                        </p>
                      </div>

                      <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                        Enter Roulette Arena
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW B: EXCLUSIVE CLASSIC LIST ARENA */}
              {arenaMode === 'classic' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Classic List Arena · {proposalCount} Dishes in Play
                    </h4>
                  </div>
                  <div className="space-y-2.5">
                    {updatedSession.proposals?.map((proposal) => (
                      <MealProposalCard
                        key={proposal.MealProposalID}
                        proposal={proposal}
                        canVote={canParticipate}
                        isProposalPhase={false}
                        hasUserVoted={hasUserVoted(proposal)}
                        onVote={() => handleVote(proposal.MealProposalID)}
                        onUndoVote={() => handleUndoVote(proposal.MealProposalID)}
                        disabled={loading}
                        groupRestrictions={groupRestrictions}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW C: EXCLUSIVE MEAL ROULETTE ARENA */}
              {arenaMode === 'roulette' && (
                <GroupMealRoulette
                  groupId={updatedSession.groupId}
                  session={updatedSession}
                  onVoteProposal={handleVote}
                  onUndoVoteProposal={handleUndoVote}
                  onRouletteWinner={handleRouletteWin}
                />
              )}
            </div>
          )}

          {/* ROUND 3: WINNER PODIUM & FINAL STANDINGS */}
          {updatedSession.status === 'completed' && (
            <div className="space-y-5">
              {updatedSession.winnerMeal && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                        <Trophy className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                          Winning Meal
                        </p>
                        <h4 className="text-lg font-bold text-foreground">
                          {updatedSession.winnerMeal.name}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setShowResultsModal(true)}
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-amber-600/40 bg-card text-foreground hover:bg-muted"
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                        Full Podium
                      </Button>
                      <Button
                        onClick={clearSession}
                        size="sm"
                        className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        New Game
                      </Button>
                    </div>
                  </div>
                  {updatedSession.winnerMeal.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {updatedSession.winnerMeal.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs font-medium text-muted-foreground">
                    Total votes cast: {updatedSession.totalVotes}
                  </p>
                </div>
              )}

              {proposalCount > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Final Standings ({proposalCount})
                  </h4>
                  {updatedSession.proposals?.map((proposal) => (
                    <MealProposalCard
                      key={proposal.MealProposalID}
                      proposal={proposal}
                      canVote={false}
                      isProposalPhase={false}
                      hasUserVoted={hasUserVoted(proposal)}
                      onVote={() => {}}
                      disabled={true}
                      groupRestrictions={groupRestrictions}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>

        <ProposeMealModal
          isOpen={showProposeMeal}
          onClose={() => setShowProposeMeal(false)}
          onPropose={handleProposeMeal}
          groupId={updatedSession.groupId}
          session={updatedSession}
          initialTab={proposeModalTab}
        />

        <EarlyCompletionModal
          isOpen={showEarlyCompletion}
          onClose={() => setShowEarlyCompletion(false)}
          onConfirm={handleEarlyCompleteVoting}
          onContinue={() => setShowEarlyCompletion(false)}
          session={updatedSession}
          loading={loading}
        />
      </Card>
    </>
  );
}
