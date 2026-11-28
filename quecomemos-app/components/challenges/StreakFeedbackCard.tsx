'use client';

import { Flame, Snowflake, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChallengeCheckInStatus } from '@/components/challenges/ChallengeCheckInStatus';
import type { ChallengeProgress } from '@/lib/types/groupChallenges';

interface StreakFeedbackCardProps {
  progress: ChallengeProgress | null;
  challengeName: string;
  onMarkToday: () => Promise<void>;
  isAutoTracked?: boolean;
}

export function StreakFeedbackCard({
  progress,
  challengeName,
  onMarkToday,
  isAutoTracked = false,
}: StreakFeedbackCardProps) {
  const completedToday = progress?.todayCompleted ?? false;
  const streak = progress?.streak ?? 0;
  const completedDays = progress?.completedDays ?? 0;
  const totalDays = progress?.totalDays ?? 0;
  const percentage = progress?.percentage ?? 0;

  const progressBlock = totalDays > 0 && (
    <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-muted/25 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-foreground">Your progress</span>
        <span className="font-bold tabular-nums text-primary">
          {completedDays} / {totalDays} days ({percentage}%)
        </span>
      </div>
      <Progress value={Math.min(100, percentage)} className="h-2" />
    </div>
  );

  if (completedToday) {
    return (
      <Card className="overflow-hidden border border-primary/40 bg-card shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
              <Flame className="h-7 w-7 fill-secondary text-secondary" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Active streak</p>
              <h3 className="mt-1 text-xl font-bold text-foreground">
                {streak} consecutive {streak === 1 ? 'day' : 'days'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Completed today: <span className="font-medium text-foreground">{challengeName}</span>
              </p>
              {progressBlock}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-secondary/40 bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 ring-1 ring-secondary/30">
            <Snowflake className="h-6 w-6 text-secondary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Streak at risk</p>
            <h3 className="mt-1 text-lg font-bold text-foreground">Don&apos;t lose your streak!</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{challengeName}</p>
            {progressBlock}
            <div className="mt-3">
              <ChallengeCheckInStatus
                isAutoTracked={isAutoTracked}
                todayCompleted={false}
                onCheckIn={onMarkToday}
                actionLabel="Complete today"
                autoHint="Auto-tracked · Log at least 1 meal today without paused foods"
                fullWidth
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
