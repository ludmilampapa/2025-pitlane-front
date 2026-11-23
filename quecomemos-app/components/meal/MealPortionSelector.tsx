'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalorieProjectionBar } from '@/components/profile/CalorieProjectionBar';

interface MealFood { foodId: number; foodName: string; quantity: number; svgLink?: string; kCal: number; }
interface Meal { mealId: number; name: string; description?: string; mealFoods: MealFood[]; totalCalories: number; }

export interface PortionData {
  mode: 'percentage';
  portionFraction: number;
  foodPortions: Array<{ foodId: number; portionFraction: number; absoluteQuantity: number }>;
  totalCalories: number;
}

interface Props {
  meal: Meal;
  onConfirm: (portionData: PortionData) => void;
  onCancel: () => void;
  loading?: boolean;
  profileId?: string;
  date?: Date;
}

export function MealPortionSelector({ meal, onConfirm, onCancel, loading = false, profileId, date }: Props) {
  const [portions, setPortions] = useState<Record<number, number>>(() => Object.fromEntries(meal.mealFoods.map((food) => [food.foodId, food.quantity])));
  const [inputs, setInputs] = useState<Record<number, string>>(() => Object.fromEntries(meal.mealFoods.map((food) => [food.foodId, food.quantity.toString()])));

  const selectedCalories = meal.mealFoods.reduce((sum, food) => sum + food.kCal * (portions[food.foodId] ?? food.quantity), 0);
  const percentage = meal.totalCalories > 0 ? Math.round(selectedCalories * 100 / meal.totalCalories) : 0;

  const applyFraction = (fraction: number) => {
    const nextPortions: Record<number, number> = {};
    const nextInputs: Record<number, string> = {};
    meal.mealFoods.forEach((food) => {
      const quantity = food.quantity * fraction;
      nextPortions[food.foodId] = quantity;
      nextInputs[food.foodId] = quantity.toString();
    });
    setPortions(nextPortions);
    setInputs(nextInputs);
  };

  const updateFood = (food: MealFood, value: string) => {
    setInputs((current) => ({ ...current, [food.foodId]: value }));
    if (value === '') {
      setPortions((current) => ({ ...current, [food.foodId]: 0 }));
      return;
    }
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      setPortions((current) => ({ ...current, [food.foodId]: Math.max(0, Math.min(food.quantity, parsed)) }));
    }
  };

  const increment = (food: MealFood) => {
    const current = portions[food.foodId] ?? food.quantity;
    const next = Math.min(food.quantity, current + food.quantity / 8);
    setPortions((values) => ({ ...values, [food.foodId]: next }));
    setInputs((values) => ({ ...values, [food.foodId]: next.toString() }));
  };

  const decrement = (food: MealFood) => {
    const current = portions[food.foodId] ?? food.quantity;
    const next = Math.max(0, current - food.quantity / 8);
    setPortions((values) => ({ ...values, [food.foodId]: next }));
    setInputs((values) => ({ ...values, [food.foodId]: next.toString() }));
  };

  const confirm = () => {
    const foodPortions = meal.mealFoods.map((food) => {
      const absoluteQuantity = portions[food.foodId] ?? food.quantity;
      return {
        foodId: food.foodId,
        portionFraction: food.quantity > 0 ? absoluteQuantity / food.quantity : 0,
        absoluteQuantity,
      };
    });

    onConfirm({
      mode: 'percentage',
      portionFraction: meal.totalCalories > 0 ? selectedCalories / meal.totalCalories : 0,
      foodPortions,
      totalCalories: selectedCalories,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" /><span className="font-semibold text-foreground">Porción total</span></div>
          <span className="text-2xl font-bold text-primary">{percentage}%</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm text-muted-foreground">
          <span>Calorías seleccionadas</span>
          <span><span className="font-bold text-secondary">{selectedCalories.toFixed(0)}</span><span className="text-muted-foreground"> / {meal.totalCalories} kcal</span></span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">Porción rápida</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: '1/4', fraction: 0.25 },
            { label: '1/2', fraction: 0.5 },
            { label: '3/4', fraction: 0.75 },
            { label: 'Porción entera', fraction: 1 },
          ].map((option) => (
            <Button key={option.label} type="button" variant="outline" onClick={() => applyFraction(option.fraction)} disabled={loading} className="h-10 border-border bg-card px-2 text-xs text-foreground hover:border-primary hover:bg-primary/10">
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2"><h4 className="font-medium text-foreground">Personalizar ingredientes</h4><div className="h-px flex-grow bg-border" /></div>
        {meal.mealFoods.map((food) => {
          const quantity = portions[food.foodId] ?? food.quantity;
          const portionPercentage = ((quantity / food.quantity) * 100).toFixed(0);
          return (
            <div key={food.foodId} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              {food.svgLink && (
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-border bg-background">
                  <Image src={food.svgLink} alt={food.foodName} width={48} height={48} className="h-full w-full object-contain p-1" />
                </div>
              )}
              <div className="min-w-0 flex-grow"><div className="truncate font-medium text-foreground">{food.foodName}</div><div className="mt-0.5 text-xs text-muted-foreground">{food.kCal} kcal por unidad • Máximo: {food.quantity} unidades</div></div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => decrement(food)} disabled={loading || quantity === 0} className="h-8 w-8 bg-card p-0"><Minus className="h-3 w-3" /></Button>
                <div className="flex min-w-[90px] flex-col items-center">
                  <input type="number" value={inputs[food.foodId] ?? quantity.toString()} onChange={(event) => updateFood(food, event.target.value)} className="w-20 rounded-lg border border-border bg-card px-2 py-1 text-center text-sm text-foreground" step="0.001" min="0" max={food.quantity} disabled={loading} />
                  <span className="mt-1 text-xs font-semibold text-secondary">{portionPercentage}%</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => increment(food)} disabled={loading || quantity >= food.quantity} className="h-8 w-8 bg-card p-0"><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1 border-border bg-card text-foreground hover:bg-muted">Cancelar</Button>
        <Button type="button" onClick={confirm} disabled={loading} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">{loading ? 'Confirmando...' : 'Confirmar porción'}</Button>
      </div>

      {profileId && <CalorieProjectionBar profileId={profileId} selectedCalories={selectedCalories} date={date} />}
    </div>
  );
}
