'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { VotingService } from './VotingService';
import { useGlobalNotification } from '@/lib/contexts/NotificationContext';
import { MealPortionSelector, type PortionData } from '@/components/meal';

interface MealFood {
  foodId: number;
  foodName: string;
  quantity: number;
  svgLink?: string;
  kCal: number;
}

interface WinnerMeal {
  mealId: number;
  name: string;
  description?: string;
  mealFoods: MealFood[];
  totalCalories: number;
}

interface PortionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  winnerMeal: WinnerMeal;
  userId: string;
  onSuccess?: () => void;
}

export function PortionSelectionModal({
  isOpen,
  onClose,
  sessionId,
  winnerMeal,
  userId,
  onSuccess,
}: PortionSelectionModalProps) {
  const { showSuccess, showError } = useGlobalNotification();
  const [loading, setLoading] = useState(false);

  const handlePortionConfirm = async (portionData: PortionData) => {
    setLoading(true);
    try {
      await VotingService.selectMealPortion(
        sessionId,
        userId,
        portionData.portionFraction,
        portionData.foodPortions
      );

      const percentLabel =
        portionData.mode === 'percentage'
          ? `${(portionData.portionFraction * 100).toFixed(0)}%`
          : 'Custom';

      showSuccess(
        'Portion Selected',
        `You've selected ${percentLabel} portion of ${winnerMeal.name} (${portionData.totalCalories} kcal)`
      );

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error selecting portion:', error);
      showError(
        'Selection Failed',
        error instanceof Error ? error.message : 'Failed to select portion'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b border-border/60 bg-card px-6 py-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xl font-bold text-foreground">
                Select Your Portion
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose how much of <span className="font-semibold text-foreground">{winnerMeal.name}</span> you had.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <MealPortionSelector
            meal={winnerMeal}
            onConfirm={handlePortionConfirm}
            onCancel={onClose}
            loading={loading}
            profileId={userId}
            date={new Date()}
          />
        </CardContent>
      </div>
    </div>,
    document.body
  );
}
