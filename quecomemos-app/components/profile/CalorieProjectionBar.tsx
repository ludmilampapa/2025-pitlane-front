'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { API_BASE_URL } from '@/lib/config/api';
import { formatArgentinaYMD } from '@/lib/utils/timezone';

interface CalorieProjectionBarProps {
  profileId: string;
  selectedCalories: number;
  date?: Date;
  className?: string;
}

interface CalorieProgressResponse {
  consumed?: number;
  goal?: number;
  calorieGoal?: number;
}

export function CalorieProjectionBar({ profileId, selectedCalories, date, className = '' }: CalorieProjectionBarProps) {
  const [consumed, setConsumed] = useState(0);
  const [goal, setGoal] = useState(2000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const dateParam = date ? `?date=${formatArgentinaYMD(date)}` : '';
        const response = await fetch(`${API_BASE_URL}/profile/${profileId}/calorie-progress${dateParam}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });

        if (!response.ok) throw new Error('Failed to load calorie progress');
        const data = await response.json() as CalorieProgressResponse;
        if (!cancelled) {
          setConsumed(data.consumed || 0);
          setGoal(data.goal || data.calorieGoal || 2000);
        }
      } catch {
        if (!cancelled) {
          setConsumed(0);
          setGoal(2000);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProgress();
    return () => { cancelled = true; };
  }, [profileId, date]);

  const projected = consumed + Math.max(0, selectedCalories);
  const percentage = goal > 0 ? Math.min(100, projected * 100 / goal) : 0;
  const overGoal = projected > goal;

  return (
    <div className={`rounded-2xl border border-[#E8E2D9] bg-[#FAF7F2] p-4 ${className}`}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4A7C59]">Daily projection</p>
          <p className="mt-1 text-sm text-neutral-600">{consumed} consumed + {Math.round(selectedCalories)} selected</p>
        </div>
        <p className={`text-sm font-bold ${overGoal ? 'text-[#C85A32]' : 'text-[#4A7C59]'}`}>
          {projected} / {goal} kcal
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-[#E8E2D9]" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={projected}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${overGoal ? 'bg-[#C85A32]' : 'bg-[#4A7C59]'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {loading ? (
        <p className="mt-2 text-xs text-neutral-500">Loading current calories…</p>
      ) : overGoal ? (
        <p className="mt-2 text-xs font-medium text-[#A84526]">Over daily goal by {projected - goal} kcal</p>
      ) : (
        <p className="mt-2 text-xs text-neutral-500">{goal - projected} kcal remaining</p>
      )}
    </div>
  );
}
