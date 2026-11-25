'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Flame,
  Heart,
  Leaf,
  Plus,
  RotateCcw,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/lib/config/api';
import { useUser } from '@/lib/contexts/UserContext';
import { useVoting } from '@/lib/contexts/VotingContext';
import {
  isMealCompatibleWithRestrictions,
  type RestrictionItem,
} from '@/lib/utils/dietaryCompatibility';
import { VotingService } from './VotingService';
import type { VotingSession } from './types';
import type { Group } from '@/components/groups';

interface FoodTag {
  PreferenceID?: number;
  DietaryRestrictionID?: number;
  name?: string;
}

interface SwipeMeal {
  MealID: number;
  name: string;
  description?: string | null;
  svgLink?: string;
  mealFoods: Array<{
    quantity: number;
    food: {
      FoodID?: number;
      kCal: number;
      name: string;
      dietaryRestrictions?: FoodTag[];
      preferences?: FoodTag[];
    };
  }>;
  profile?: { id: string; username?: string };
}

interface GroupSwipeMatchProps {
  groupId: number;
  group?: Group;
  session: VotingSession | null;
  onSessionStarted?: () => void;
  onSwitchToClassic?: () => void;
  onFinished?: () => void;
  onOpenManualAdd?: () => void;
  embedded?: boolean;
}

