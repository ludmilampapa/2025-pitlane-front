'use client';

import { useEffect, useState } from 'react';
import { Flame, Target, SlidersHorizontal, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SingleValueSlider } from '@/components/common/sliders';
import { useUser } from '@/lib/contexts/UserContext';
import { useCalorieProgress } from '@/lib/hooks/useKcalProgress';
import { API_BASE_URL } from '@/lib/config/api';
import { createClient } from '@/lib/supabase/client';

const PRESET_GOALS = [
  { label: 'Light', value: 1500 },
  { label: 'Moderate', value: 2000 },
  { label: 'Active', value: 2500 },
  { label: 'Athletic', value: 3200 },
];

const MIN_CALORIES = 1200;
const MAX_CALORIES = 3500;
const DEFAULT_CALORIES = 2000;

export function CalorieGoalCard() {
  const { userData } = useUser();
  const profile = userData.profile;
  const { progress, loading, updateCalorieGoal: updateGoalInHook } = useCalorieProgress();

  const currentGoal =
    progress?.goal && Number.isFinite(progress.goal) ? progress.goal : DEFAULT_CALORIES;
  const consumed = progress?.consumed || 0;
  const pct = Math.min(100, Math.round((consumed / Math.max(1, currentGoal)) * 100));
  const overGoal = consumed > currentGoal;

  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(currentGoal);
  const [inputValue, setInputValue] = useState(currentGoal.toString());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const clamped = Math.max(MIN_CALORIES, Math.min(MAX_CALORIES, currentGoal));
    setGoal(clamped);
    setInputValue(clamped.toString());
  }, [currentGoal]);

  const handleSave = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`${API_BASE_URL}/profile/${profile.id}/calorie-goal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ calorieGoal: goal }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update calorie goal: ${response.status}`);
      }

      await updateGoalInHook(goal);
      toast.success(`Daily calorie goal updated to ${goal.toLocaleString()} kcal`);
      setEditing(false);
    } catch (error) {
      console.error('Error updating calorie goal:', error);
      toast.error('Could not update calorie goal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Target className="h-4 w-4 shrink-0 text-primary" />
            Daily Calorie Goal
          </h2>
          <p className="text-xs text-muted-foreground">
            Track today&apos;s intake and adjust your daily target.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing((prev) => !prev)}
          className="shrink-0 rounded-xl border-border bg-background text-xs font-semibold text-foreground hover:bg-muted"
        >
          {editing ? (
            <>
              <X className="mr-1 h-3.5 w-3.5" />
              Close
            </>
          ) : (
            <>
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Edit goal
            </>
          )}
        </Button>
      </div>

      {/* Today's progress summary */}
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-secondary" />
            <span className="text-xl font-bold tabular-nums text-foreground">
              {consumed.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">
              / {currentGoal.toLocaleString()} kcal
            </span>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
              overGoal
                ? 'bg-secondary/15 text-secondary'
                : 'bg-primary/15 text-primary'
            }`}
          >
            {Math.round((consumed / Math.max(1, currentGoal)) * 100)}%
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overGoal ? 'bg-secondary' : 'bg-primary'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {overGoal
            ? `${(consumed - currentGoal).toLocaleString()} kcal above today's goal`
            : `${Math.max(0, currentGoal - consumed).toLocaleString()} kcal remaining today`}
        </p>
      </div>

      {/* Expandable goal editor */}
      {editing && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESET_GOALS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  setGoal(preset.value);
                  setInputValue(preset.value.toString());
                }}
                className={`rounded-xl border px-2.5 py-2 text-left transition-colors ${
                  goal === preset.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-foreground hover:bg-muted/60'
                }`}
              >
                <div className="text-xs font-semibold">{preset.label}</div>
                <div className="text-[11px] opacity-80">{preset.value} kcal</div>
              </button>
            ))}
          </div>

          <SingleValueSlider
            value={goal}
            onValueChange={(val) => {
              setGoal(val);
              setInputValue(val.toString());
            }}
            min={MIN_CALORIES}
            max={MAX_CALORIES}
            step={50}
            className="w-full"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                aria-label="Daily calorie goal"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n)) {
                    setGoal(Math.max(MIN_CALORIES, Math.min(MAX_CALORIES, n)));
                  }
                }}
                onBlur={() => {
                  const n = parseInt(inputValue, 10);
                  const clamped = Number.isNaN(n)
                    ? goal
                    : Math.max(MIN_CALORIES, Math.min(MAX_CALORIES, n));
                  setGoal(clamped);
                  setInputValue(clamped.toString());
                }}
                min={MIN_CALORIES}
                max={MAX_CALORIES}
                className="h-9 w-24 text-sm"
              />
              <span className="text-xs text-muted-foreground">kcal / day</span>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || goal === currentGoal}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save goal'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
