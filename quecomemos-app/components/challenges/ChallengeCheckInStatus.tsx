'use client';

import { Check, Flame, Loader2, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChallengeCheckInStatusProps {
  isAutoTracked: boolean;
  todayCompleted: boolean;
  onCheckIn?: () => void | Promise<void>;
  loading?: boolean;
  actionLabel?: string;
  autoHint?: string;
  fullWidth?: boolean;
}

/**
 * Shared presenter for daily challenge completion status across Home, Group Dashboard, and Challenges.
 * Enforces one single UI criterion:
 * - Auto-tracked challenges (with pausedFoods) never render a manual check-in button.
 * - Manual challenges render a check-in action until completed today.
 */
export function ChallengeCheckInStatus({
  isAutoTracked,
  todayCompleted,
  onCheckIn,
  loading = false,
  actionLabel = 'Check in today',
  autoHint = 'Not completed today',
  fullWidth = false,
}: ChallengeCheckInStatusProps) {
  if (isAutoTracked) {
    if (todayCompleted) {
      return (
        <span
          title="Auto-tracked from today's logged meals"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary"
        >
          <Check className="h-3.5 w-3.5 shrink-0" />
          Completed today
        </span>
      );
    }
    return (
      <span
        title="Auto-tracked · Log at least 1 meal today without paused foods"
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200"
      >
        <Utensils className="h-3.5 w-3.5 shrink-0" />
        {autoHint}
      </span>
    );
  }

  if (todayCompleted) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
        <Check className="h-3.5 w-3.5 shrink-0" />
        Completed today
      </span>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => void onCheckIn?.()}
      disabled={loading || !onCheckIn}
      className={`bg-primary text-primary-foreground hover:bg-primary/90 ${fullWidth ? 'w-full' : ''}`}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Flame className="mr-1.5 h-3.5 w-3.5" />
      )}
      {actionLabel}
    </Button>
  );
}
