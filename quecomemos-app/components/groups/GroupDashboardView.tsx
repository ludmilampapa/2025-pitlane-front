'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Flame,
  HeartHandshake,
  MessageSquare,
  Target,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { API_BASE_URL } from '@/lib/config/api';
import { useCalorieProgressRefresh } from '@/lib/contexts/CalorieProgressContext';
import { ChallengeRanking } from '@/components/challenges/ChallengeRanking';
import { ChallengeCheckInStatus } from '@/components/challenges/ChallengeCheckInStatus';
import { WeeklyMenuCalendar } from '@/components/groups/WeeklyMenuCalendar';
import { useChallengeStreak } from '@/lib/hooks/useChallengeStreak';
import { formatLocalYMD, useWeeklyMenu } from '@/lib/hooks/useWeeklyMenu';
import { formatYMDDisplay } from '@/lib/utils/timezone';
import type { Challenge, ChallengeRankingRow } from '@/lib/types/groupChallenges';
import type { Meal } from '@/lib/contexts/MealsContext';

interface GroupDashboardViewProps {
  groupId: number;
  profileId: string;
  isAdmin: boolean;
}

export function GroupDashboardView({ groupId, profileId, isAdmin }: GroupDashboardViewProps) {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [ranking, setRanking] = useState<ChallengeRankingRow[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [, setLoadingChallenges] = useState(true);

  const todayYmd = useMemo(() => formatLocalYMD(new Date()), []);

  const activeChallenges = useMemo(() => {
    return challenges.filter(
      (c) =>
        c.isActive &&
        c.startDate.slice(0, 10) <= todayYmd &&
        c.endDate.slice(0, 10) >= todayYmd
    );
  }, [challenges, todayYmd]);

  const selectedChallenge = useMemo(() => {
    if (activeChallenges.length === 0) return null;
    return (
      activeChallenges.find((c) => c.ChallengeID === selectedChallengeId) ??
      activeChallenges[0]
    );
  }, [activeChallenges, selectedChallengeId]);

  const streakHook = useChallengeStreak(selectedChallenge, profileId);
  const menu = useWeeklyMenu(String(groupId), profileId);

  useEffect(() => {
    let cancelled = false;
    async function loadChallenges() {
      setLoadingChallenges(true);
      try {
        const [challengesRes, mealsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/groups/${groupId}/challenges`),
          fetch(`${API_BASE_URL}/meals/all`).catch(() => null),
        ]);
        if (!challengesRes.ok) throw new Error('Failed to load challenges');
        const data = (await challengesRes.json()) as Challenge[];
        if (!cancelled) setChallenges(data);
        if (mealsRes && mealsRes.ok) {
          const mealsData = (await mealsRes.json()) as Meal[];
          if (!cancelled && Array.isArray(mealsData)) setMeals(mealsData);
        }
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

  const { refresh: refreshStreak, ranking: streakRanking } = streakHook;

  useEffect(() => {
    void refreshStreak();
  }, [refreshStreak]);

  const handleMealRefresh = useCallback(() => {
    void refreshStreak();
  }, [refreshStreak]);
  useCalorieProgressRefresh(handleMealRefresh);

  useEffect(() => {
    setRanking(streakRanking);
  }, [streakRanking]);

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

  const progress = streakHook.progress;
  const completedToday = progress?.todayCompleted ?? false;
  const completedDays = progress?.completedDays ?? 0;
  const totalDays = progress?.totalDays ?? 0;
  const percentage = progress?.percentage ?? 0;
  const streak = progress?.streak ?? 0;

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
              {streak}
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

      {/* Interactive Visual Weekly Menu Board */}
      <WeeklyMenuCalendar
        groupId={groupId}
        profileId={profileId}
        isAdmin={isAdmin}
        entries={menu.entries}
        weekStart={menu.weekStart}
        onChangeWeek={menu.setWeekStart}
        onRefresh={menu.refresh}
        meals={meals}
        loading={menu.loading}
        mode="manage"
        onOpenManagePage={() => router.push(`/protected/groups/${groupId}/menu`)}
      />

      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Active Challenges ({activeChallenges.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Track your daily compliance and see how your teammates are doing.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/protected/groups/${groupId}/challenges`)}
              className="rounded-xl text-xs font-semibold"
            >
              View all challenges
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>

          {activeChallenges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeChallenges.map((c) => {
                const isSelected = selectedChallenge?.ChallengeID === c.ChallengeID;
                return (
                  <button
                    key={c.ChallengeID}
                    type="button"
                    onClick={() => setSelectedChallengeId(c.ChallengeID)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isSelected ? 'bg-primary-foreground' : 'bg-emerald-500'
                      }`}
                    />
                    <span>{c.name}</span>
                    <span className="opacity-75">· {c.targetPercentage ?? 100}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-5">
          {selectedChallenge ? (
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-6">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">
                      {selectedChallenge.name}
                    </h3>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      Active
                    </span>
                    <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Goal: {selectedChallenge.targetPercentage ?? 100}%
                    </span>
                  </div>

                  {(selectedChallenge.description || selectedChallenge.ruleText) && (
                    <p className="text-xs text-muted-foreground">
                      {selectedChallenge.description || selectedChallenge.ruleText}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatYMDDisplay(selectedChallenge.startDate.slice(0, 10))} –{' '}
                      {formatYMDDisplay(selectedChallenge.endDate.slice(0, 10))}
                    </span>
                    {completedToday && (
                      <span className="inline-flex items-center gap-1 font-semibold text-primary">
                        <Check className="h-3.5 w-3.5" />
                        Done today ({streak}d streak)
                      </span>
                    )}
                  </div>

                  {selectedChallenge.pausedFoods && selectedChallenge.pausedFoods.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                        Paused:
                      </span>
                      {selectedChallenge.pausedFoods.map((food) => (
                        <span
                          key={food}
                          className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200"
                        >
                          {food}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-xl border border-border bg-background p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Your progress</span>
                    <span className="font-bold tabular-nums text-primary">
                      {completedDays} / {totalDays} days ({percentage}%)
                    </span>
                  </div>
                  <Progress value={Math.min(100, percentage)} className="h-2.5" />
                </div>

                <ChallengeCheckInStatus
                  isAutoTracked={Boolean(selectedChallenge.pausedFoods?.length)}
                  todayCompleted={completedToday}
                  onCheckIn={streakHook.markToday}
                  actionLabel="Complete today"
                  autoHint="Auto-tracked · Log at least 1 meal today without paused foods"
                  fullWidth
                />
              </div>

              <div className="lg:col-span-6 lg:border-l lg:border-border lg:pl-5">
                <ChallengeRanking ranking={ranking} currentProfileId={profileId} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Target className="h-9 w-9 text-muted-foreground/70" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                No active challenges right now
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                {challenges.length > 0
                  ? 'All previous challenges have ended. Start a new one or review past results.'
                  : 'Create a group challenge to track daily goals together.'}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => router.push(`/protected/groups/${groupId}/challenges`)}
                className="mt-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Trophy className="mr-1.5 h-4 w-4" />
                Open Challenges
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
