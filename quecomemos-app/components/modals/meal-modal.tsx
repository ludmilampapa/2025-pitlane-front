"use client";

import { useEffect, useState } from "react";
import { X, ChefHat, Clock, Users, User, Utensils, Edit, Hexagon } from "lucide-react";
import Image from "next/image";
import { useUser } from "@/lib/contexts/UserContext";
import { useKorvenCheck } from "@/components/meal/hooks/useKorvenCheck";

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
  mealFoods: {
    food: {
      FoodID: number;
      name: string;
      svgLink?: string;
      kCal: number;
      dietaryRestrictions?: { name?: string; DietaryRestrictionID?: number }[] | number[];
      preferences?: { name?: string; PreferenceID?: number }[] | number[];
    };
    quantity: number;
  }[];
}

interface MealModalProps {
  meal: Meal | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (meal: Meal) => void;
}

export function MealModal({ meal, isOpen, onClose, onEdit }: MealModalProps) {
  const { userData } = useUser();
  const [isOwner, setIsOwner] = useState(false);
  const [expandedPrefs, setExpandedPrefs] = useState<Record<number, boolean>>({});
  const [expandedRestrs, setExpandedRestrs] = useState<Record<number, boolean>>({});
  const { isKorvenInspiredMeal, isKorvenInspiredFood } = useKorvenCheck();

  // Check if current user is the owner of the meal
  useEffect(() => {
    if (meal && userData?.profile) {
      setIsOwner(meal.profileId === userData.profile.id);
    }
  }, [meal, userData]);

  // Close modal with ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !meal) return null;

  // Calculate total calories
  const totalCalories = meal.mealFoods.reduce((total, mealFood) => {
    return total + (mealFood.food.kCal * mealFood.quantity);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-card rounded-t-2xl border-b border-border p-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Meal Details</h2>
            <div className="flex items-center gap-2">
              {/* Edit button for owner */}
              {isOwner && onEdit && (
                <button
                  onClick={() => onEdit(meal)}
                  className="p-2 hover:bg-accent rounded-full transition-colors text-primary hover:text-foreground"
                  aria-label="Edit meal"
                >
                  <Edit className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          {/* Meal Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1">
                <h3 className="text-2xl font-bold text-foreground">{meal.name}</h3>
                {isKorvenInspiredMeal(meal.name) && (
                  <span className="text-xs bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Hexagon className="w-3 h-3 fill-primary/20" />
                    TheMealDB
                  </span>
                )}
              </div>
              <div className="text-sm text-primary bg-muted px-3 py-1 rounded-full">
                {totalCalories} kCal total
              </div>
            </div>
            
            {meal.description && (
              <p className="text-muted-foreground mb-4">{meal.description}</p>
            )}

            {/* Meal Info */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
              {meal.preparationTime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{meal.preparationTime} min</span>
                </div>
              )}
              {meal.servings && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{meal.servings} serving{meal.servings !== 1 ? 's' : ''}</span>
                </div>
              )}
              {meal.createdAt && (
                <div className="flex items-center gap-1">
                  <ChefHat className="w-4 h-4" />
                  <span>{new Date(meal.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Creator Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Created by: {meal.profile.username || 'Anonymous'}</span>
              <span className="capitalize bg-muted px-2 py-1 rounded text-xs">
                {meal.profile.role}
              </span>
            </div>
          </div>

          {/* Foods Section */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
              Foods ({meal.mealFoods.length})
            </h4>
            
            {meal.mealFoods.length > 0 ? (
              <div className="space-y-3">
                {meal.mealFoods.map((mealFood, index) => (
                  <div 
                    key={index} 
                    className="bg-muted border border-border rounded-lg p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 flex items-center justify-center bg-muted rounded-full border border-border flex-shrink-0">
                      {mealFood.food.svgLink ? (
                        <Image 
                          src={mealFood.food.svgLink} 
                          alt={mealFood.food.name} 
                          width={24}
                          height={24}
                          className="w-6 h-6 object-contain" 
                        />
                      ) : (
                        <Utensils className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-foreground">{mealFood.food.name}</h5>
                          {isKorvenInspiredFood(mealFood.food.name) && (
                            <span className="text-xs bg-primary/10 text-primary border border-primary/25 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <Hexagon className="w-2.5 h-2.5 fill-primary/20" />
                              TheMealDB
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-primary">
                          {mealFood.food.kCal * mealFood.quantity} kCal
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Quantity: {mealFood.quantity} • {mealFood.food.kCal} kCal per unit
                      </div>
                      
                      {/* Food tags */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {mealFood.food.preferences && mealFood.food.preferences.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {(expandedPrefs[index] ? mealFood.food.preferences : mealFood.food.preferences.slice(0, 2)).map((pref, prefIndex) => (
                              <span
                                key={prefIndex}
                                className="bg-muted text-foreground text-xs px-2 py-1 rounded"
                              >
                                {typeof pref === 'string' ? pref : 
                                 typeof pref === 'number' ? `ID: ${pref}` : 
                                 pref.name || `ID: ${pref.PreferenceID}`}
                              </span>
                            ))}
                            {mealFood.food.preferences.length > 2 && (
                              <button
                                onClick={() => setExpandedPrefs(prev => ({ ...prev, [index]: !prev[index] }))}
                                className="bg-muted text-foreground text-xs px-2 py-1 rounded hover:underline"
                              >
                                {expandedPrefs[index] ? 'Show less' : `+${mealFood.food.preferences.length - 2} more`}
                              </button>
                            )}
                          </div>
                        )}
                        {mealFood.food.dietaryRestrictions && mealFood.food.dietaryRestrictions.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {(expandedRestrs[index] ? mealFood.food.dietaryRestrictions : mealFood.food.dietaryRestrictions.slice(0, 2)).map((restriction, restrictionIndex) => (
                              <span
                                key={restrictionIndex}
                                className="bg-green-800/40 text-green-200 text-xs px-2 py-1 rounded"
                              >
                                {typeof restriction === 'string' ? restriction : 
                                 typeof restriction === 'number' ? `ID: ${restriction}` : 
                                 restriction.name || `ID: ${restriction.DietaryRestrictionID}`}
                              </span>
                            ))}
                            {mealFood.food.dietaryRestrictions.length > 2 && (
                              <button
                                onClick={() => setExpandedRestrs(prev => ({ ...prev, [index]: !prev[index] }))}
                                className="bg-green-800/40 text-green-200 text-xs px-2 py-1 rounded hover:underline"
                              >
                                {expandedRestrs[index] ? 'Show less' : `+${mealFood.food.dietaryRestrictions.length - 2} more`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No foods found for this meal
              </p>
            )}
          </div>

          {/* Close Button */}
          <div className="pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-colors shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}