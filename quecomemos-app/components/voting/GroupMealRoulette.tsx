'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Dices,
  Flame,
  RefreshCw,
  Shuffle,
  Sparkles,
  ThumbsUp,
  Undo2,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/config/api';
import { useUser } from '@/lib/contexts/UserContext';
import { useVoting } from '@/lib/contexts/VotingContext';
import { isMealCompatibleWithRestrictions } from '@/lib/utils/dietaryCompatibility';
import { VotingService } from './VotingService';
import type { VotingSession } from './types';
import type { Group } from '@/components/groups';

interface RouletteMeal {
  MealID: number;
  proposalId?: number;
  name: string;
  description?: string | null;
  calories?: number;
  voteCount?: number;
  hasUserVoted?: boolean;
}

interface FilteredMealsApiItem {
  MealID: number;
  name: string;
  description: string | null;
  mealFoods: Array<{ quantity: number; food: { kCal: number } }>;
}

interface GroupMealRouletteProps {
  groupId: number;
  group?: Group;
  session: VotingSession | null;
  onSessionStarted?: () => void;
  onSwitchToClassic?: () => void;
  onVoteProposal?: (proposalId: number) => Promise<void> | void;
  onUndoVoteProposal?: (proposalId: number) => Promise<void> | void;
}

const SLICE_COLORS = [
  '#C85A32',
  '#4A7C59',
  '#D97706',
  '#2F6F62',
  '#9A4A2E',
  '#5A8A68',
  '#B85D3B',
  '#3D6B7D',
  '#C27D38',
  '#6E5A7D',
];

