'use client';

import { Crown, Medal, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChallengeRankingRow } from '@/lib/types/groupChallenges';

interface ChallengeRankingProps {
  ranking: ChallengeRankingRow[];
}

function placeIcon(index: number) {
  if (index === 0) return <Crown className="h-4 w-4 text-amber-500" />;
  if (index === 1) return <Medal className="h-4 w-4 text-slate-500" />;
  if (index === 2) return <Award className="h-4 w-4 text-orange-500" />;
  return <span className="w-4 text-center text-xs text-neutral-500">{index + 1}</span>;
}

export function ChallengeRanking({ ranking }: ChallengeRankingProps) {
  return (
    <Card className="border-amber-100 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-neutral-900">Ranking del grupo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ranking.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">Todavía no hay participantes.</p>
        ) : ranking.map((row, index) => (
          <div key={row.profileId} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                {placeIcon(index)}
                <span className="truncate text-sm font-medium text-neutral-800">{row.username || 'Usuario'}</span>
              </div>
              <span className="text-xs font-semibold text-neutral-500">{row.completedDays}/{row.totalDays}</span>
            </div>
            <progress
              value={row.percentage}
              max={100}
              className="h-2 w-full overflow-hidden rounded-full bg-amber-100 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-amber-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-emerald-500 [&::-moz-progress-bar]:bg-emerald-500"
              aria-label={`${row.username}: ${row.percentage}%`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
