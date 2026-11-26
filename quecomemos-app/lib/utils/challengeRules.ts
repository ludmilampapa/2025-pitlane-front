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

interface SelectedPortionsInput {
  portionFraction?: number;
  foodPortions?: Array<{
    foodId: number;
    portionFraction: number;
    absoluteQuantity?: number;
  }>;
}

/**
 * Returns the subset of pausedFoods that appear in a meal's consumed ingredients.
 * When custom ingredient portions are provided, any ingredient set to 0 is excluded.
 */
export function matchPausedFoodsForMeal(
  meal: {
    name?: string;
    description?: string | null;
    mealFoods?: Array<{ food?: { FoodID?: number; name?: string } }>;
  } | null,
  pausedFoods: string[],
  selectedPortions?: SelectedPortionsInput | null
): string[] {
  if (!meal || pausedFoods.length === 0) return [];

  const customPortions = selectedPortions?.foodPortions;
  let searchable = '';

  if (Array.isArray(customPortions) && customPortions.length > 0 && meal.mealFoods?.length) {
    const portionByFoodId = new Map(customPortions.map((fp) => [fp.foodId, fp]));
    const consumedFoodNames: string[] = [];
    for (const mf of meal.mealFoods) {
      const foodId = mf.food?.FoodID;
      const fp = foodId !== undefined ? portionByFoodId.get(foodId) : undefined;
      const isConsumed = fp
        ? fp.portionFraction > 0 && (fp.absoluteQuantity === undefined || fp.absoluteQuantity > 0)
        : true;
      if (isConsumed && mf.food?.name) {
        consumedFoodNames.push(mf.food.name);
      }
    }
    searchable = consumedFoodNames.join(' ').toLowerCase();
  } else {
    if (selectedPortions && selectedPortions.portionFraction === 0) return [];
    searchable = [
      meal.name || '',
      meal.description || '',
      ...(meal.mealFoods || []).map((mf) => mf.food?.name || ''),
    ]
      .join(' ')
      .toLowerCase();
  }

  return pausedFoods.filter((paused) => {
    const needle = paused.trim().toLowerCase();
    return Boolean(needle) && searchable.includes(needle);
  });
}