const MAX_SLICES = 10;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export function GroupMealRoulette({
  groupId,
  session,
  onVoteProposal,
  onUndoVoteProposal,
}: GroupMealRouletteProps) {
  const { userData } = useUser();
  const { refreshSession } = useVoting();
  const profileId = userData?.profile?.id;

  const [randomFallbackMeals, setRandomFallbackMeals] = useState<RouletteMeal[]>([]);
  const [loadingFallback, setLoadingFallback] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(1);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winnerMealId, setWinnerMealId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const proposalMeals = useMemo<RouletteMeal[]>(() => {
    if (!session?.proposals?.length) return [];
    return session.proposals.map((p) => ({
      MealID: p.mealId,
      proposalId: p.MealProposalID,
      name: p.meal?.name || `Meal #${p.mealId}`,
      description: p.meal?.description,
      calories:
        p.meal?.mealFoods?.reduce((sum, mf) => sum + mf.quantity * mf.food.kCal, 0) || 0,
      voteCount: p.voteCount,
      hasUserVoted:
        Boolean(profileId) &&
        (p.votes || []).some((v) => v.voterId === profileId && v.isActive),
    }));
  }, [session?.proposals, profileId]);

  // Load random fallback dishes only when the session has 0 proposals
  useEffect(() => {
    if (proposalMeals.length > 0) return;

    let cancelled = false;
    async function loadRandomFallback() {
      setLoadingFallback(true);
      try {
        const [allRes, dietRes] = await Promise.all([
          fetch(`${API_BASE_URL}/meals/all`),
          fetch(`${API_BASE_URL}/groups/${groupId}/dietary-info`).catch(() => null),
        ]);
        let requiredItems: Array<{ DietaryRestrictionID: number; name: string }> = [];
        if (dietRes && dietRes.ok) {
          const dData = (await dietRes.json()) as {
            dietaryRestrictions?: Array<{ DietaryRestrictionID: number; name: string }>;
          };
          requiredItems = (dData.dietaryRestrictions || []).filter(
            (r) => r.DietaryRestrictionID !== 0 && !r.name.toLowerCase().includes('everyone')
          );
        }

        const rawMeals: Array<
          FilteredMealsApiItem & {
            mealFoods: Array<{
              quantity: number;
              food: {
                name?: string;
                kCal: number;
                dietaryRestrictions?: Array<{ DietaryRestrictionID?: number; name?: string }>;
              };
            }>;
          }
        > = allRes.ok ? await allRes.json() : [];

        const compatible = rawMeals.filter((m) =>
          isMealCompatibleWithRestrictions(m, requiredItems)
        );

        const mapped: RouletteMeal[] = compatible.map((meal) => ({
          MealID: meal.MealID,
          name: meal.name,
          description: meal.description,
          calories: (meal.mealFoods || []).reduce(
            (sum, mf) => sum + mf.quantity * mf.food.kCal,
            0
          ),
        }));
        if (!cancelled) setRandomFallbackMeals(mapped);
      } catch {
        if (!cancelled) setRandomFallbackMeals([]);
      } finally {
        if (!cancelled) setLoadingFallback(false);
      }
    }

    void loadRandomFallback();
    return () => {
      cancelled = true;
    };
  }, [groupId, proposalMeals.length]);

  const usingProposals = proposalMeals.length > 0;

  const wheelMeals = useMemo(() => {
    const base = usingProposals ? proposalMeals : randomFallbackMeals;
    if (base.length <= 1) return base;
    const copy = [...base];
    // Deterministic shuffle when shuffleSeed > 1 or when using random fallback
    if (!usingProposals || shuffleSeed > 1) {
      for (let i = copy.length - 1; i > 0; i--) {
        const j = (i * 7 + shuffleSeed * 13) % (i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
    }
    return copy.slice(0, MAX_SLICES);
  }, [usingProposals, proposalMeals, randomFallbackMeals, shuffleSeed]);

  const winner = useMemo(
    () => (winnerMealId !== null ? wheelMeals.find((m) => m.MealID === winnerMealId) || null : null),
    [wheelMeals, winnerMealId]
  );

  const handleSpin = () => {
    if (spinning || wheelMeals.length === 0) return;

    const chosenIndex = Math.floor(Math.random() * wheelMeals.length);
    const sliceAngle = 360 / wheelMeals.length;
    const sliceCenter = chosenIndex * sliceAngle + sliceAngle / 2;
    const targetMod = (360 - sliceCenter) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = (targetMod - currentMod + 360) % 360;
    const extraSpins = (5 + Math.floor(Math.random() * 2)) * 360;

    setSpinning(true);
    setWinnerMealId(null);
    setRotation((prev) => prev + extraSpins + delta);

    const chosenMealId = wheelMeals[chosenIndex].MealID;
    window.setTimeout(() => {
      setSpinning(false);
      setWinnerMealId(chosenMealId);
    }, 3800);
  };

  const handleVoteWinner = async () => {
    if (!winner || submitting) return;

    if (!session || !profileId) {
      toast.error('Please join an active voting session to lock in your vote.');
      return;
    }

    setSubmitting(true);
    try {
      if (winner.proposalId) {
        if (winner.hasUserVoted) {
          if (onUndoVoteProposal) {
            await onUndoVoteProposal(winner.proposalId);
          } else {
            await VotingService.undoVote(session.VotingSessionID, winner.proposalId, profileId);
            await refreshSession();
          }
        } else if (onVoteProposal) {
          await onVoteProposal(winner.proposalId);
        } else {
          await VotingService.castVote(session.VotingSessionID, {
            mealProposalId: winner.proposalId,
            voterId: profileId,
            voteType: 'up',
          });
          toast.success(`Voted for "${winner.name}"!`);
          await refreshSession();
        }
      } else if (session.status === 'proposal_phase') {
        await VotingService.proposeMeal(session.VotingSessionID, {
          mealId: winner.MealID,
          proposedById: profileId,
        });
        toast.success(`Proposed "${winner.name}"!`);
        await refreshSession();
      }
    } catch (err) {
      toast.error('Could not record your vote', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingFallback && wheelMeals.length === 0) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-muted/20">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (wheelMeals.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <Utensils className="h-10 w-10 text-muted-foreground" />
        <h3 className="mt-3 text-lg font-bold text-foreground">No dishes available</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Create at least one meal in the catalog to load the Meal Roulette wheel.
        </p>
      </div>
    );
  }

  const sliceAngle = 360 / wheelMeals.length;

  return (
    <div className="space-y-5">
      {/* Arena Subheader */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-primary/30 bg-primary/15 text-primary hover:bg-primary/15">
            <Sparkles className="mr-1 h-3 w-3" />
            {usingProposals ? `${wheelMeals.length} Pool Dishes Loaded` : `${wheelMeals.length} Random Dishes Loaded`}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Spin the wheel and vote where the pointer lands!
          </span>
        </div>

        {wheelMeals.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={spinning}
            onClick={() => {
              setShuffleSeed((s) => s + 1);
              setWinnerMealId(null);
            }}
            className="rounded-xl text-xs"
          >
            <Shuffle className="mr-1.5 h-3.5 w-3.5" />
            Shuffle Slices
          </Button>
        )}
      </div>

      {/* Interactive Wheel Stage */}
      <div className="grid grid-cols-1 items-center gap-6 rounded-3xl border border-border bg-gradient-to-b from-muted/30 via-card to-card p-6 lg:grid-cols-12">
        <div className="flex flex-col items-center gap-5 lg:col-span-7">
          <div className="relative flex items-center justify-center">
            {/* Pointer */}
            <div className="pointer-events-none absolute -top-2.5 z-10 flex flex-col items-center">
              <div className="h-0 w-0 border-l-[13px] border-r-[13px] border-t-[22px] border-l-transparent border-r-transparent border-t-secondary drop-shadow-md" />
            </div>

            <div
              className="relative h-72 w-72 sm:h-80 sm:w-80"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? 'transform 3.8s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none',
              }}
            >
              <svg viewBox="0 0 320 320" className="h-full w-full drop-shadow-lg">
                {wheelMeals.length === 1 ? (
                  <>
                    <circle
                      cx="160"
                      cy="160"
                      r="152"
                      fill={SLICE_COLORS[0]}
                      stroke="#ffffff"
                      strokeWidth="3"
                    />
                    <text
                      x="160"
                      y="95"
                      fill="#ffffff"
                      fontSize="14"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {wheelMeals[0].name.slice(0, 20)}
                    </text>
                  </>
                ) : (
                  wheelMeals.map((meal, idx) => {
                    const start = idx * sliceAngle;
                    const end = start + sliceAngle;
                    const mid = start + sliceAngle / 2;
                    const labelPos = polarToCartesian(160, 160, 100, mid);
                    const shortName =
                      meal.name.length > 14 ? `${meal.name.slice(0, 13)}…` : meal.name;

                    return (
                      <g key={meal.MealID}>
                        <path
                          d={describeSlice(160, 160, 152, start, end)}
                          fill={SLICE_COLORS[idx % SLICE_COLORS.length]}
                          stroke="#ffffff"
                          strokeWidth="2.5"
                        />
                        <text
                          x={labelPos.x}
                          y={labelPos.y}
                          fill="#ffffff"
                          fontSize={wheelMeals.length > 7 ? '10' : '11.5'}
                          fontWeight="700"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${mid - 90}, ${labelPos.x}, ${labelPos.y})`}
                        >
                          {shortName}
                        </text>
                      </g>
                    );
                  })
                )}
                <circle
                  cx="160"
                  cy="160"
                  r="26"
                  fill="var(--card)"
                  stroke="var(--border)"
                  strokeWidth="3"
                />
                <circle cx="160" cy="160" r="9" fill="#C85A32" />
              </svg>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleSpin}
            disabled={spinning}
            className="h-12 rounded-2xl bg-secondary px-9 text-base font-bold text-secondary-foreground shadow-md transition-all hover:bg-secondary/90"
          >
            <Dices className={`mr-2 h-5 w-5 ${spinning ? 'animate-spin' : ''}`} />
            {spinning ? 'Spinning the Wheel...' : winner ? 'Spin Again' : 'Spin the Wheel!'}
          </Button>
        </div>

        {/* Right Column: Result / Live Wheel Pool */}
        <div className="space-y-4 lg:col-span-5">
          {winner && !spinning ? (
            <div className="rounded-2xl border border-secondary/40 bg-secondary/10 p-5 shadow-sm">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-secondary">
                <CheckCircle2 className="h-3.5 w-3.5" />
                The Pointer Landed On
              </span>
              <h3 className="mt-1.5 text-xl font-bold text-foreground">{winner.name}</h3>
              {winner.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {winner.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {typeof winner.calories === 'number' && winner.calories > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Flame className="mr-1 h-3 w-3 text-secondary" />
                    {Math.round(winner.calories)} kcal
                  </Badge>
                )}
                {typeof winner.voteCount === 'number' && (
                  <Badge variant="outline" className="bg-card text-xs">
                    <ThumbsUp className="mr-1 h-3 w-3 text-primary" />
                    {winner.voteCount} {winner.voteCount === 1 ? 'vote' : 'votes'}
                  </Badge>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => void handleVoteWinner()}
                  disabled={submitting}
                  className={
                    winner.hasUserVoted
                      ? 'flex-1 rounded-xl border border-primary/40 bg-card text-primary hover:bg-primary/10'
                      : 'flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90'
                  }
                >
                  {winner.hasUserVoted ? (
                    <>
                      <Undo2 className="mr-1.5 h-4 w-4" />
                      Voted ✓ (Undo)
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="mr-1.5 h-4 w-4" />
                      {submitting ? 'Voting...' : 'Vote for This Dish'}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSpin}
                  disabled={submitting}
                  className="rounded-xl"
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Respin
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center">
              <Dices className="mx-auto mb-2 h-8 w-8 text-secondary/70" />
              <p className="text-sm font-semibold text-foreground">
                {spinning ? 'Watching the wheel...' : 'Hit "Spin the Wheel!"'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Let fate pick from the pool, then lock in your vote with one tap.
              </p>
            </div>
          )}

          {/* Compact Slice Standings */}
          <div className="space-y-1.5 rounded-2xl border border-border bg-card p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Dishes on the Wheel
            </p>
            <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {wheelMeals.map((meal, idx) => (
                <div
                  key={meal.MealID}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/25 px-3 py-1.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length] }}
                    />
                    <span className="truncate font-medium text-foreground">{meal.name}</span>
                  </div>
                  {typeof meal.voteCount === 'number' && (
                    <span
                      className={`shrink-0 font-semibold ${
                        meal.hasUserVoted ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {meal.voteCount} 👍
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
