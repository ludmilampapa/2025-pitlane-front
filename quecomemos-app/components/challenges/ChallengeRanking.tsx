'use client';

import { Crown, Medal, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ChallengeRankingRow } from '@/lib/types/groupChallenges';

interface ChallengeRankingProps {
  ranking: ChallengeRankingRow[];
  currentProfileId?: string;
}

function placeIcon(rank: number, hasProgress: boolean) {
  if (!hasProgress) {
    return <span className="w-4 text-center text-xs text-muted-foreground">#{rank}</span>;
  }
  if (rank === 1) return <Crown className="h-4 w-4 text-amber-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-secondary" />;
  return <span className="w-4 text-center text-xs text-muted-foreground">#{rank}</span>;
}

export function ChallengeRanking({ ranking, currentProfileId }: ChallengeRankingProps) {
  const sorted = [...ranking].sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    if (b.completedDays !== a.completedDays) return b.completedDays - a.completedDays;
    return a.username.localeCompare(b.username);
  });

  const ranks: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      ranks.push(1);
    } else {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const same =
        curr.percentage === prev.percentage && curr.completedDays === prev.completedDays;
      ranks.push(same ? ranks[i - 1] : i + 1);
    }
  }

  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">
          You &amp; Teammates Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No participants yet.</p>
        ) : (
          sorted.map((row, index) => {
            const rank = ranks[index];
            const tied = ranks.filter((r) => r === rank).length > 1;
            const isMe = Boolean(currentProfileId && row.profileId === currentProfileId);
            return (
              <div
                key={row.profileId}
                className={`space-y-2 rounded-xl p-2.5 ${
                  isMe ? 'border border-primary/30 bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {placeIcon(rank, row.completedDays > 0)}
                    <span className="truncate text-sm font-medium text-foreground">
                      {row.username || 'Member'}
                    </span>
                    {isMe && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        You
                      </span>
                    )}
                    {tied && rank <= 3 && row.completedDays > 0 && (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Tied
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                    {row.completedDays}/{row.totalDays} days ({row.percentage}%)
                    {row.outcome === 'completed'
                      ? ' · Completed'
                      : row.outcome === 'goal_reached'
                        ? ' · Goal reached'
                        : row.outcome === 'not_completed'
                          ? ' · Not completed'
                          : ''}
                  </span>
                </div>
                <Progress value={Math.min(100, row.percentage)} className="h-2" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
