"use client";

import { useEffect, useState } from "react";
import { X, Utensils, Hexagon } from "lucide-react";
import Image from "next/image";
import { useKorvenCheck } from "@/components/meal/hooks/useKorvenCheck";

interface Food {
  FoodID: number;
  name: string;
  kCal: number;
  svgLink?: string;
  dietaryRestrictions?: { name?: string; DietaryRestrictionID?: number }[] | number[];
  preferences?: { name?: string; PreferenceID?: number }[] | number[];
  [key: string]: unknown;
}

interface FoodModalProps {
  food: Food | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FoodModal({ food, isOpen, onClose }: FoodModalProps) {
  const [showAllPreferences, setShowAllPreferences] = useState(false);
  const [showAllRestrictions, setShowAllRestrictions] = useState(false);
  const { isKorvenInspiredFood } = useKorvenCheck();
  
  // Cerrar modal con ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !food) return null;

  // Función para obtener el nombre de las preferencias/restricciones
  const getDisplayName = (item: { name?: string; PreferenceID?: number; DietaryRestrictionID?: number } | string | number) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'number') return `ID: ${item}`;
    return item?.name || `ID: ${item?.PreferenceID || item?.DietaryRestrictionID || 'Unknown'}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-card rounded-t-2xl border-b border-border p-6 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Food Information</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          {/* Food Icon and Name */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-20 h-20 mb-4 flex items-center justify-center bg-muted rounded-full border border-border">
              {food.svgLink ? (
                <Image 
                  src={food.svgLink} 
                  alt={food.name} 
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain" 
                />
              ) : (
                <Utensils className="w-12 h-12 text-primary" />
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-2xl font-bold text-foreground">{food.name}</h3>
              {isKorvenInspiredFood(food.name) && (
                <span className="text-xs bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Hexagon className="w-3 h-3 fill-primary/20" />
                  TheMealDB
                </span>
              )}
            </div>
            <div className="inline-flex items-center bg-muted border border-border rounded-full px-3 py-1 mb-4 mt-2">
              <span className="text-foreground font-semibold">{food.kCal} kCal</span>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
              Preferences
            </h4>
            {food.preferences && food.preferences.length > 0 ? (
              <div className="space-y-2">
                {(showAllPreferences ? food.preferences : food.preferences.slice(0, 2)).map((preference, index) => (
                  <div 
                    key={index} 
                    className="bg-muted border border-border rounded-lg px-3 py-2"
                  >
                    <span className="text-foreground text-sm font-medium">
                      {getDisplayName(preference)}
                    </span>
                  </div>
                ))}
                {food.preferences.length > 2 && (
                  <div>
                    {!showAllPreferences ? (
                      <button
                        onClick={() => setShowAllPreferences(true)}
                        className="text-foreground text-sm font-medium hover:underline"
                      >
                        +{food.preferences.length - 2} more
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAllPreferences(false)}
                        className="text-foreground text-sm font-medium hover:underline"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No specific preferences associated
              </p>
            )}
          </div>

          {/* Dietary Restrictions Section */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Dietary Restrictions
            </h4>
            {food.dietaryRestrictions && food.dietaryRestrictions.length > 0 ? (
              <div className="space-y-2">
                {(showAllRestrictions ? food.dietaryRestrictions : food.dietaryRestrictions.slice(0, 2)).map((restriction, index) => (
                  <div 
                    key={index} 
                    className="bg-green-900/40 border border-green-700/50 rounded-lg px-3 py-2"
                  >
                    <span className="text-green-300 text-sm font-medium">
                      {getDisplayName(restriction)}
                    </span>
                  </div>
                ))}
                {food.dietaryRestrictions.length > 2 && (
                  <div>
                    {!showAllRestrictions ? (
                      <button
                        onClick={() => setShowAllRestrictions(true)}
                        className="text-green-300 text-sm font-medium hover:underline"
                      >
                        +{food.dietaryRestrictions.length - 2} more
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAllRestrictions(false)}
                        className="text-green-300 text-sm font-medium hover:underline"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No specific dietary restrictions
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