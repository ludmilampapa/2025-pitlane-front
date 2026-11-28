'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Leaf, Utensils, Flame, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MealSearchBar } from '../meal/MealSearchBar';
import { MealComposition } from '../meal/MealComposition';
import AddMealForm from '../meal/AddMealForm';
import { GroupSwipeMatch } from './GroupSwipeMatch';
import { useMeals, Meal } from '@/lib/contexts/MealsContext';
import { useUser } from '@/lib/contexts/UserContext';
import { fetchGroupDietaryInfo } from '@/lib/utils/groupService';
import type { VotingSession } from './types';

interface GroupDietaryInfo {
  dietaryRestrictions: Array<{
    DietaryRestrictionID: number;
    name: string;
  }>;
  preferences: Array<{
    PreferenceID: number;
    name: string;
  }>;
}

interface ProposeMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropose: (mealId: number) => void;
  groupId: number;
  session?: VotingSession | null;
  initialTab?: 'swipe' | 'manual';
}

export function ProposeMealModal({
  isOpen,
  onClose,
  onPropose,
  groupId,
  session = null,
  initialTab = 'swipe',
}: ProposeMealModalProps) {
  const { userData } = useUser();
  const { allMeals, fetchAllMeals } = useMeals();

  const [activeTab, setActiveTab] = useState<'swipe' | 'manual'>(initialTab);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [groupDietaryInfo, setGroupDietaryInfo] = useState<GroupDietaryInfo | null>(null);
  const [showCreateMeal, setShowCreateMeal] = useState(false);

  const userRestrictions = userData?.preferences?.dietaryRestrictions || [];
  const groupRestrictions =
    groupDietaryInfo?.dietaryRestrictions?.map((r) => r.DietaryRestrictionID) || [];

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (allMeals.length === 0) {
        void fetchAllMeals(userData?.profile?.id);
      }
    }
  }, [isOpen, initialTab, allMeals.length, fetchAllMeals, userData?.profile?.id]);

  useEffect(() => {
    const fetchGroupInfo = async () => {
      if (groupId && isOpen) {
        try {
          const info = await fetchGroupDietaryInfo(groupId.toString());
          setGroupDietaryInfo(info);
        } catch (error) {
          console.error('Error fetching group dietary info:', error);
        }
      }
    };
    void fetchGroupInfo();
  }, [groupId, isOpen]);

  const handlePropose = () => {
    if (selectedMeal) {
      onPropose(selectedMeal.MealID);
      setSelectedMeal(null);
    }
  };

  const handleClose = () => {
    setSelectedMeal(null);
    setShowCreateMeal(false);
    onClose();
  };

  const handleMealCreated = (createdMeal: Partial<Meal> & { MealID: number }) => {
    setShowCreateMeal(false);
    setSelectedMeal(createdMeal as Meal);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Propose a Dish</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Search the catalog or create a new meal &amp; foods to propose.
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            aria-label="Close modal"
            className="rounded-xl text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-5 p-6">
          <>
              {groupDietaryInfo && groupDietaryInfo.dietaryRestrictions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                    <Leaf className="h-3.5 w-3.5" />
                    Active Group Restrictions:
                  </span>
                  {groupDietaryInfo.dietaryRestrictions.map((r) => (
                    <Badge
                      key={r.DietaryRestrictionID}
                      variant="secondary"
                      className="border border-border bg-card text-foreground"
                    >
                      {r.name}
                    </Badge>
                  ))}
                </div>
              )}

              {!showCreateMeal ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      Search existing dishes or create a new meal and custom foods
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowCreateMeal(true)}
                      className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Create Meal / Food
                    </Button>
                  </div>

                  <MealSearchBar
                    allMeals={allMeals}
                    selectedMeal={selectedMeal}
                    onMealSelect={setSelectedMeal}
                    userRestrictions={userRestrictions}
                    groupRestrictions={groupRestrictions}
                    isGroupMode={true}
                    showAdvancedFilters={true}
                    placeholder="Search for a meal to add to the pool..."
                  />

                  {selectedMeal ? (
                    <div className="space-y-4 pt-2">
                      <MealComposition meal={selectedMeal} />

                      <div className="flex justify-end gap-2.5 border-t border-border pt-4">
                        <Button variant="outline" onClick={handleClose} className="rounded-xl">
                          Cancel
                        </Button>
                        <Button
                          onClick={handlePropose}
                          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Propose
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/20 py-10 text-center">
                      <Utensils className="mx-auto mb-2.5 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        Select a dish from the search bar above to preview its ingredients and add it.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateMeal(false)}
                    className="rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Back to Search
                  </Button>

                  <div className="rounded-2xl border border-border bg-background/60 p-5">
                    <AddMealForm
                      onFoodAdded={handleMealCreated}
                      onClose={() => setShowCreateMeal(false)}
                    />
                  </div>
                </div>
              )}
            </>
        </div>
      </div>
    </div>,
    document.body
  );
}
