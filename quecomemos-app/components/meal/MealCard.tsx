"use client";

import { Card } from "@/components/ui/card";
import { ChefHat, Clock, User, Users, Hexagon } from "lucide-react";
import { DEFAULTS } from "./constants";
import { useKorvenCheck } from "./hooks/useKorvenCheck";

interface MealFood {
  food: {
    FoodID: number;
    name: string;
    svgLink?: string;
    kCal: number;
  };
  quantity: number;
}

interface Meal {
  MealID: number;
  name: string;
  description?: string;
  preparationTime?: number;
  servings?: number;
  createdAt: string;
  updatedAt: string;
  profileId: string;
  profile: {
    username?: string;
    id: string;
    role: string;
  };
  mealFoods: MealFood[];
}

interface MealCardProps {
  meal: Meal;
  onClick?: (meal: Meal) => void;
  showExtendedInfo?: boolean; // Controls whether to show prep time, servings, etc.
  maxFoodsToShow?: number; // How many foods to show before "X more"
  className?: string;
}

export function MealCard({ 
  meal, 
  onClick, 
  showExtendedInfo = true,
  maxFoodsToShow = DEFAULTS.MAX_FOODS_TO_SHOW,
  className = ""
}: MealCardProps) {
  const { isKorvenInspiredMeal } = useKorvenCheck();
  const isKorven = isKorvenInspiredMeal(meal.name);

  const handleClick = () => {
    if (onClick) {
      onClick(meal);
    }
  };

  const totalFoods = meal.mealFoods?.length || 0;
  const foodsToShow = meal.mealFoods?.slice(0, maxFoodsToShow) || [];
  const remainingFoods = Math.max(0, totalFoods - maxFoodsToShow);

  return (
    <Card
      className={`bg-card border-border hover:border-primary/50 shadow-sm hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={handleClick}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
              {meal.name}
            </h3>
            {isKorven && (
              <span className="text-xs bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/35 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                <Hexagon className="w-3 h-3 fill-amber-500/30" />
                TheMealDB
              </span>
            )}
          </div>
          <div className="flex items-center text-xs text-muted-foreground ml-2">
            <User className="h-3 w-3 mr-1" />
            <span className="capitalize">{meal.profile.role}</span>
          </div>
        </div>
        
        {/* Description */}
        {meal.description && (
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {meal.description}
          </p>
        )}
        
        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>{new Date(meal.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })}</span>
          </div>
          <div className="flex items-center">
            <ChefHat className="h-3 w-3 mr-1" />
            <span>{totalFoods} food{totalFoods !== 1 ? 's' : ''}</span>
          </div>
          {showExtendedInfo && meal.preparationTime && (
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <span>{meal.preparationTime} min</span>
            </div>
          )}
          {showExtendedInfo && meal.servings && (
            <div className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              <span>{meal.servings} serving{meal.servings !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Created by */}
        <div className="text-xs text-muted-foreground mb-3">
          Created by: <span className="font-medium text-foreground">{meal.profile.username || 'Anonymous'}</span>
        </div>

        {/* Foods in meal */}
        {totalFoods > 0 && (
          <div className="border-t border-border pt-3">
            <div className="text-xs text-muted-foreground mb-2">Foods:</div>
            <div className="flex flex-wrap gap-1.5">
              {foodsToShow.map((mealFood) => (
                <span
                  key={mealFood.food.FoodID}
                  className="bg-primary/10 border border-primary/25 text-foreground px-2 py-0.5 rounded-md text-xs font-medium"
                >
                  {mealFood.food.name}
                  {mealFood.quantity > 1 && (
                    <span className="ml-1 text-muted-foreground">
                      ×{mealFood.quantity}
                    </span>
                  )}
                </span>
              ))}
              {remainingFoods > 0 && (
                <span className="bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded-md text-xs">
                  +{remainingFoods} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default MealCard;