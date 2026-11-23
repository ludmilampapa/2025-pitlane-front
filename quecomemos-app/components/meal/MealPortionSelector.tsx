'use client';

import { useState } from 'react';
import { Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalorieProjectionBar } from '@/components/profile/CalorieProjectionBar';

interface MealFood {
  foodId: number;
  foodName: string;
  quantity: number;
  svgLink?: string;
  kCal: number;
}

interface Meal {
  mealId: number;
  name: string;
  description?: string;
  mealFoods: MealFood[];
  totalCalories: number;
}

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
  isWinner?: boolean;
}

const PORTION_PRESETS = [
  { label: '1/4', fraction: 0.25 },
  { label: '1/2', fraction: 0.5 },
  { label: '3/4', fraction: 0.75 },
  { label: 'Full', fraction: 1 },
];

export function PortionPlateSvg({
  percentage,
  size = 'lg',
}: {
  percentage: number;
  size?: 'md' | 'lg';
}) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const angle = (clamped / 100) * 360;
  const r = 34;
  const cx = 50;
  const cy = 50;

  const describePieSlice = (deg: number) => {
    if (deg <= 0) return '';
    if (deg >= 359.5) return null; // full circle
    const rad = ((deg - 90) * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    const largeArc = deg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`;
  };

  const slicePath = describePieSlice(angle);
  const clipId = `plate-clip-${clamped}-${size}`;
  const dimClass = size === 'md' ? 'h-20 w-20' : 'h-28 w-28';

  return (
    <div className={`relative flex ${dimClass} shrink-0 items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-label={`Portion ${clamped}%`}>
        <defs>
          <clipPath id={clipId}>
            {slicePath === null ? (
              <circle cx={cx} cy={cy} r={r} />
            ) : slicePath ? (
              <path d={slicePath} />
            ) : null}
          </clipPath>
        </defs>

        {/* Outer plate rim */}
        <circle cx={cx} cy={cy} r="46" className="fill-[#FAF6F0] stroke-[#2B211A] dark:fill-muted dark:stroke-border" strokeWidth="2.2" />
        {/* Inner plate bowl */}
        <circle cx={cx} cy={cy} r="37" className="fill-[#FFFDF9] stroke-[#E6DDD3] dark:fill-card dark:stroke-border" strokeWidth="1.5" />

        {/* Subtle quadrant divider lines */}
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} className="stroke-border/50" strokeWidth="0.8" strokeDasharray="2 2" />
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} className="stroke-border/50" strokeWidth="0.8" strokeDasharray="2 2" />

        {/* Filled portion slice with warm food texture */}
        {clamped > 0 && (
          <g clipPath={`url(#${clipId})`}>
            <circle cx={cx} cy={cy} r={r} fill="#D98A4E" />
            {/* Decorative food bits (greens & grains) clipped to the active slice */}
            <circle cx="62" cy="34" r="3.2" fill="#4A7C59" />
            <circle cx="71" cy="46" r="2.6" fill="#B8502C" />
            <circle cx="60" cy="56" r="3.5" fill="#4A7C59" />
            <circle cx="69" cy="65" r="2.8" fill="#F2C879" />
            <circle cx="56" cy="72" r="2.4" fill="#B8502C" />
            <circle cx="38" cy="64" r="3.2" fill="#4A7C59" />
            <circle cx="30" cy="54" r="2.6" fill="#F2C879" />
            <circle cx="36" cy="38" r="3.4" fill="#4A7C59" />
            <circle cx="44" cy="28" r="2.5" fill="#B8502C" />
            <circle cx="55" cy="42" r="2.2" fill="#F2C879" />
            <circle cx="45" cy="55" r="2.6" fill="#B8502C" />
          </g>
        )}

        {/* Crisp outline of the active slice */}
        {slicePath === null ? (
          <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-[#2B211A] dark:stroke-foreground" strokeWidth="1.8" />
        ) : slicePath ? (
          <path d={slicePath} fill="none" className="stroke-[#2B211A] dark:stroke-foreground" strokeWidth="1.8" strokeLinejoin="round" />
        ) : null}
      </svg>
    </div>
  );
}

