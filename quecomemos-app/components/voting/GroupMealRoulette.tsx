'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Dices, ListChecks, RefreshCw, Shuffle, Utensils } from 'lucide-react';
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

interface RouletteMeal {
  MealID: number;
  name: string;
  description?: string | null;
  calories?: number;
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
}

const SLICE_COLORS = [
  '#C85A32',
  '#4A7C59',
  '#D97706',
  '#2563EB',
  '#7C3AED',
  '#0D9488',
  '#DB2777',
  '#65A30D',
  '#EA580C',
  '#4F46E5',
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
  group,
  session,
  onSessionStarted,
  onSwitchToClassic,
}: GroupMealRouletteProps) {
  const { userData } = useUser();
  const { refreshSession } = useVoting();
  const profileId = userData?.profile?.id;

  const [compatibleMeals, setCompatibleMeals] = useState<RouletteMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'compatible' | 'proposals'>('compatible');
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<RouletteMeal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCompatibleMeals() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/consumptions/groups/${groupId}/filtered-meals`);
        if (!res.ok) throw new Error('Could not load group-compatible meals.');
        const data = (await res.json()) as { availableMeals?: FilteredMealsApiItem[] };
        const mapped: RouletteMeal[] = (data.availableMeals || []).map((meal) => ({
          MealID: meal.MealID,
          name: meal.name,
          description: meal.description,
          calories: meal.mealFoods.reduce((sum, mf) => sum + mf.quantity * mf.food.kCal, 0),
        }));
        if (!cancelled) setCompatibleMeals(mapped);
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

  const proposalMeals = useMemo<RouletteMeal[]>(() => {
    if (!session?.proposals?.length) return [];
    return session.proposals.map((p) => ({
      MealID: p.mealId,
      name: p.meal?.name || `Meal #${p.mealId}`,
      description: p.meal?.description,
    }));
  }, [session?.proposals]);

  const hasEnoughProposals = proposalMeals.length >= 2;
  const activeSource = source === 'proposals' && hasEnoughProposals ? 'proposals' : 'compatible';

  const wheelMeals = useMemo(() => {
    const base = activeSource === 'proposals' ? proposalMeals : compatibleMeals;
    if (base.length <= MAX_SLICES) return base;
    // Deterministic slice rotation based on shuffleSeed
    const copy = [...base];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = (i * 7 + shuffleSeed * 13) % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, MAX_SLICES);
  }, [activeSource, compatibleMeals, proposalMeals, shuffleSeed]);

  const isSessionActive = Boolean(
    session && (session.status === 'proposal_phase' || session.status === 'voting_phase'),
  );

  const handleSpin = () => {
    if (spinning || wheelMeals.length === 0) return;

    const chosenIndex = Math.floor(Math.random() * wheelMeals.length);
    const sliceAngle = 360 / wheelMeals.length;
    // Center of chosen slice in wheel coordinates (0 deg is at top / 12 o'clock)
    const sliceCenter = chosenIndex * sliceAngle + sliceAngle / 2;
    // Pointer is at 0 deg (top), so we rotate clockwise so sliceCenter lands at 0 deg
    const targetMod = (360 - sliceCenter) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = (targetMod - currentMod + 360) % 360;
    const extraSpins = (5 + Math.floor(Math.random() * 2)) * 360;

    setSpinning(true);
    setWinner(null);
    setRotation((prev) => prev + extraSpins + delta);

    window.setTimeout(() => {
      setSpinning(false);
      setWinner(wheelMeals[chosenIndex]);
    }, 4100);
  };

  const handleCommitWinner = async () => {
    if (!winner || submitting) return;

    if (!session || !isSessionActive) {
      toast.info('Start a voting session first', {
        description: 'Click "Start Group Vote" above to propose or vote for the winning meal.',
      });
      return;
    }

    if (!profileId) {
      toast.error('You must be signed in to vote.');
      return;
    }

    setSubmitting(true);
    try {
      if (session.status === 'proposal_phase') {
        await VotingService.proposeMeal(session.VotingSessionID, {
          mealId: winner.MealID,
          proposedById: profileId,
        });
        toast.success('Meal proposed!', {
          description: `"${winner.name}" was added to the group proposals.`,
        });
      } else if (session.status === 'voting_phase') {
        const existingProposal = session.proposals.find((p) => p.mealId === winner.MealID);
        if (!existingProposal) {
          await VotingService.proposeMeal(session.VotingSessionID, {
            mealId: winner.MealID,
            proposedById: profileId,
          });
        }
        const refreshed = await VotingService.getVotingSession(session.VotingSessionID);
        const proposal = refreshed.proposals.find((p) => p.mealId === winner.MealID);
        if (!proposal) throw new Error('Proposal is not available yet.');

        await VotingService.castVote(session.VotingSessionID, {
          mealProposalId: proposal.MealProposalID,
          voterId: profileId,
          voteType: 'up',
        });
        toast.success('Vote recorded!', {
          description: `You voted for "${winner.name}".`,
        });
      }

      await refreshSession();
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

  const sliceAngle = wheelMeals.length > 0 ? 360 / wheelMeals.length : 360;

  return (
    <div className="space-y-4">
      {!isSessionActive && (
        <Card className="border-amber-500/40 bg-amber-500/10">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">No active voting session yet</p>
              <p className="text-xs text-muted-foreground">
                Spin the wheel for fun now, or start a session so you can propose or vote for the result immediately.
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

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Dices className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Meal Roulette
            </p>
            {isSessionActive && session && (
              <Badge variant="secondary" className="text-[11px]">
                {session.status === 'proposal_phase' ? 'Proposal Phase' : 'Voting Phase'}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {wheelMeals.length} {activeSource === 'proposals' ? 'proposed' : 'group-safe'} meals on the wheel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasEnoughProposals && (
            <div className="flex rounded-lg border border-border bg-muted/50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSource('proposals');
                  setWinner(null);
                }}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  activeSource === 'proposals'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Proposals ({proposalMeals.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSource('compatible');
                  setWinner(null);
                }}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  activeSource === 'compatible'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Safe ({compatibleMeals.length})
              </button>
            </div>
          )}

          {activeSource === 'compatible' && compatibleMeals.length > MAX_SLICES && (
            <Button
              variant="outline"
              size="sm"
              disabled={spinning}
              onClick={() => {
                setShuffleSeed((s) => s + 1);
                setWinner(null);
              }}
            >
              <Shuffle className="mr-1.5 h-3.5 w-3.5" />
              Shuffle
            </Button>
          )}

          {onSwitchToClassic && isSessionActive && (
            <Button variant="outline" size="sm" onClick={onSwitchToClassic}>
              <ListChecks className="mr-1.5 h-4 w-4" />
              Live Tally
            </Button>
          )}
        </div>
      </div>

      {wheelMeals.length === 0 ? (
        <Card className="border border-dashed border-border bg-card">
          <CardContent className="flex min-h-[340px] flex-col items-center justify-center p-8 text-center">
            <Utensils className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-bold text-foreground">No compatible meals found</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Add meals that match your group&apos;s dietary restrictions to spin the Meal Roulette.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex flex-col items-center gap-6 p-6">
            {/* Wheel Container */}
            <div className="relative flex items-center justify-center">
              {/* Top Pointer */}
              <div className="pointer-events-none absolute -top-2 z-10 flex flex-col items-center">
                <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-foreground drop-shadow" />
              </div>

              <div
                className="relative h-72 w-72 sm:h-80 sm:w-80"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none',
                }}
              >
                <svg viewBox="0 0 320 320" className="h-full w-full drop-shadow-md">
                  {wheelMeals.length === 1 ? (
                    <circle cx="160" cy="160" r="152" fill={SLICE_COLORS[0]} stroke="#ffffff" strokeWidth="2" />
                  ) : (
                    wheelMeals.map((meal, idx) => {
                      const start = idx * sliceAngle;
                      const end = start + sliceAngle;
                      const mid = start + sliceAngle / 2;
                      const labelRadius = 100;
                      const labelPos = polarToCartesian(160, 160, labelRadius, mid);
                      const shortName = meal.name.length > 14 ? `${meal.name.slice(0, 13)}…` : meal.name;

                      return (
                        <g key={meal.MealID}>
                          <path
                            d={describeSlice(160, 160, 152, start, end)}
                            fill={SLICE_COLORS[idx % SLICE_COLORS.length]}
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                          <text
                            x={labelPos.x}
                            y={labelPos.y}
                            fill="#ffffff"
                            fontSize={wheelMeals.length > 8 ? '10' : '11.5'}
                            fontWeight="600"
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
                  <circle cx="160" cy="160" r="24" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="3" />
                  <circle cx="160" cy="160" r="8" fill="#C85A32" />
                </svg>
              </div>
            </div>

            {/* Spin Button */}
            <Button
              size="lg"
              onClick={handleSpin}
              disabled={spinning}
              className="h-12 rounded-xl bg-[#C85A32] px-8 text-base font-semibold text-white hover:bg-[#B84F2B]"
            >
              <Dices className={`mr-2 h-5 w-5 ${spinning ? 'animate-spin' : ''}`} />
              {spinning ? 'Spinning...' : winner ? 'Spin Again' : 'Spin the Wheel'}
            </Button>

            {/* Result Card */}
            {winner && !spinning && (
              <div className="w-full max-w-md rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                  The Wheel Chose
                </p>
                <h3 className="mt-1 text-2xl font-bold text-foreground">{winner.name}</h3>
                {winner.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{winner.description}</p>
                )}
                {typeof winner.calories === 'number' && winner.calories > 0 && (
                  <div className="mt-2">
                    <Badge variant="secondary">{Math.round(winner.calories)} kcal</Badge>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleSpin} disabled={submitting}>
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    Spin Again
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleCommitWinner()}
                    disabled={submitting || !isSessionActive}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    {session?.status === 'proposal_phase' ? 'Propose This Meal' : 'Vote for This Meal'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
