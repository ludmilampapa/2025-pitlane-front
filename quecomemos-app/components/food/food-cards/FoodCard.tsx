'use client';

import { useState, useRef } from 'react';
import { Utensils, Heart, Eye, SquarePen, Hexagon } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { useKorvenCheck } from '@/components/meal/hooks/useKorvenCheck';

interface Food {
  FoodID: number;
  name: string;
  kCal: number;
  svgLink?: string;
  profileId?: string;
  dietaryRestrictions?: { name?: string; DietaryRestrictionID?: number }[] | number[];
  preferences?: { name?: string; PreferenceID?: number }[] | number[];
  [key: string]: unknown;
}

interface FoodCardProps {
  food: Food;
  variant?: 'simple' | 'enhanced' | 'editable';
  onCardClick?: (food: Food) => void;
  onEditClick?: (food: Food) => void;
  isOwner?: boolean;
  showPreferenceBadge?: boolean;
  preferenceNames?: { [key: number]: string };
  restrictionNames?: { [key: number]: string };
  className?: string;
}

export function FoodCard({ 
  food, 
  variant = 'simple',
  onCardClick, 
  onEditClick,
  isOwner = false,
  showPreferenceBadge = false,
  preferenceNames = {},
  restrictionNames = {},
  className
}: FoodCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { isKorvenInspiredFood } = useKorvenCheck();
  const isKorven = isKorvenInspiredFood(food.name);

  // Get preference and restriction names for display
  const getPreferenceNames = () => {
    if (!food.preferences) return [];
    return food.preferences.map(p => {
      const id = typeof p === 'number' ? p : p.PreferenceID;
      return preferenceNames[id!] || (typeof p === 'object' && p.name ? p.name : `Preference ${id}`);
    }).filter(Boolean);
  };

  const getRestrictionNames = () => {
    if (!food.dietaryRestrictions) return [];
    return food.dietaryRestrictions.map(r => {
      const id = typeof r === 'number' ? r : r.DietaryRestrictionID;
      return restrictionNames[id!] || (typeof r === 'object' && r.name ? r.name : `Restriction ${id}`);
    }).filter(Boolean);
  };

  if (variant === 'simple') {
    const preferenceNamesArray = getPreferenceNames();
    const restrictionNamesArray = getRestrictionNames();

    return (
      <>
      <div
        ref={cardRef}
        className={`group bg-card border border-border hover:border-primary/50 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 hover:-translate-y-0.5 overflow-hidden rounded-xl w-[200px] md:w-[220px] h-[280px] flex-shrink-0 touch-manipulation flex flex-col ${className || ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => onCardClick?.(food)}
        >
          {/* Image Section */}
          <div className="relative h-24 md:h-28 flex items-center justify-center bg-gradient-to-b from-primary/15 to-primary/5 border-b border-border/60 overflow-hidden">
            {food.svgLink ? (
              <Image 
                src={food.svgLink} 
                alt={food.name} 
                width={60}
                height={60}
                className="object-contain transition-transform duration-300 group-hover:scale-105" 
              />
            ) : (
              <Utensils className="w-12 h-12 text-primary transition-transform duration-300 group-hover:scale-105" />
            )}
            
            {/* Hover overlay */}
            <div className={`absolute inset-0 bg-foreground/10 flex items-center justify-center transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              <Eye className="w-6 h-6 text-foreground" />
            </div>

          </div>

          {/* Content Section */}
          <div className="p-3 space-y-2 flex-1 flex flex-col">
            {/* Title */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground transition-colors line-clamp-2 leading-tight">
                {food.name}
              </h3>
              {isKorven && (
                <span className="text-xs bg-amber-500/15 border border-amber-500/35 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Hexagon className="w-3 h-3 fill-amber-500/30" />
                  TheMealDB
                </span>
              )}
            </div>

            {/* Calories */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Calories:</span>
              <div className="bg-primary/10 border border-primary/25 text-primary font-bold text-xs px-1.5 py-0.5 rounded">
                {food.kCal} kCal
              </div>
            </div>

            {/* Preferences */}
            {preferenceNamesArray.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Preferences:</p>
                <div className="flex flex-wrap gap-1">
                  {preferenceNamesArray.slice(0, 1).map((name, index) => (
                    <div key={index} className="bg-secondary/15 border border-secondary/35 text-foreground text-xs px-1.5 py-0.5 rounded">
                      {name}
                    </div>
                  ))}
                  {preferenceNamesArray.length > 1 && (
                    <div className="text-xs bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded">
                      +{preferenceNamesArray.length - 1}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dietary Restrictions */}
            {restrictionNamesArray.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Dietary Info:</p>
                <div className="flex flex-wrap gap-1">
                  {restrictionNamesArray.slice(0, 2).map((name, index) => (
                    <div key={index} className="bg-emerald-500/15 border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 text-xs px-1.5 py-0.5 rounded">
                      {name}
                    </div>
                  ))}
                  {restrictionNamesArray.length > 2 && (
                    <div className="bg-muted border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 text-xs px-1.5 py-0.5 rounded">
                      +{restrictionNamesArray.length - 2}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Click indicator */}
            <div className="flex items-center justify-between pt-1 border-t border-border mt-auto">
              <span className="text-xs text-muted-foreground">View details</span>
              <Eye className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (variant === 'enhanced') {
    const preferenceNamesList = getPreferenceNames();
    const restrictionNamesList = getRestrictionNames();

    return (
      <Card
        ref={cardRef}
        className={`group bg-card border-border hover:border-primary/50 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 overflow-hidden w-[220px] flex-shrink-0 h-[400px] flex flex-col rounded-xl ${className || ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onCardClick?.(food)}
      >
  <CardContent className="p-0 flex flex-col h-full min-h-0">
          {/* Image Section */}
          <div className="relative h-32 flex items-center justify-center bg-gradient-to-b from-primary/15 to-primary/5 border-b border-border/60 overflow-hidden">
            {food.svgLink ? (
              <Image 
                src={food.svgLink} 
                alt={food.name} 
                width={80}
                height={80}
                className="object-contain transition-transform duration-300 group-hover:scale-105" 
              />
            ) : (
              <Utensils className="w-16 h-16 text-primary transition-transform duration-300 group-hover:scale-105" />
            )}
            
            {/* Hover overlay */}
            <div className={`absolute inset-0 bg-foreground/10 flex items-center justify-center transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              <Eye className="w-8 h-8 text-foreground" />
            </div>

            {/* Preference badge: show only when both preferences AND dietary restrictions match */}
            {showPreferenceBadge && preferenceNamesList.length > 0 && restrictionNamesList.length > 0 && (
              <div className="absolute top-2 right-2">
                <div className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full shadow-xs">
                  <Heart className="w-3 h-3 mr-1 inline-block" />
                  <span className="align-middle">Match</span>
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4 space-y-3 flex-1 flex flex-col min-h-0">
            {/* Title */}
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground transition-colors line-clamp-2">
                {food.name}
              </h3>
              {isKorven && (
                <span className="text-xs bg-amber-500/15 border border-amber-500/35 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Hexagon className="w-3 h-3 fill-amber-500/30" />
                  TheMealDB
                </span>
              )}
            </div>

            {/* Calories */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Calories:</span>
              <div className="text-sm bg-primary/10 border border-primary/25 text-primary font-bold px-2 py-0.5 rounded">
                {food.kCal} kCal
              </div>
            </div>

            {/* Preferences */}
            {preferenceNamesList.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Preferences:</p>
                <div className="flex flex-wrap gap-1">
                  {preferenceNamesList.slice(0, 2).map((name, index) => (
                    <div key={index} className="text-xs bg-secondary/15 border border-secondary/35 text-foreground px-2 py-0.5 rounded">
                      {name}
                    </div>
                  ))}
                  {preferenceNamesList.length > 2 && (
                    <div className="text-xs bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded">
                      +{preferenceNamesList.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dietary Restrictions */}
            {restrictionNamesList.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Dietary Info:</p>
                <div className="flex flex-wrap gap-1">
                  {restrictionNamesList.slice(0, 2).map((name, index) => (
                    <div key={index} className="text-xs bg-emerald-500/15 border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                      {name}
                    </div>
                  ))}
                  {restrictionNamesList.length > 2 && (
                    <div className="text-xs border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                      +{restrictionNamesList.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Click to view more indicator */}
            <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
              <span className="text-xs text-muted-foreground">
                Click for details
              </span>
              <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'editable') {
    const preferenceNamesList = getPreferenceNames();
    const restrictionNamesList = getRestrictionNames();

    return (
      <Card
        ref={cardRef}
        className={`group bg-card border-border hover:border-primary/50 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 overflow-hidden w-[220px] flex-shrink-0 h-[400px] flex flex-col rounded-xl ${className || ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onCardClick?.(food)}
      >
  <CardContent className="p-0 flex flex-col h-full relative min-h-0">
          {/* Edit button - only show if user owns this food */}
          {isOwner && onEditClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(food);
              }}
              className="absolute top-2 right-2 z-20 bg-card/90 border border-border hover:bg-muted p-2 rounded-full shadow-xs transition-all"
              title="Edit Food"
            >
              <SquarePen className="w-4 h-4 text-foreground" />
            </button>
          )}

          {/* Image Section */}
          <div className="relative h-32 flex items-center justify-center bg-gradient-to-b from-primary/15 to-primary/5 border-b border-border/60 overflow-hidden">
            {food.svgLink ? (
              <Image 
                src={food.svgLink} 
                alt={food.name} 
                width={80}
                height={80}
                className="object-contain transition-transform duration-300 group-hover:scale-105" 
              />
            ) : (
              <Utensils className="w-16 h-16 text-primary transition-transform duration-300 group-hover:scale-105" />
            )}
            
            {/* Hover overlay */}
            <div className={`absolute inset-0 bg-foreground/10 flex items-center justify-center transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              <Eye className="w-8 h-8 text-foreground" />
            </div>

            {/* Preference badge: show only when both preferences AND dietary restrictions match */}
            {showPreferenceBadge && preferenceNamesList.length > 0 && restrictionNamesList.length > 0 && (
              <div className="absolute top-2 right-2">
                <div className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full shadow-xs">
                  <Heart className="w-3 h-3 mr-1 inline-block" />
                  <span className="align-middle">Match</span>
                </div>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4 space-y-3 flex-1 flex flex-col min-h-0">
            {/* Title */}
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground transition-colors line-clamp-2">
                {food.name}
              </h3>
              {isKorven && (
                <span className="text-xs bg-amber-500/15 border border-amber-500/35 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Hexagon className="w-3 h-3 fill-amber-500/30" />
                  TheMealDB
                </span>
              )}
            </div>

            {/* Calories */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Calories:</span>
              <div className="text-sm bg-primary/10 border border-primary/25 text-primary font-bold px-2 py-0.5 rounded">
                {food.kCal} kCal
              </div>
            </div>

            {/* Preferences */}
            {preferenceNamesList.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Preferences:</p>
                <div className="flex flex-wrap gap-1">
                  {preferenceNamesList.slice(0, 2).map((name, index) => (
                    <div key={index} className="text-xs bg-secondary/15 border border-secondary/35 text-foreground px-2 py-0.5 rounded">
                      {name}
                    </div>
                  ))}
                  {preferenceNamesList.length > 2 && (
                    <div className="text-xs bg-muted border border-border text-muted-foreground px-2 py-0.5 rounded">
                      +{preferenceNamesList.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dietary Restrictions */}
            {restrictionNamesList.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Dietary Info:</p>
                <div className="flex flex-wrap gap-1">
                  {restrictionNamesList.slice(0, 2).map((name, index) => (
                    <div key={index} className="text-xs bg-emerald-500/15 border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                      {name}
                    </div>
                  ))}
                  {restrictionNamesList.length > 2 && (
                    <div className="text-xs border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                      +{restrictionNamesList.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Click to view more indicator */}
            <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
              <span className="text-xs text-muted-foreground">
                Click for details
              </span>
              <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

export default FoodCard;