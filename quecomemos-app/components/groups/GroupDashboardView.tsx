'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, Target, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/config/api';
import { StreakFeedbackCard } from '@/components/challenges/StreakFeedbackCard';
import { ChallengeRanking } from '@/components/challenges/ChallengeRanking';
import { WeeklyMenuCalendar } from '@/components/groups/WeeklyMenuCalendar';
import { useChallengeStreak } from '@/lib/hooks/useChallengeStreak';
import { useWeeklyMenu } from '@/lib/hooks/useWeeklyMenu';
import type { Challenge, ChallengeRankingRow } from '@/lib/types/groupChallenges';

interface GroupDashboardViewProps {
  groupId: number;
  profileId: string;
  isAdmin: boolean;
}

export function GroupDashboardView({ groupId, profileId, isAdmin }: GroupDashboardViewProps) {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [ranking, setRanking] = useState<ChallengeRankingRow[]>([]);
  const [, setLoadingChallenges] = useState(true);

  const activeChallenge = challenges.find((challenge) => challenge.isActive) ?? null;
  const streakHook = useChallengeStreak(activeChallenge, profileId);
  const menu = useWeeklyMenu(String(groupId), profileId);

  useEffect(() => {
    let cancelled = false;
    async function loadChallenges() {
      setLoadingChallenges(true);
      try {
        const response = await fetch(`${API_BASE_URL}/groups/${groupId}/challenges`);
        if (!response.ok) throw new Error('Failed to load challenges');
        const data = (await response.json()) as Challenge[];
        if (!cancelled) setChallenges(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not load challenges');
      } finally {
        if (!cancelled) setLoadingChallenges(false);
      }
    }
    void loadChallenges();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    void streakHook.refresh();
  }, [streakHook.refresh]);

  useEffect(() => {
    setRanking(streakHook.ranking);
  }, [streakHook.ranking]);

  const groupAdherence = useMemo(() => {
    if (ranking.length === 0) return 0;
    return Math.round(ranking.reduce((sum, row) => sum + row.percentage, 0) / ranking.length);
  }, [ranking]);

  const pendingProposals = useMemo(
    () =>
      menu.entries.reduce(
        (sum, entry) =>
          sum + (entry.proposals || []).filter((proposal) => proposal.status === 'pending').length,
        0
      ),
    [menu.entries]
  );

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Personal Streak
              </span>
              <Flame className="h-5 w-5 text-secondary" />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {streakHook.progress?.streak ?? 0}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">consecutive days</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Group Adherence
              </span>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {groupAdherence}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">active challenge average</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending Proposals
              </span>
              <MessageSquare className="h-5 w-5 text-secondary" />
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {pendingProposals}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">menu change requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Read-Only Weekly Calendar Preview (Breakfast / Lunch / Dinner) + Single Link to Configure */}
      <WeeklyMenuCalendar
        groupId={groupId}
        profileId={profileId}
        isAdmin={isAdmin}
        entries={menu.entries}
        weekStart={menu.weekStart}
        onRefresh={menu.refresh}
        loading={menu.loading}
        mode="preview"
        onOpenManagePage={() => router.push(`/protected/groups/${groupId}/menu`)}
      />

      {/* Challenges Row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {activeChallenge ? (
          <StreakFeedbackCard
            progress={streakHook.progress}
            challengeName={activeChallenge.name}
            onMarkToday={streakHook.markToday}
          />
        ) : (
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
              <Target className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No active challenge right now.
              </p>
            </CardContent>
          </Card>
        )}

        <ChallengeRanking ranking={ranking} />
      </div>
    </div>
  );
}