export function GroupSwipeMatch({
  groupId,
  session,
  onFinished,
  onOpenManualAdd,
  embedded = false,
}: GroupSwipeMatchProps) {
  const { userData } = useUser();
  const { refreshSession } = useVoting();
  const profileId = userData?.profile?.id;
  const userPreferenceIds = useMemo(
    () => new Set(userData?.preferences?.preferences || []),
    [userData?.preferences?.preferences]
  );
  const userRestrictionIds = useMemo(
    () => new Set(userData?.preferences?.dietaryRestrictions || []),
    [userData?.preferences?.dietaryRestrictions]
  );

  const [personalMeals, setPersonalMeals] = useState<SwipeMeal[]>([]);
  const [allCompatibleMeals, setAllCompatibleMeals] = useState<SwipeMeal[]>([]);
  const [groupRestrictionNames, setGroupRestrictionNames] = useState<string[]>([]);
  const [deckScope, setDeckScope] = useState<'personal' | 'compatible'>('personal');
  const [passedIds, setPassedIds] = useState<Set<number>>(new Set());
  const [swipeExit, setSwipeExit] = useState<'left' | 'right' | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countMatchedPreferences = useCallback(
    (meal: SwipeMeal) => {
      if (userPreferenceIds.size === 0) return 0;
      const matched = new Set<number>();
      (meal.mealFoods || []).forEach((mf) => {
        (mf.food?.preferences || []).forEach((p) => {
          if (p.PreferenceID !== undefined && userPreferenceIds.has(p.PreferenceID)) {
            matched.add(p.PreferenceID);
          }
        });
      });
      return matched.size;
    },
    [userPreferenceIds]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPersonalizedDeck() {
      setLoading(true);
      setError(null);
      try {
        const [allMealsRes, groupDietRes, userProfileRes, catalogRestRes] = await Promise.all([
          fetch(`${API_BASE_URL}/meals/all`),
          fetch(`${API_BASE_URL}/groups/${groupId}/dietary-info`).catch(() => null),
          profileId ? fetch(`${API_BASE_URL}/profile/${profileId}/full`).catch(() => null) : Promise.resolve(null),
          fetch(`${API_BASE_URL}/dietary-restrictions`).catch(() => null),
        ]);

        const catalogMap = new Map<number, string>();
        if (catalogRestRes && catalogRestRes.ok) {
          const catalog = (await catalogRestRes.json()) as RestrictionItem[];
          catalog.forEach((r) => catalogMap.set(r.DietaryRestrictionID, r.name));
        }

        const requiredMap = new Map<number, RestrictionItem>();
        Array.from(userRestrictionIds)
          .filter((id) => id !== 0)
          .forEach((id) => {
            requiredMap.set(id, {
              DietaryRestrictionID: id,
              name: catalogMap.get(id) || '',
            });
          });

        if (userProfileRes && userProfileRes.ok) {
          const pData = (await userProfileRes.json()) as {
            DietaryRestriction?: RestrictionItem[];
          };
          (pData.DietaryRestriction || []).forEach((r) => {
            if (r.DietaryRestrictionID !== 0 && !r.name.toLowerCase().includes('everyone')) {
              requiredMap.set(r.DietaryRestrictionID, r);
            }
          });
        }

        if (groupDietRes && groupDietRes.ok) {
          const gData = (await groupDietRes.json()) as {
            dietaryRestrictions?: RestrictionItem[];
          };
          (gData.dietaryRestrictions || []).forEach((r) => {
            if (r.DietaryRestrictionID !== 0 && !r.name.toLowerCase().includes('everyone')) {
              requiredMap.set(r.DietaryRestrictionID, r);
            }
          });
        }

        const activeRequirements = Array.from(requiredMap.values());
        const allMeals: SwipeMeal[] = allMealsRes.ok ? await allMealsRes.json() : [];

        // Strictly enforce BOTH personal AND group dietary restrictions (tags + ingredient allergen rules)
        const strictlyCompatible = allMeals.filter((m) =>
          isMealCompatibleWithRestrictions(m, activeRequirements)
        );

        // Personal deck = strictly compatible dishes that ALSO match user's taste preferences (if set)
        const matchingTastes =
          userPreferenceIds.size > 0
            ? strictlyCompatible.filter((m) => countMatchedPreferences(m) > 0)
            : strictlyCompatible;

        const sortDeck = (items: SwipeMeal[]) =>
          [...items].sort((a, b) => countMatchedPreferences(b) - countMatchedPreferences(a));

        if (!cancelled) {
          setGroupRestrictionNames(activeRequirements.map((r) => r.name).filter(Boolean));
          const sortedPersonal = sortDeck(matchingTastes);
          const sortedCompatible = sortDeck(strictlyCompatible);
          setPersonalMeals(sortedPersonal);
          setAllCompatibleMeals(sortedCompatible);
          if (sortedPersonal.length === 0 && sortedCompatible.length > 0) {
            setDeckScope('compatible');
          } else {
            setDeckScope('personal');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load meals for Swipe.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPersonalizedDeck();
    return () => {
      cancelled = true;
    };
  }, [
    groupId,
    profileId,
    userPreferenceIds,
    userRestrictionIds,
    countMatchedPreferences,
  ]);

  const proposedMealIds = useMemo(
    () => new Set((session?.proposals || []).map((p) => p.mealId)),
    [session?.proposals]
  );

  const baseDeck = deckScope === 'personal' && personalMeals.length > 0 ? personalMeals : allCompatibleMeals;

  const availableToSwipe = useMemo(
    () =>
      baseDeck.filter(
        (meal) => !proposedMealIds.has(meal.MealID) && !passedIds.has(meal.MealID)
      ),
    [baseDeck, proposedMealIds, passedIds]
  );

  const currentMeal = availableToSwipe[0] ?? null;
  const nextMealPreview = availableToSwipe[1] ?? null;

  const matchedTasteNames = useMemo(() => {
    if (!currentMeal) return [];
    const names = new Set<string>();
    (currentMeal.mealFoods || []).forEach((mf) => {
      (mf.food?.preferences || []).forEach((p) => {
        if (
          p.name &&
          (userPreferenceIds.size === 0 ||
            (p.PreferenceID !== undefined && userPreferenceIds.has(p.PreferenceID)))
        ) {
          names.add(p.name);
        }
      });
    });
    return Array.from(names).slice(0, 4);
  }, [currentMeal, userPreferenceIds]);

  const restrictionLabels = useMemo(() => {
    if (!currentMeal) return [];
    const names = new Set<string>();
    (currentMeal.mealFoods || []).forEach((mf) => {
      (mf.food?.dietaryRestrictions || []).forEach((r) => {
        if (r.name && !r.name.toLowerCase().includes('everyone')) {
          names.add(r.name);
        }
      });
    });
    return Array.from(names).slice(0, 3);
  }, [currentMeal]);

  const calories = useMemo(
    () =>
      currentMeal
        ? (currentMeal.mealFoods || []).reduce(
            (sum, mf) => sum + (mf.quantity || 1) * (mf.food?.kCal || 0),
            0
          )
        : 0,
    [currentMeal]
  );

  const handlePass = useCallback(() => {
    if (!currentMeal || submitting || swipeExit) return;
    setSwipeExit('left');
    window.setTimeout(() => {
      setPassedIds((prev) => new Set(prev).add(currentMeal.MealID));
      setSwipeExit(null);
      if (availableToSwipe.length <= 1) {
        onFinished?.();
      }
    }, 180);
  }, [currentMeal, submitting, swipeExit, availableToSwipe.length, onFinished]);

  const handlePropose = useCallback(async () => {
    if (!currentMeal || submitting || swipeExit) return;

    if (!session || session.status !== 'proposal_phase') {
      toast.info('Proposal round is not active', {
        description: 'Start or join the proposal phase to add swiped dishes to the pool.',
      });
      return;
    }

    if (!profileId) {
      toast.error('Please sign in to propose meals.');
      return;
    }

    setSubmitting(true);
    setSwipeExit('right');

    try {
      await VotingService.proposeMeal(session.VotingSessionID, {
        mealId: currentMeal.MealID,
        proposedById: profileId,
      });
      toast.success(`Added "${currentMeal.name}" to the pool!`);
      await refreshSession();
      if (availableToSwipe.length <= 1) {
        onFinished?.();
      }
    } catch (err) {
      toast.error('Could not add meal', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      window.setTimeout(() => {
        setSwipeExit(null);
        setSubmitting(false);
      }, 160);
    }
  }, [
    currentMeal,
    submitting,
    swipeExit,
    session,
    profileId,
    refreshSession,
    availableToSwipe.length,
    onFinished,
  ]);

  // Keyboard arrow support for game-like swiping
  useEffect(() => {
    if (!currentMeal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePass();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        void handlePropose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentMeal, handlePass, handlePropose]);

  if (loading) {
    return (
      <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-muted/20 p-8">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-secondary" />
        <p className="text-xs font-medium text-muted-foreground">
          Curating dishes for your tastes &amp; dietary restrictions...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Deck Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/10">
            <Sparkles className="mr-1 h-3 w-3" />
            {deckScope === 'personal' && personalMeals.length > 0
              ? 'Matched to Your Tastes & Restrictions'
              : 'Filtered by Active Restrictions'}
          </Badge>
          {groupRestrictionNames.map((rName) => (
            <Badge
              key={rName}
              variant="outline"
              className="border-primary/35 bg-primary/10 text-xs font-medium text-primary"
            >
              <Leaf className="mr-1 h-3 w-3" />
              {rName}
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground">
            {availableToSwipe.length} {availableToSwipe.length === 1 ? 'card' : 'cards'} left
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {personalMeals.length > 0 && allCompatibleMeals.length > personalMeals.length && (
            <div className="inline-flex rounded-xl border border-border bg-muted/50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDeckScope('personal')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  deckScope === 'personal'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                My Cravings ({personalMeals.length})
              </button>
              <button
                type="button"
                onClick={() => setDeckScope('compatible')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                  deckScope === 'compatible'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Safe ({allCompatibleMeals.length})
              </button>
            </div>
          )}

          {onOpenManualAdd && !embedded && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenManualAdd}
              className="rounded-xl border-border bg-card text-xs hover:bg-muted"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Search / Add Manually
            </Button>
          )}
        </div>
      </div>

      {/* Empty Deck State */}
      {!currentMeal ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Utensils className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-lg font-bold text-foreground">
            {baseDeck.length === 0
              ? 'No matching dishes in catalog yet'
              : "You've swiped through your deck!"}
          </h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {baseDeck.length === 0
              ? 'Create a dish manually or continue straight to the game mode — random dishes will load automatically.'
              : 'Reset passed cards, explore all safe dishes, add one manually, or advance to pick your game mode!'}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {passedIds.size > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPassedIds(new Set())}
                className="rounded-xl"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Review Passed ({passedIds.size})
              </Button>
            )}
            {deckScope === 'personal' && allCompatibleMeals.length > personalMeals.length && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeckScope('compatible');
                  setPassedIds(new Set());
                }}
                className="rounded-xl"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Browse All Safe Dishes
              </Button>
            )}
            {onOpenManualAdd && (
              <Button
                type="button"
                size="sm"
                onClick={onOpenManualAdd}
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Dish Manually
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Stacked Game Card Deck */
        <div className="relative mx-auto max-w-lg pt-2">
          {/* Underlying Next Card Stack Shadow */}
          {nextMealPreview && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-4 -bottom-2 top-5 rounded-3xl border border-border/70 bg-muted/50 opacity-75 transition-transform"
            />
          )}

          {/* Active Swipe Card */}
          <div
            className={`relative overflow-hidden rounded-3xl border border-border bg-card shadow-lg transition-all duration-200 ${
              swipeExit === 'left'
                ? '-translate-x-10 -rotate-3 opacity-30'
                : swipeExit === 'right'
                  ? 'translate-x-10 rotate-3 opacity-30'
                  : 'translate-x-0 rotate-0 opacity-100'
            }`}
          >
            {/* Visual Dish Header */}
            <div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-secondary/15 via-muted/40 to-primary/15 sm:h-56">
              {currentMeal.svgLink ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentMeal.svgLink}
                  alt={currentMeal.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-card/80 shadow-sm">
                    <Utensils className="h-8 w-8 text-secondary" />
                  </div>
                </div>
              )}

              {/* Top Badges Overlay */}
              <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-1.5">
                {calories > 0 && (
                  <Badge className="border border-border/80 bg-card/90 text-foreground backdrop-blur-sm hover:bg-card/90">
                    <Flame className="mr-1 h-3 w-3 text-secondary" />
                    {Math.round(calories)} kcal
                  </Badge>
                )}
              </div>

              <div className="absolute right-3.5 top-3.5">
                {groupRestrictionNames.length > 0 && (
                  <Badge className="border border-emerald-500/35 bg-emerald-500/15 text-emerald-800 backdrop-blur-sm dark:text-emerald-200 hover:bg-emerald-500/15">
                    <Leaf className="mr-1 h-3 w-3" />
                    Fits: {groupRestrictionNames.slice(0, 2).join(', ')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Card Body */}
            <div className="space-y-4 p-5">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {currentMeal.name}
                </h3>
                {currentMeal.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {currentMeal.description}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    By {currentMeal.profile?.username || 'Community Chef'}
                  </p>
                )}
              </div>

              {/* Matched Tastes & Restriction Pills */}
              {(matchedTasteNames.length > 0 || restrictionLabels.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {matchedTasteNames.map((taste) => (
                    <Badge
                      key={`taste-${taste}`}
                      variant="secondary"
                      className="border border-secondary/25 bg-secondary/10 text-xs font-medium text-secondary"
                    >
                      <Heart className="mr-1 h-2.5 w-2.5 fill-current" />
                      {taste}
                    </Badge>
                  ))}
                  {restrictionLabels.map((rest) => (
                    <Badge
                      key={`rest-${rest}`}
                      variant="outline"
                      className="border-primary/30 bg-primary/10 text-xs font-medium text-primary"
                    >
                      {rest}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Ingredient Chips */}
              {currentMeal.mealFoods?.length > 0 && (
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ingredients ({currentMeal.mealFoods.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentMeal.mealFoods.slice(0, 6).map((mf, i) => (
                      <span
                        key={`${mf.food.name}-${i}`}
                        className="rounded-lg border border-border/80 bg-card px-2 py-0.5 text-xs text-foreground"
                      >
                        {mf.food.name}
                      </span>
                    ))}
                    {currentMeal.mealFoods.length > 6 && (
                      <span className="rounded-lg bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        +{currentMeal.mealFoods.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tactile Swipe Controls */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePass}
                  disabled={submitting}
                  className="h-13 rounded-2xl border-border bg-background text-sm font-semibold text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="mr-2 h-5 w-5" />
                  Pass
                </Button>

                <Button
                  type="button"
                  onClick={() => void handlePropose()}
                  disabled={submitting}
                  className="h-13 rounded-2xl bg-secondary text-sm font-semibold text-secondary-foreground shadow-sm transition-all hover:bg-secondary/90"
                >
                  <Heart className="mr-2 h-5 w-5 fill-current" />
                  {submitting ? 'Adding...' : 'Propose Dish'}
                </Button>
              </div>

              <p className="text-center text-[11px] text-muted-foreground">
                Tip: Use <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">←</kbd> to Pass or{' '}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">→</kbd> to Propose
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
