import { NextResponse } from 'next/server';

interface ExternalProduct {
  name: string;
  type: 'meal' | 'food';
  category?: string;
  area?: string;
  thumb?: string;
}

interface TheMealDBMeal {
  strMeal?: string;
  strCategory?: string;
  strArea?: string;
  strMealThumb?: string;
}

interface TheMealDBIngredient {
  strIngredient?: string;
}

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

export async function GET() {
  try {
    const [mealsRes, ingredientsRes] = await Promise.allSettled([
      fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=', {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      }),
      fetch('https://www.themealdb.com/api/json/v1/1/list.php?i=list', {
        headers: { Accept: 'application/json' },
        next: { revalidate: 3600 },
      }),
    ]);

    const products: ExternalProduct[] = [];

    if (mealsRes.status === 'fulfilled' && mealsRes.value.ok) {
      const data = await mealsRes.value.json();
      const meals: TheMealDBMeal[] = Array.isArray(data?.meals) ? data.meals : [];
      for (const meal of meals) {
        if (meal.strMeal?.trim()) {
          products.push({
            name: meal.strMeal.trim(),
            type: 'meal',
            category: meal.strCategory || undefined,
            area: meal.strArea || undefined,
            thumb: meal.strMealThumb || undefined,
          });
        }
      }
    }

    if (ingredientsRes.status === 'fulfilled' && ingredientsRes.value.ok) {
      const data = await ingredientsRes.value.json();
      const ingredients: TheMealDBIngredient[] = Array.isArray(data?.meals) ? data.meals : [];
      for (const item of ingredients.slice(0, 80)) {
        const ingredientName = item.strIngredient?.trim();
        if (ingredientName) {
          products.push({
            name: ingredientName,
            type: 'food',
            thumb: `https://www.themealdb.com/images/ingredients/${encodeURIComponent(ingredientName)}-small.png`,
          });
        }
      }
    }

    if (products.length === 0) {
      console.warn('TheMealDB API returned no products');
      return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json(products, { headers: CACHE_HEADERS });
  } catch (error) {
    console.warn('TheMealDB API unavailable:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
  }
}
