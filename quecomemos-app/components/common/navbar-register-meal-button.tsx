'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Utensils } from 'lucide-react';
import { RegisterMealModal } from '@/components/modals';
import { useUser } from '@/lib/contexts/UserContext';
import { useMeals } from '@/lib/contexts/MealsContext';
import { useCalorieProgressContext } from '@/lib/contexts/CalorieProgressContext';
import { useGlobalNotification } from '@/lib/contexts/NotificationContext';
import { MealService, type RegisterMealData } from '@/lib/services/MealService';

export function NavbarRegisterMealButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { userData } = useUser();
  const { allMeals, fetchAllMeals } = useMeals();
  const { triggerRefresh } = useCalorieProgressContext();
  const { showSuccess, showError } = useGlobalNotification();

  const profileId = userData?.profile?.id;

  const handleOpen = () => {
    if (profileId && allMeals.length === 0) {
      void fetchAllMeals(profileId);
    }
    setIsOpen(true);
  };

  const handleSubmit = async (mealData: RegisterMealData) => {
    if (!profileId) {
      showError('Sign in required', 'Please sign in to register a meal.');
      return;
    }

    const meal = allMeals.find((m) => m.MealID === mealData.mealId);
    const mealName = meal?.name || 'Meal';

    const result = await MealService.registerIndividualMeal(
      mealData,
      profileId,
      mealName,
      triggerRefresh
    );

    if (result.success) {
      showSuccess(
        'Meal logged!',
        `${mealName} was added to your daily log.`,
        <Utensils className="h-6 w-6" />
      );
      setIsOpen(false);
    } else {
      showError('Could not register meal', result.error || 'Please try again.');
      throw new Error(result.error || 'Could not register meal');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="hidden rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:inline-flex"
      >
        Register a meal
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <RegisterMealModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onSubmit={handleSubmit}
          />,
          document.body
        )}
    </>
  );
}
