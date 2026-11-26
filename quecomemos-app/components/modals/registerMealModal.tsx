'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Plus, Clock, Calendar, SlidersHorizontal, Utensils, Check, ChevronDown, ChevronUp, HeartHandshake } from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { useMeals, Meal } from '@/lib/contexts/MealsContext';
import { API_BASE_URL } from '@/lib/config/api';
import type { ActivePausedChallenge } from '@/lib/types/groupChallenges';
import AddMealForm from '../meal/AddMealForm';
import { MealSearchBar } from '../meal/MealSearchBar';
import { MealComposition } from '../meal/MealComposition';
import { MealPortionSelector, PortionPlateSvg, type PortionData } from '../meal/MealPortionSelector';
import { fetchGroupDietaryInfo } from '@/lib/utils/groupService';
import {
  argentinaDateTimeToISO,
  formatArgentinaHHMM,
  formatArgentinaYMD,
  isValidHHMM,
  isValidYMD,
} from '@/lib/utils/timezone';
import { Group } from '../groups/index';

interface GroupDietaryInfo {
  dietaryRestrictions: Array<{
    DietaryRestrictionID: number;
    name: string;
  }>;
  preferences: Array<{
    PreferenceID: number;
    name: string;
  }>;
}

interface RegisterMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (mealData: {
    mealId: number;
    date: string;
    portions?: PortionData;
  }) => void;
  group?: Group | null;
}

const QUICK_PORTIONS = [
  { label: '1/4', fraction: 0.25 },
  { label: '1/2', fraction: 0.5 },
  { label: '3/4', fraction: 0.75 },
  { label: 'Full', fraction: 1 },
];

