import { Suspense } from 'react';
import { ChefHat } from 'lucide-react';
import { UserMeals, AllMeals } from '@/components/profile';

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
      <div className="space-y-10">
        {/* Editorial Page Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-secondary/10 blur-2xl"
          />
          <div className="relative flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Meals Catalog
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your own recipes, explore personalized recommendations, and browse community dishes.
              </p>
            </div>
          </div>
        </div>

        {/* User's Created Meals */}
        <UserMeals />

        {/* Recommended & Community Meals */}
        <div className="border-t border-border pt-8">
          <AllMeals />
        </div>
      </div>
    </Suspense>
  );
}
