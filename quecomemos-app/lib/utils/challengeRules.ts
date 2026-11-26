import type { Challenge } from '@/lib/types/groupChallenges';

/**
 * A challenge with linked pausedFoods is auto-tracked from daily logged meals
 * (completed when >= 1 meal is logged that day with no pausedFoods match).
 */
export function isAutoTrackedChallenge(
  challenge: Pick<Challenge, 'pausedFoods'> | null | undefined
): boolean {
  return Boolean(challenge?.pausedFoods && challenge.pausedFoods.length > 0);
}

/**
 * Returns the subset of pausedFoods that appear in a meal's name, description, or ingredients.
 */
export function matchPausedFoodsForMeal(
  meal: {
    name?: string;
    description?: string | null;
    mealFoods?: Array<{ food?: { name?: string } }>;
  } | null,
  pausedFoods: string[]
): string[] {
  if (!meal || pausedFoods.length === 0) return [];
  const searchable = [
    meal.name || '',
    meal.description || '',
    ...(meal.mealFoods || []).map((mf) => mf.food?.name || ''),
  ]
    .join(' ')
    .toLowerCase();

  return pausedFoods.filter((paused) => {
    const needle = paused.trim().toLowerCase();
    return Boolean(needle) && searchable.includes(needle);
  });
}