export function RegisterMealModal({ isOpen, onClose, onSubmit, group }: RegisterMealModalProps) {
  const { userData } = useUser();
  const { allMeals, addMeal } = useMeals();

  // Form state
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [mealDate, setMealDate] = useState(() => formatArgentinaYMD());
  const [mealTime, setMealTime] = useState(() => formatArgentinaHHMM());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group restrictions state
  const [groupDietaryInfo, setGroupDietaryInfo] = useState<GroupDietaryInfo | null>(null);
  const [activePausedChallenges, setActivePausedChallenges] = useState<ActivePausedChallenge[]>([]);

  // Mode: choose existing vs create new
  const [showCreateMeal, setShowCreateMeal] = useState(false);

  // Time mode: defaults to Now (1-click submit)
  const [useCurrentTime, setUseCurrentTime] = useState(true);

  // Portion state
  const [activeFraction, setActiveFraction] = useState<number | null>(1);
  const [showPortionSelector, setShowPortionSelector] = useState(false);
  const [selectedPortions, setSelectedPortions] = useState<PortionData | null>(null);
  const [showComposition, setShowComposition] = useState(false);

  const profile = userData?.profile;
  const userRestrictions = userData?.preferences?.dietaryRestrictions || [];
  const groupRestrictions = groupDietaryInfo?.dietaryRestrictions?.map((r) => r.DietaryRestrictionID) || [];
  const isGroupMode = !!group;

  const fullMealCalories = useMemo(() => {
    if (!selectedMeal) return 0;
    return selectedMeal.mealFoods.reduce((sum, mf) => sum + mf.food.kCal * mf.quantity, 0);
  }, [selectedMeal]);

  const effectiveCalories = useMemo(() => {
    if (!selectedMeal) return 0;
    if (selectedPortions) return Math.round(selectedPortions.totalCalories);
    return Math.round(fullMealCalories);
  }, [selectedMeal, selectedPortions, fullMealCalories]);

  const recentMeals = useMemo(() => {
    return [...allMeals]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [allMeals]);

  useEffect(() => {
    const fetchGroupInfo = async () => {
      if (group && isOpen) {
        try {
          const info = await fetchGroupDietaryInfo(group.GroupID.toString());
          setGroupDietaryInfo(info);
        } catch (err) {
          console.error('Error fetching group dietary info:', err);
        }
      }
    };
    fetchGroupInfo();
  }, [group, isOpen]);

  useEffect(() => {
    if (!isOpen || !profile?.id) return;
    let cancelled = false;
    const todayYMD = formatArgentinaYMD();
    fetch(`${API_BASE_URL}/challenges/active-paused?date=${encodeURIComponent(todayYMD)}`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setActivePausedChallenges(data as ActivePausedChallenge[]);
        }
      })
      .catch(() => {
        if (!cancelled) setActivePausedChallenges([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, profile?.id]);

  const mindfulChallengeMatches = useMemo(() => {
    if (!selectedMeal || activePausedChallenges.length === 0) return [];
    const searchableTexts = [
      selectedMeal.name || '',
      selectedMeal.description || '',
      ...selectedMeal.mealFoods.map((mf) => mf.food?.name || ''),
    ]
      .join(' ')
      .toLowerCase();

    const relevantChallenges = group
      ? activePausedChallenges.filter((c) => c.groupId === group.GroupID)
      : activePausedChallenges;

    return relevantChallenges
      .map((challenge) => {
        const matchedItems = challenge.pausedFoods.filter((paused) =>
          searchableTexts.includes(paused.toLowerCase())
        );
        return matchedItems.length > 0 ? { challenge, matchedItems } : null;
      })
      .filter((entry): entry is { challenge: ActivePausedChallenge; matchedItems: string[] } => Boolean(entry));
  }, [selectedMeal, activePausedChallenges, group]);

  const handleClose = useCallback(() => {
    setSelectedMeal(null);
    setMealDate(formatArgentinaYMD());
    setMealTime(formatArgentinaHHMM());
    setError(null);
    setShowCreateMeal(false);
    setUseCurrentTime(true);
    setActiveFraction(1);
    setShowPortionSelector(false);
    setSelectedPortions(null);
    setShowComposition(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showPortionSelector) setShowPortionSelector(false);
        else handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, showPortionSelector, handleClose]);

  const handleSelectMeal = (meal: Meal | null) => {
    setSelectedMeal(meal);
    setActiveFraction(1);
    setSelectedPortions(null);
    setError(null);
  };

  const applyQuickFraction = (fraction: number) => {
    if (!selectedMeal) return;
    setActiveFraction(fraction);
    if (fraction === 1) {
      setSelectedPortions(null);
      return;
    }
    const foodPortions = selectedMeal.mealFoods.map((mf) => ({
      foodId: mf.food.FoodID,
      portionFraction: fraction,
      absoluteQuantity: Number((mf.quantity * fraction).toFixed(3)),
    }));
    setSelectedPortions({
      mode: 'percentage',
      portionFraction: fraction,
      foodPortions,
      totalCalories: fullMealCalories * fraction,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!selectedMeal) {
      setError('Please select a meal first.');
      return;
    }
    if (!useCurrentTime) {
      if (!mealDate || !mealTime || !isValidYMD(mealDate) || !isValidHHMM(mealTime)) {
        setError('Please enter a valid date and time.');
        return;
      }
      const pickedIso = argentinaDateTimeToISO(mealDate, mealTime);
      if (new Date(pickedIso).getTime() > Date.now() + 60_000) {
        setError('You cannot log a meal in the future.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const finalDateTime = useCurrentTime
        ? new Date().toISOString()
        : argentinaDateTimeToISO(mealDate, mealTime);

      await onSubmit({
        mealId: selectedMeal.MealID,
        date: finalDateTime,
        portions: selectedPortions || undefined,
      });
      handleClose();
    } catch {
      setError('Failed to register meal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMealAdded = async (newMeal: Meal) => {
    if (profile?.id && newMeal) {
      addMeal(newMeal);
    }
    if (newMeal && newMeal.MealID) {
      handleSelectMeal(newMeal);
    }
    setShowCreateMeal(false);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {group ? `Log Meal for ${group.name}` : 'Log a Meal'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Pick a meal, adjust portion if needed, and log in one click.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switch Tabs */}
        <div className="border-b border-border bg-background/60 px-6 py-3">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/50 p-1">
            <button
              type="button"
              onClick={() => setShowCreateMeal(false)}
              className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                !showCreateMeal
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Choose Existing Meal
            </button>
            <button
              type="button"
              onClick={() => setShowCreateMeal(true)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                showCreateMeal
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Create New Meal
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {!showCreateMeal ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {group && groupDietaryInfo && (
                <div className="rounded-xl border border-border bg-muted/50 p-3.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{group.name}</span> ·{' '}
                  {group.members?.length || 0} members
                  {groupDietaryInfo.dietaryRestrictions.length > 0 && (
                    <>
                      {' · Restrictions: '}
                      <span className="text-foreground">
                        {groupDietaryInfo.dietaryRestrictions.map((r) => r.name).join(', ')}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Step 1: Select Meal */}
              <div className="space-y-3">
                <MealSearchBar
                  allMeals={allMeals}
                  selectedMeal={selectedMeal}
                  onMealSelect={handleSelectMeal}
                  userRestrictions={userRestrictions}
                  groupRestrictions={groupRestrictions}
                  isGroupMode={isGroupMode}
                  showCreateButton={true}
                  onCreateClick={() => setShowCreateMeal(true)}
                  showAdvancedFilters={true}
                />

                {/* Quick-pick chips for recent meals */}
                {!selectedMeal && recentMeals.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Quick pick:</p>
                    <div className="flex flex-wrap gap-2">
                      {recentMeals.map((meal) => (
                        <button
                          key={meal.MealID}
                          type="button"
                          onClick={() => handleSelectMeal(meal)}
                          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/10"
                        >
                          {meal.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMeal && mindfulChallengeMatches.length > 0 && (
                  <div
                    role="status"
                    className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-foreground"
                  >
                    <div className="flex items-start gap-2.5">
                      <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                      <div className="space-y-1">
                        <p className="font-semibold text-amber-900 dark:text-amber-200">
                          Mindful check-in · Active challenge
                        </p>
                        {mindfulChallengeMatches.map(({ challenge, matchedItems }) => (
                          <p key={challenge.ChallengeID} className="text-muted-foreground">
                            This meal includes{' '}
                            <span className="font-semibold text-foreground">
                              {matchedItems.join(', ')}
                            </span>
                            , which you&apos;re taking a break from in{' '}
                            <span className="font-semibold text-foreground">{challenge.name}</span>{' '}
                            ({challenge.groupName}).
                          </p>
                        ))}
                        <p className="pt-0.5 text-[11px] text-muted-foreground">
                          Logging honestly always counts — no guilt and no lockouts. You can still log this meal or pick another option.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedMeal && (
                  <div className="rounded-xl border border-border bg-background">
                    <button
                      type="button"
                      onClick={() => setShowComposition((prev) => !prev)}
                      aria-expanded={showComposition}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted/50 rounded-xl"
                    >
                      <span>
                        Meal composition ({selectedMeal.mealFoods.length}{' '}
                        {selectedMeal.mealFoods.length === 1 ? 'ingredient' : 'ingredients'} ·{' '}
                        {Math.round(fullMealCalories)} kcal)
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary">
                        {showComposition ? (
                          <>
                            Hide
                            <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            View ingredients
                            <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </span>
                    </button>
                    {showComposition && (
                      <div className="border-t border-border p-3">
                        <MealComposition meal={selectedMeal} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Inline Portion Pills + Dynamic Plate SVG + Optional Custom Breakdown */}
              {selectedMeal && (
                <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Select Your Portion
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPortionSelector(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Customize ingredients
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <div className="grid w-full flex-1 grid-cols-4 gap-2">
                      {QUICK_PORTIONS.map((opt) => {
                        const isActive = activeFraction === opt.fraction;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => applyQuickFraction(opt.fraction)}
                            className={`h-11 rounded-xl border text-xs font-semibold transition-all ${
                              isActive
                                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                : 'border-border bg-card text-foreground hover:border-primary/60 hover:bg-muted'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <PortionPlateSvg
                      size="md"
                      percentage={
                        selectedPortions
                          ? Math.round(selectedPortions.portionFraction * 100)
                          : Math.round((activeFraction ?? 1) * 100)
                      }
                    />
                  </div>

                  {activeFraction === null && selectedPortions && (
                    <p className="flex items-center gap-1 text-xs font-medium text-primary">
                      <Check className="h-3.5 w-3.5" />
                      Custom ingredient breakdown active ({Math.round(selectedPortions.portionFraction * 100)}% ·{' '}
                      {effectiveCalories} kcal)
                    </p>
                  )}
                </div>
              )}

              {/* Step 3: When (Now by default, optional date/time) */}
              <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    When
                  </span>
                  <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setUseCurrentTime(true)}
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                        useCurrentTime
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseCurrentTime(false)}
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                        !useCurrentTime
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      Pick date &amp; time
                    </button>
                  </div>
                </div>

                {!useCurrentTime && (
                  <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                    <div>
                      <label htmlFor="mealDate" className="mb-1 block text-xs font-medium text-muted-foreground">
                        Date
                      </label>
                      <input
                        type="date"
                        id="mealDate"
                        value={mealDate}
                        onChange={(e) => setMealDate(e.target.value)}
                        max={formatArgentinaYMD()}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label htmlFor="mealTime" className="mb-1 block text-xs font-medium text-muted-foreground">
                        Time
                      </label>
                      <input
                        type="time"
                        id="mealTime"
                        value={mealTime}
                        onChange={(e) => setMealTime(e.target.value)}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Single Clear Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedMeal || (!useCurrentTime && (!mealDate || !mealTime))}
                className="w-full rounded-xl bg-secondary py-3.5 text-sm font-bold text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Logging meal...'
                  : selectedMeal
                    ? `Log to My Day (${effectiveCalories} kcal)`
                    : 'Select a meal to log'}
              </button>
            </form>
          ) : (
            <AddMealForm
              onFoodAdded={(meal) => handleMealAdded(meal as Meal)}
              onClose={() => setShowCreateMeal(false)}
              initialMealName={undefined}
            />
          )}
        </div>
      </div>

      {/* Optional Custom Ingredient Breakdown Modal */}
      {showPortionSelector && selectedMeal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setShowPortionSelector(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Customize Ingredients</h3>
                <p className="text-xs text-muted-foreground">
                  Fine-tune how much of {selectedMeal.name} you consumed
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPortionSelector(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <MealPortionSelector
                meal={{
                  mealId: selectedMeal.MealID,
                  name: selectedMeal.name,
                  description: selectedMeal.description,
                  mealFoods: selectedMeal.mealFoods.map((mf) => ({
                    foodId: mf.food.FoodID,
                    foodName: mf.food.name,
                    quantity: mf.quantity,
                    svgLink: mf.food.svgLink,
                    kCal: mf.food.kCal,
                  })),
                  totalCalories: fullMealCalories,
                }}
                onConfirm={(portionData) => {
                  setSelectedPortions(portionData);
                  setActiveFraction(null);
                  setShowPortionSelector(false);
                }}
                onCancel={() => setShowPortionSelector(false)}
                loading={false}
                profileId={profile?.id}
                date={
                  !useCurrentTime && mealDate && mealTime
                    ? new Date(`${mealDate}T${mealTime}`)
                    : new Date()
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
