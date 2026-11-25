'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChefHat, Plus, X, AlertTriangle } from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { useMeals, Meal } from '@/lib/contexts/MealsContext';
import AddMealForm from '@/components/meal';
import { MealModal, EditMealForm } from '@/components/modals';
import { MealCard } from '@/components/meal';
import { Button } from '@/components/ui/button';

interface UserMealsProps {
  onfoodAdded?: () => void;
}

export function UserMeals({ onfoodAdded }: UserMealsProps = {}) {
  const { userData } = useUser();
  const {
    userMeals,
    loadingUserMeals,
    userMealsError,
    fetchUserMeals,
    updateMeal,
    addMeal,
  } = useMeals();

  const [openCreator, setOpenCreator] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const profile = userData?.profile;

  useEffect(() => {
    if (profile?.id) {
      void fetchUserMeals(profile.id);
    }
  }, [profile?.id, fetchUserMeals]);

  const handleMealClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setIsMealModalOpen(true);
  };

  const closeMealModal = () => {
    setIsMealModalOpen(false);
    setSelectedMeal(null);
  };

  const handleEditMeal = (meal: Meal) => {
    closeMealModal();
    setSelectedMeal(meal);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedMeal(null);
  };

  const handleEditSuccess = () => {
    closeEditModal();
    onfoodAdded?.();
  };

  const handleMealUpdated = (updatedMealData: Partial<Meal>) => {
    if (selectedMeal) {
      updateMeal(selectedMeal.MealID, updatedMealData);
    }
  };

  if (loadingUserMeals) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Your Meals</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  if (userMealsError) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Your Meals</h2>
        <div className="rounded-2xl border border-destructive/35 bg-destructive/10 py-10 text-center">
          <AlertTriangle className="mx-auto mb-2 h-10 w-10 text-destructive" />
          <p className="text-base font-semibold text-foreground">Unable to load meals</p>
          <p className="mt-1 text-sm text-muted-foreground">{userMealsError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Your Meals</h2>
          <p className="text-sm text-muted-foreground">
            {userMeals.length} {userMeals.length === 1 ? 'recipe' : 'recipes'} created by you
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setOpenCreator(true)}
          className="rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Meal
        </Button>
      </div>

      {/* Create Meal Modal */}
      {openCreator &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            onClick={() => setOpenCreator(false)}
          >
            <div
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h3 className="text-lg font-bold text-foreground">Create New Meal</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpenCreator(false)}
                  aria-label="Close modal"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6">
                <AddMealForm
                  onFoodAdded={(newMeal) => {
                    if (profile?.id && newMeal) {
                      addMeal(newMeal as Meal);
                    }
                    setOpenCreator(false);
                    onfoodAdded?.();
                  }}
                  onClose={() => setOpenCreator(false)}
                />
              </div>
            </div>
          </div>,
          document.body
        )}

      {userMeals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
            <ChefHat className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No meals created yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Combine your favorite ingredients into custom meals for logging and group votes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userMeals.map((meal) => (
            <MealCard
              key={meal.MealID}
              meal={meal}
              onClick={handleMealClick}
              showExtendedInfo={true}
              maxFoodsToShow={3}
            />
          ))}
        </div>
      )}

      {/* Meal Details Modal */}
      <MealModal
        meal={selectedMeal}
        isOpen={isMealModalOpen}
        onClose={closeMealModal}
        onEdit={handleEditMeal}
      />

      {/* Edit Meal Modal */}
      {isEditModalOpen &&
        selectedMeal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            onClick={closeEditModal}
          >
            <div
              className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h3 className="text-lg font-bold text-foreground">Edit Meal</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={closeEditModal}
                  aria-label="Close modal"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6">
                <EditMealForm
                  meal={selectedMeal}
                  onSuccess={handleEditSuccess}
                  onMealUpdated={handleMealUpdated}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
