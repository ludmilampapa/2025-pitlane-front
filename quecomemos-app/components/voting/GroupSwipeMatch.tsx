'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Flame, Heart, ListChecks, RotateCcw, Utensils, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/config/api';
import { useUser } from '@/lib/contexts/UserContext';
import { useVoting } from '@/lib/contexts/VotingContext';
import { VotingService } from './VotingService';
import { StartVotingButton } from './StartVotingButton';
import type { VotingSession } from './types';
import type { Group } from '@/components/groups';

interface MatchMeal {
  MealID: number;
  name: string;
  description: string | null;
  svgLink?: string;
  mealFoods: Array<{ quantity: number; food: { kCal: number; name: string; dietaryRestrictions?: Array<{ name: string }> } }>;
  profile?: { id: string; username: string };
}

interface FilteredMealsResponse {
  availableMeals: MatchMeal[];
  appliedRestrictions: Array<{ DietaryRestrictionID: number; name: string }>;
}

interface GroupSwipeMatchProps {
  groupId: number;
  group?: Group;
  session: VotingSession | null;
  onSessionStarted?: () => void;
  onSwitchToClassic?: () => void;
  onFinished?: () => void;
}

export function GroupSwipeMatch({
  groupId,
  group,
  session,
  onSessionStarted,
  onSwitchToClassic,
  onFinished,
}: GroupSwipeMatchProps) {
  const { userData } = useUser();
  const { refreshSession } = useVoting();
  const profileId = userData?.profile?.id;

  const [meals, setMeals] = useState<MatchMeal[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finishedMembers, setFinishedMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function loadCompatibleMeals() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/consumptions/groups/${groupId}/filtered-meals`);
        if (!response.ok) throw new Error('Could not load group-compatible meals.');
        const data = (await response.json()) as FilteredMealsResponse;
        if (!cancelled) setMeals(data.availableMeals || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCompatibleMeals();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const proposedMealIds = useMemo(
    () => new Set((session?.proposals || []).map((p) => p.mealId)),
    [session?.proposals],
  );

  const availableToSwipe = useMemo(() => {
    if (session?.status === 'proposal_phase') {
      return meals.filter((meal) => !proposedMealIds.has(meal.MealID));
    }
    return meals;
  }, [meals, proposedMealIds, session?.status]);

  const currentMeal = availableToSwipe[index] ?? availableToSwipe[0] ?? null;

  const restrictions = useMemo(() => {
    if (!currentMeal) return [];
    const names = new Set<string>();
    currentMeal.mealFoods.forEach((mealFood) => {
      mealFood.food.dietaryRestrictions?.forEach((restriction) => names.add(restriction.name));
    });
    return Array.from(names);
  }, [currentMeal]);

  const calories =
    currentMeal?.mealFoods.reduce((total, mealFood) => total + mealFood.quantity * mealFood.food.kCal, 0) ?? 0;

  const members = session?.group.members || group?.members || [];
  const isSessionActive = Boolean(
    session && (session.status === 'proposal_phase' || session.status === 'voting_phase'),
  );

  const finishSwiping = () => {
    if (profileId) {
      setFinishedMembers((current) => new Set(current).add(profileId));
    }
    toast.success('Swipe Match complete!', {
      description: 'Your preferences have been recorded for the group session.',
    });
    onFinished?.();
  };

  const handlePass = () => {
    if (index + 1 >= availableToSwipe.length) {
      finishSwiping();
      return;
    }
    setIndex((current) => current + 1);
  };

  const handleLike = async () => {
    if (!currentMeal || submitting) return;

    try {
      if (!session || !isSessionActive) {
        toast.info('Start a voting session first', {
          description: 'Click "Start Group Vote" above so your swipes count toward the group vote.',
        });
        return;
      }

      if (!profileId) {
        throw new Error('You must be signed in to vote.');
      }

      setSubmitting(true);

      if (session.status === 'proposal_phase') {
        await VotingService.proposeMeal(session.VotingSessionID, {
          mealId: currentMeal.MealID,
          proposedById: profileId,
        });
        toast.success('Meal proposed!', {
          description: `"${currentMeal.name}" was added to the group proposals.`,
        });
      } else if (session.status === 'voting_phase') {
        const existingProposal = session.proposals.find((proposal) => proposal.mealId === currentMeal.MealID);
        if (!existingProposal) {
          await VotingService.proposeMeal(session.VotingSessionID, {
            mealId: currentMeal.MealID,
            proposedById: profileId,
          });
        }

        const refreshedSession = await VotingService.getVotingSession(session.VotingSessionID);
        const proposal = refreshedSession.proposals.find((item) => item.mealId === currentMeal.MealID);
        if (!proposal) throw new Error('Proposal is not available yet.');

        await VotingService.castVote(session.VotingSessionID, {
          mealProposalId: proposal.MealProposalID,
          voterId: profileId,
          voteType: 'up',
        });
        toast.success('Vote recorded!', {
          description: `You voted for "${currentMeal.name}".`,
        });
      }

      await refreshSession();
      if (index + 1 >= availableToSwipe.length) {
        finishSwiping();
      } else if (session.status !== 'proposal_phase') {
        setIndex((current) => current + 1);
      }
    } catch (err) {
      toast.error('Could not record your choice', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-border bg-card">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Banner if no active session yet */}
      {!isSessionActive && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">No active voting session yet</p>
              <p className="text-xs text-muted-foreground">
                You can preview compatible meals below, or start a session now so your swipes count as proposals and votes.
              </p>
            </div>
            {group && (
              <StartVotingButton
                group={group}
                onVotingStarted={onSessionStarted}
                className="shrink-0"
              />
            )}
          </CardContent>
        </Card>
      )}

      {!currentMeal ? (
        <Card className="border border-dashed border-border bg-card">
          <CardContent className="flex min-h-[380px] flex-col items-center justify-center p-8 text-center">
            <Utensils className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-bold text-foreground">
              {meals.length === 0 ? 'No compatible meals found' : 'You reviewed all options!'}
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {meals.length === 0
                ? 'Add meals that match your group dietary restrictions to use Swipe Match.'
                : 'Your choices have been saved for the group voting session.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {meals.length > 0 && (
                <Button variant="outline" onClick={() => setIndex(0)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
              )}
              {onSwitchToClassic && (
                <Button onClick={onSwitchToClassic}>
                  <ListChecks className="mr-2 h-4 w-4" />
                  View Live Tally
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Quick Swipe Match
                </p>
                {isSessionActive && session && (
                  <Badge variant="secondary" className="text-[11px]">
                    {session.status === 'proposal_phase' ? 'Proposal Phase' : 'Voting Phase'}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {Math.min(index + 1, availableToSwipe.length)} of {availableToSwipe.length} compatible options left to propose
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {members.slice(0, 5).map((member) => {
                  const done = finishedMembers.has(member.profile.id);
                  return (
                    <div
                      key={member.profile.id}
                      title={member.profile.username}
                      className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-card bg-secondary text-xs font-bold text-secondary-foreground"
                    >
                      {(member.profile.username || 'U').slice(0, 2).toUpperCase()}
                      {done && (
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {onSwitchToClassic && isSessionActive && (
                <Button variant="outline" size="sm" onClick={onSwitchToClassic} className="hidden sm:inline-flex">
                  <ListChecks className="mr-1.5 h-4 w-4" />
                  Live Tally
                </Button>
              )}
            </div>
          </div>

          <Card className="mx-auto max-w-xl overflow-hidden border-border bg-card shadow-md">
            <CardContent className="p-0">
              <div className="relative flex h-72 items-center justify-center bg-muted/50">
                {currentMeal.svgLink ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentMeal.svgLink} alt={currentMeal.name} className="h-full w-full object-cover" />
                ) : (
                  <Utensils className="h-16 w-16 text-muted-foreground/50" />
                )}
                <Badge className="absolute right-4 top-4 border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 backdrop-blur-sm">
                  100% Group Safe
                </Badge>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{currentMeal.name}</h2>
                  {currentMeal.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{currentMeal.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{Math.round(calories)} kcal</Badge>
                  {restrictions.length > 0 ? (
                    restrictions.map((restriction) => (
                      <Badge
                        key={restriction}
                        className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      >
                        {restriction} Free
                      </Badge>
                    ))
                  ) : (
                    <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Safe for Everyone
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={handlePass}
                    disabled={submitting}
                    className="h-14 rounded-2xl text-muted-foreground hover:text-foreground"
                  >
                    <X className="mr-2 h-5 w-5" />
                    Pass
                  </Button>
                  <Button
                    onClick={() => void handleLike()}
                    disabled={submitting || !isSessionActive}
                    className="h-14 rounded-2xl bg-[#C85A32] text-white shadow-sm hover:bg-[#B84F2B] disabled:opacity-50"
                  >
                    <Heart className="mr-2 h-5 w-5 fill-current" />
                    {session?.status === 'proposal_phase' ? 'Propose' : 'Like'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
