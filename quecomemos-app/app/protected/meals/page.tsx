import { Suspense } from 'react';
import { FoodAndMealsHub } from '@/components/food/FoodAndMealsHub';

function MealsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}

export default function MealsPage() {
  return (
    <Suspense fallback={<MealsSkeleton />}>
      <FoodAndMealsHub initialTab="meals" />
    </Suspense>
  );
}
