'use client';

import React from 'react';
import { Meal } from '@/lib/contexts/MealsContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UtensilsCrossed, Flame } from 'lucide-react';

interface MealCompositionProps {
  meal: Meal;
  className?: string;
}

export function MealComposition({ meal, className = '' }: MealCompositionProps) {
  const calculateTotalCalories = () => {
    return meal.mealFoods.reduce((sum, mf) => sum + mf.food.kCal * mf.quantity, 0);
  };

  const getPreferenceNames = (
    preferences: { name?: string; PreferenceID?: number }[] | number[] | undefined
  ) => {
    if (!preferences) return [];
    return preferences.map((p) => (typeof p === 'object' ? p.name || 'Unknown' : 'Preference'));
  };

  const totalCalories = calculateTotalCalories();

  return (
    <Card className={`rounded-2xl border-border bg-card shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
          Meal Composition
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3.5">
          <div>
            <h3 className="font-semibold text-foreground">{meal.name}</h3>
            {meal.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{meal.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 text-foreground">
              <Flame className="h-4 w-4 text-secondary" />
              <span className="text-lg font-bold">{totalCalories}</span>
              <span className="text-xs text-muted-foreground">kcal</span>
            </div>
            <p className="text-xs text-muted-foreground">{meal.mealFoods.length} ingredients</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ingredients Breakdown
          </h4>
          {meal.mealFoods.map((mealFood, index) => {
            const food = mealFood.food;
            const individualCalories = food.kCal * mealFood.quantity;
            const preferences = getPreferenceNames(food.preferences);

            return (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-border bg-background/60 p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{food.name}</span>
                    <span className="text-xs text-muted-foreground">× {mealFood.quantity}</span>
                  </div>

                  {preferences.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {preferences.map((pref, prefIndex) => (
                        <Badge key={prefIndex} variant="secondary" className="text-xs">
                          {pref}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                    <Flame className="h-3 w-3 text-secondary" />
                    <span>{individualCalories}</span>
                    <span className="text-xs text-muted-foreground">kcal</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{food.kCal} kcal/unit</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border pt-3 text-center text-xs text-muted-foreground">
          Created by <span className="font-medium text-foreground">{meal.profile?.username || 'Member'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