export function MealPortionSelector({
  meal,
  onConfirm,
  onCancel,
  loading = false,
  profileId,
  date,
  isWinner = false,
}: Props) {
  const [portions, setPortions] = useState<Record<number, number>>(() =>
    Object.fromEntries(meal.mealFoods.map((food) => [food.foodId, food.quantity]))
  );

  const selectedCalories = meal.mealFoods.reduce(
    (sum, food) => sum + food.kCal * (portions[food.foodId] ?? food.quantity),
    0
  );
  const percentage =
    meal.totalCalories > 0 ? Math.round((selectedCalories * 100) / meal.totalCalories) : 0;

  const activePreset = PORTION_PRESETS.find(
    (p) => Math.abs(percentage - Math.round(p.fraction * 100)) <= 2
  )?.fraction;

  const applyFraction = (fraction: number) => {
    const nextPortions: Record<number, number> = {};
    meal.mealFoods.forEach((food) => {
      nextPortions[food.foodId] = Number((food.quantity * fraction).toFixed(3));
    });
    setPortions(nextPortions);
  };

  const handleSliderChange = (food: MealFood, pct: number) => {
    const clampedPct = Math.max(0, Math.min(100, pct));
    const quantity = Number(((food.quantity * clampedPct) / 100).toFixed(3));
    setPortions((current) => ({ ...current, [food.foodId]: quantity }));
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left Card: Meal Overview + Portion Selector + Plate Visual */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-7">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Portion Selector
              </p>
              <h3 className="mt-0.5 text-xl font-bold text-foreground">
                {isWinner ? `The Winner: ${meal.name}` : meal.name}
              </h3>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              {isWinner ? 'Winner' : `${Math.round(selectedCalories)} kcal`}
            </span>
          </div>

          {/* Warm editorial meal banner */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/15 via-muted/60 to-secondary/15 p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-card/90 text-primary shadow-sm">
                <Utensils className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {meal.description || 'Customize your portion size or fine-tune each ingredient.'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {meal.mealFoods.length} {meal.mealFoods.length === 1 ? 'ingredient' : 'ingredients'} · Full meal:{' '}
                  <strong className="text-foreground">{Math.round(meal.totalCalories)} kcal</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Select Your Portion + Dynamic Plate */}
        <div className="mt-6 flex flex-col items-center justify-between gap-5 border-t border-border pt-5 sm:flex-row">
          <div className="w-full flex-1 space-y-2.5">
            <p className="text-sm font-semibold text-foreground">Select Your Portion</p>
            <div className="grid grid-cols-4 gap-2">
              {PORTION_PRESETS.map((option) => {
                const isActive = activePreset === option.fraction;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => applyFraction(option.fraction)}
                    disabled={loading}
                    className={`h-11 rounded-xl border text-sm font-semibold transition-all ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-foreground hover:border-primary/60 hover:bg-muted'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <PortionPlateSvg percentage={percentage} />
        </div>
      </div>

      {/* Right Column: Ingredient Breakdown Sliders + Live Calorie Impact */}
      <div className="flex flex-col justify-between gap-4 lg:col-span-5">
        {/* Top Card: Customized Ingredient Breakdown */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-bold text-foreground">
            Customized Ingredient Breakdown
          </h4>
          <div className="max-h-60 space-y-4 overflow-y-auto pr-1">
            {meal.mealFoods.map((food, idx) => {
              const quantity = portions[food.foodId] ?? food.quantity;
              const pct = food.quantity > 0 ? Math.round((quantity / food.quantity) * 100) : 0;
              const kcal = Math.round(food.kCal * quantity);
              const accentClass = idx % 3 === 2 ? 'accent-secondary' : 'accent-primary';

              return (
                <div key={food.foodId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-semibold text-foreground">{food.foodName}</span>
                    <span className="shrink-0 text-muted-foreground">
                      <strong className="text-foreground">{pct}%</strong> · {kcal} kcal
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={pct}
                    disabled={loading}
                    onChange={(e) => handleSliderChange(food, Number(e.target.value))}
                    className={`h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted ${accentClass}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Card: Live Calorie & Budget Impact + CTA */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">Live Calorie &amp; Budget Impact</h4>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground">
              +{Math.round(selectedCalories)} kcal
            </span>
          </div>

          {profileId ? (
            <CalorieProjectionBar
              profileId={profileId}
              selectedCalories={selectedCalories}
              date={date}
            />
          ) : (
            <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
              Selected portion: <strong className="text-foreground">{Math.round(selectedCalories)} kcal</strong> ({percentage}% of full meal)
            </div>
          )}

          <div className="flex gap-2.5 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="border-border bg-background text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={confirm}
              disabled={loading}
              className="flex-1 bg-secondary font-semibold text-secondary-foreground hover:bg-secondary/90"
            >
              {loading ? 'Logging...' : 'Log to My Day'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
