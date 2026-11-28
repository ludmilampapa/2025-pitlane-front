'use client';

import { useState } from 'react';
import { ChefHat, Utensils } from 'lucide-react';
import { UserMeals, AllMeals, UserPreferenceCards } from '@/components/profile';
import { CalorieGoalCard } from './CalorieGoalCard';
import { UserFoodsPage } from './user-foods-page';

interface FoodAndMealsHubProps {
  initialTab?: 'meals' | 'foods';
}

export function FoodAndMealsHub({ initialTab = 'meals' }: FoodAndMealsHubProps) {
  const [activeTab, setActiveTab] = useState<'meals' | 'foods'>(initialTab);

  return (
    <div className="space-y-8">
      {/* Unified Header with Meals / Foods Tabs */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              {activeTab === 'meals' ? (
                <ChefHat className="h-6 w-6" />
              ) : (
                <Utensils className="h-6 w-6" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Food &amp; Meals
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === 'meals'
                  ? 'Create your own recipes, explore personalized recommendations, and browse community dishes.'
                  : 'Manage your ingredients and explore all available foods tailored to your preferences.'}
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Food and Meals sections"
            className="inline-flex shrink-0 self-start rounded-xl border border-border bg-muted/50 p-1 sm:self-center"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'meals'}
              onClick={() => setActiveTab('meals')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'meals'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ChefHat className="h-4 w-4" />
              Meals
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'foods'}
              onClick={() => setActiveTab('foods')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'foods'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Utensils className="h-4 w-4" />
              Foods
            </button>
          </div>
        </div>
      </div>

      {/* Preferences, Dietary Restrictions & Daily Calorie Goal */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <UserPreferenceCards />
        </div>
        <div className="xl:col-span-5">
          <CalorieGoalCard />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'meals' ? (
        <div className="space-y-10">
          <UserMeals />
          <div className="border-t border-border pt-8">
            <AllMeals />
          </div>
        </div>
      ) : (
        <UserFoodsPage embedded />
      )}
    </div>
  );
}
