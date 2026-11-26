import type { WeeklyMenuEntry } from '@/lib/types/groupChallenges';

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Computes total rounded calories for any meal-like object with mealFoods.
 */
export function getMealCalories(
  meal: { mealFoods?: Array<{ quantity?: number; food?: { kCal?: number } }> } | null | undefined
): number {
  if (!meal?.mealFoods?.length) return 0;
  return Math.round(
    meal.mealFoods.reduce(
      (sum, mf) => sum + (mf.quantity || 1) * (mf.food?.kCal || 0),
      0
    )
  );
}

/**
 * Computes total rounded calories for a weekly menu entry.
 */
export function getEntryCalories(entry: WeeklyMenuEntry | undefined): number {
  return getMealCalories(entry?.meal);
}

/**
 * Indexes weekly menu entries by `${YYYY-MM-DD}_${moment}` for O(1) slot lookups.
 */
export function indexEntriesBySlot(entries: WeeklyMenuEntry[]): Map<string, WeeklyMenuEntry> {
  const map = new Map<string, WeeklyMenuEntry>();
  entries.forEach((entry) => {
    map.set(`${entry.date.slice(0, 10)}_${entry.moment}`, entry);
  });
  return map;
}
