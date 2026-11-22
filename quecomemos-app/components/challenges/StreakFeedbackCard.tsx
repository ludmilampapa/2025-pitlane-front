'use client';

import { Flame, Snowflake, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ChallengeProgress } from '@/lib/types/groupChallenges';

interface StreakFeedbackCardProps {
  progress: ChallengeProgress | null;
  challengeName: string;
  onMarkToday: () => Promise<void>;
}

export function StreakFeedbackCard({ progress, challengeName, onMarkToday }: StreakFeedbackCardProps) {
  const completedToday = progress?.todayCompleted ?? false;
  const streak = progress?.streak ?? 0;

  if (completedToday) {
    return (
      <Card className="overflow-hidden border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 ring-1 ring-emerald-200">
              <Flame className="h-7 w-7 fill-orange-500 text-orange-500" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-3 w-3" /></span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Racha activa</p>
              <h3 className="mt-1 text-xl font-bold text-neutral-900">{streak} día{streak === 1 ? '' : 's'} consecutivo{streak === 1 ? '' : 's'}</h3>
              <p className="mt-1 text-sm text-neutral-600">Completaste hoy: <span className="font-medium text-neutral-900">{challengeName}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 ring-1 ring-amber-200">
            <Snowflake className="h-6 w-6 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Racha en peligro</p>
            <h3 className="mt-1 text-lg font-bold text-neutral-900">¡Racha en riesgo!</h3>
            <p className="mt-1 text-sm text-neutral-600">Marcá antes de la medianoche para conservar tu racha.</p>
            <Button onClick={() => void onMarkToday()} className="mt-4 w-full bg-amber-600 text-white hover:bg-amber-700">
              Completar hoy
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
