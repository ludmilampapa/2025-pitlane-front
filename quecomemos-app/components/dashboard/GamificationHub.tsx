'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  Sparkles,
  Target,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { API_BASE_URL } from '@/lib/config/api';
import { addDaysYMD, formatLocalYMD, getMondayYMD } from '@/lib/hooks/useWeeklyMenu';
import { useUserBadges } from '@/lib/hooks/useUserBadges';
import { usePrimaryBadge } from '@/lib/hooks/usePrimaryBadge';
import { useCalorieProgress } from '@/lib/hooks/useKcalProgress';
import { useCalorieProgressRefresh } from '@/lib/contexts/CalorieProgressContext';
import { PrimaryBadgeDisplay } from '@/components/profile/PrimaryBadgeDisplay';
import { BadgeSelectionModal } from '@/components/profile/BadgeSelectionModal';
import { ChallengeCheckInStatus } from '@/components/challenges/ChallengeCheckInStatus';
import { isAutoTrackedChallenge } from '@/lib/utils/challengeRules';
import type {
  Challenge,
  ChallengeProgress,
  ChallengeRankingRow,
} from '@/lib/types/groupChallenges';

interface ActiveChallengeItem {
  groupId: number;
  groupName: string;
  challenge: Challenge;
  progress: ChallengeProgress | null;
  ranking: ChallengeRankingRow[];
}

interface GamificationHubProps {
  profileId: string;
  onOpenChallengePicker: () => void;
  sharedGroups?: Array<{ GroupID: number; name: string }>;
  sharedGroupsLoading?: boolean;
  compact?: boolean;
}

const LEVEL_TITLES = [
  'Rookie Taster',
  'Home Cook',
  'Flavor Explorer',
  'Group Chef',
  'Master Foodie',
  'Culinary Legend',
];

function getWeekDays(): Array<{ iso: string; label: string; isToday: boolean }> {
  const todayIso = formatLocalYMD(new Date());
  const mondayIso = getMondayYMD(new Date());
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return labels.map((label, idx) => {
    const iso = addDaysYMD(mondayIso, idx);
    return { iso, label, isToday: iso === todayIso };
  });
}

export function GamificationHub({
  profileId,
  onOpenChallengePicker,
  sharedGroups,
  sharedGroupsLoading = false,
  compact = false,
}: GamificationHubProps) {
  const { badges, loading: loadingBadges } = useUserBadges(profileId);
  const { primaryBadge, refetch: refetchPrimaryBadge } = usePrimaryBadge(profileId);
  const { progress: calorieProgress, loading: loadingCalories } = useCalorieProgress();

  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [isQuestsModalOpen, setIsQuestsModalOpen] = useState(false);

  const [activeItems, setActiveItems] = useState<ActiveChallengeItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [markingToday, setMarkingToday] = useState(false);

  const loadActiveChallenges = useCallback(async () => {
    if (!profileId || sharedGroupsLoading) return;
    try {
      setLoadingChallenges(true);
      let groups: Array<{ GroupID: number; name: string }> = [];
      if (sharedGroups !== undefined) {
        groups = sharedGroups;
      } else {
        const groupsRes = await fetch(`${API_BASE_URL}/groups/dashboard/${profileId}`);
        if (!groupsRes.ok) {
          setActiveItems([]);
          return;
        }
        const data = await groupsRes.json();
        groups = Array.isArray(data) ? data : [];
      }
      if (groups.length === 0) {
        setActiveItems([]);
        return;
      }

      const todayIso = formatLocalYMD(new Date());
      const collected: ActiveChallengeItem[] = [];

      await Promise.all(
        groups.slice(0, 5).map(async (group) => {
          try {
            const chRes = await fetch(`${API_BASE_URL}/groups/${group.GroupID}/challenges`, {
              cache: 'no-store',
            });
            if (!chRes.ok) return;
            const challenges: Challenge[] = await chRes.json();
            if (!Array.isArray(challenges) || challenges.length === 0) return;

            // Collect all currently running challenges for this group; if none are running, fall back to the most recent active one
            const runningList = challenges.filter(
              (c) =>
                c.isActive &&
                c.startDate.slice(0, 10) <= todayIso &&
                c.endDate.slice(0, 10) >= todayIso
            );
            const selectedChallenges =
              runningList.length > 0
                ? runningList
                : challenges.filter((c) => c.isActive).slice(0, 1);

            await Promise.all(
              selectedChallenges.map(async (challenge) => {
                const [progRes, rankRes] = await Promise.all([
                  fetch(
                    `${API_BASE_URL}/challenges/${challenge.ChallengeID}/progress/${profileId}?date=${encodeURIComponent(todayIso)}`,
                    { cache: 'no-store' }
                  ),
                  fetch(`${API_BASE_URL}/challenges/${challenge.ChallengeID}/ranking/${profileId}`, {
                    cache: 'no-store',
                  }),
                ]);

                const prog: ChallengeProgress | null = progRes.ok ? await progRes.json() : null;
                const rank: ChallengeRankingRow[] = rankRes.ok ? await rankRes.json() : [];

                collected.push({
                  groupId: group.GroupID,
                  groupName: group.name,
                  challenge,
                  progress: prog,
                  ranking: Array.isArray(rank) ? rank : [],
                });
              })
            );
          } catch {
            // Skip group if its challenge endpoints fail
          }
        })
      );

      setActiveItems(collected);
      setSelectedIndex((prev) => (prev < collected.length ? prev : 0));
    } catch {
      setActiveItems([]);
    } finally {
      setLoadingChallenges(false);
    }
  }, [profileId, sharedGroups, sharedGroupsLoading]);

  useEffect(() => {
    void loadActiveChallenges();
  }, [loadActiveChallenges]);

  const handleMealLoggedRefresh = useCallback(() => {
    void loadActiveChallenges();
  }, [loadActiveChallenges]);
  useCalorieProgressRefresh(handleMealLoggedRefresh);

  const currentItem = activeItems[selectedIndex] ?? null;
  const weekDays = useMemo(() => getWeekDays(), []);

  const handleCheckInToday = async () => {
    if (!currentItem || currentItem.progress?.todayCompleted || markingToday) return;
    const todayIso = formatLocalYMD(new Date());
    setMarkingToday(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/challenges/${currentItem.challenge.ChallengeID}/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, date: todayIso, completed: true }),
        }
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Could not save check-in');
      }
      toast.success('Streak extended! +30 XP', {
        description: `Completed today: ${currentItem.challenge.name}`,
      });
      await loadActiveChallenges();
    } catch (err) {
      toast.error('Check-in failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setMarkingToday(false);
    }
  };

  // Compute XP & Level from real user activity
  const totalChallengeDays = activeItems.reduce(
    (sum, item) => sum + (item.progress?.completedDays ?? 0),
    0
  );
  const loggedMealToday = (calorieProgress?.consumed ?? 0) > 0;
  const onTrackCalories =
    loggedMealToday && (calorieProgress?.percentage ?? 0) <= 105 && (calorieProgress?.percentage ?? 0) >= 25;

  const totalXp =
    badges.length * 100 +
    totalChallengeDays * 30 +
    (loggedMealToday ? 20 : 0) +
    (onTrackCalories ? 25 : 0);

  const xpPerLevel = 200;
  const level = Math.floor(totalXp / xpPerLevel) + 1;
  const xpIntoLevel = totalXp % xpPerLevel;
  const levelProgressPct = Math.round((xpIntoLevel / xpPerLevel) * 100);
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  const streak = currentItem?.progress?.streak ?? 0;
  const todayCompleted = currentItem?.progress?.todayCompleted ?? false;
  const completedDateSet = new Set(currentItem?.progress?.completedDates ?? []);

  // User rank inside active challenge
  const myRankIdx = currentItem?.ranking.findIndex((r) => r.profileId === profileId) ?? -1;
  const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;
  const leader = currentItem?.ranking[0] ?? null;

  const quests = [
    {
      id: 'challenge',
      title: 'Check in on a group challenge',
      xp: '+30 XP',
      done: todayCompleted,
      progressPct: todayCompleted ? 100 : 0,
      statusText: todayCompleted ? '1 / 1' : '0 / 1',
      icon: Flame,
      href: currentItem ? `/protected/groups/${currentItem.groupId}/challenges` : undefined,
    },
    {
      id: 'meal',
      title: 'Log a meal today',
      xp: '+20 XP',
      done: loggedMealToday,
      progressPct: loggedMealToday ? 100 : 0,
      statusText: loggedMealToday ? '1 / 1' : '0 / 1',
      icon: Utensils,
      href: '/protected/history',
    },
    {
      id: 'calories',
      title: 'Daily calorie goal progress',
      xp: '+25 XP',
      done: onTrackCalories,
      progressPct: Math.min(100, Math.round(calorieProgress?.percentage ?? 0)),
      statusText: loadingCalories
        ? '...'
        : `${Math.round(calorieProgress?.consumed ?? 0)} / ${Math.round(calorieProgress?.goal ?? 2000)} kcal`,
      icon: Target,
      href: '/protected/history',
    },
  ];

  const completedQuestsCount = quests.filter((q) => q.done).length;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
      {/* Top Duolingo-style status bar */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                Level {level} · {levelTitle}
              </h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-[#2B211A] dark:bg-amber-200">
                {totalXp} XP
              </span>
              {primaryBadge && (
                <button
                  type="button"
                  onClick={() => setIsBadgeModalOpen(true)}
                  title="Change equipped badge"
                  className="transition-opacity hover:opacity-80"
                >
                  <PrimaryBadgeDisplay profileId={profileId} showName size="sm" />
                </button>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <Progress value={levelProgressPct} className="h-2 w-36 sm:w-48" />
              <span className="text-xs text-muted-foreground">
                {xpPerLevel - xpIntoLevel} XP to Level {level + 1}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${todayCompleted
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border bg-background text-foreground'
              }`}
          >
            <Flame className={`h-4 w-4 ${streak > 0 ? 'text-secondary' : 'text-muted-foreground'}`} />
            <span>
              {streak} {streak === 1 ? 'day' : 'days'} streak
            </span>
          </div>

          <Link
            href="/protected/history"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Award className="h-4 w-4 text-primary" />
            <span>
              {loadingBadges ? '...' : `${badges.length} ${badges.length === 1 ? 'badge' : 'badges'}`}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setIsQuestsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-secondary hover:bg-secondary/20"
          >
            <Sparkles className="h-4 w-4 text-secondary" />
            <span>
              {completedQuestsCount}/{quests.length} quests today
            </span>
          </button>
        </div>
      </div>

      {/* Main content: Streak + Daily Quests */}
      <div className={`mt-5 grid grid-cols-1 gap-4 ${compact ? '' : 'lg:grid-cols-12'}`}>
        {/* Left: Active Streak & Weekly Strip */}
        <div className={`flex flex-col justify-between rounded-xl border border-border bg-background p-4 sm:p-5 ${compact ? '' : 'lg:col-span-7'}`}>
          {loadingChallenges ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading your active streak...
            </div>
          ) : currentItem ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {(() => {
                    const pct = Math.min(100, Math.max(0, currentItem.progress?.percentage ?? 0));
                    const radius = 20;
                    const circumference = 2 * Math.PI * radius;
                    const dashOffset = circumference * (1 - pct / 100);
                    return (
                      <div
                        title={`${pct}% progress · Goal: ${currentItem.progress?.targetPercentage ?? currentItem.challenge.targetPercentage ?? 100}%`}
                        className="relative flex h-12 w-12 shrink-0 items-center justify-center"
                      >
                        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                          <circle
                            cx="24"
                            cy="24"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-muted/60"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            className="text-primary transition-all duration-500"
                          />
                        </svg>
                        <span className="absolute text-[11px] font-bold text-foreground">
                          {pct}%
                        </span>
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Goal: {currentItem.progress?.targetPercentage ?? currentItem.challenge.targetPercentage ?? 100}% · {currentItem.groupName}
                    </p>
                    <h3 className="text-base font-bold text-foreground sm:text-lg">
                      {currentItem.challenge.name}
                    </h3>
                    {currentItem.challenge.description && (
                      <p className="text-xs text-muted-foreground">{currentItem.challenge.description}</p>
                    )}
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                      <Utensils className="h-3.5 w-3.5 shrink-0" />
                      Log your meals to track whether you completed this challenge.
                    </p>
                  </div>
                </div>

                {activeItems.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setSelectedIndex((prev) => (prev - 1 + activeItems.length) % activeItems.length)
                      }
                      aria-label="Previous active challenge"
                      className="h-8 w-8 rounded-full border-border bg-card text-foreground hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[3rem] text-center text-xs font-semibold text-muted-foreground">
                      {selectedIndex + 1} / {activeItems.length}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setSelectedIndex((prev) => (prev + 1) % activeItems.length)
                      }
                      aria-label="Next active challenge"
                      className="h-8 w-8 rounded-full border-border bg-card text-foreground hover:bg-muted"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* 7-day Duolingo streak strip */}
              <div className="grid grid-cols-7 gap-2 rounded-xl border border-border bg-card p-3">
                {weekDays.map((day) => {
                  const done = completedDateSet.has(day.iso);
                  return (
                    <div key={day.iso} className="flex flex-col items-center gap-1.5">
                      <span
                        className={`text-[11px] font-semibold ${day.isToday ? 'text-primary' : 'text-muted-foreground'
                          }`}
                      >
                        {day.label}
                      </span>
                      <div
                        title={day.iso}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all ${done
                            ? 'border-primary bg-primary text-primary-foreground'
                            : day.isToday
                              ? 'border-2 border-secondary bg-secondary/15 text-secondary'
                              : 'border-border bg-muted/60 text-muted-foreground'
                          }`}
                      >
                        {done ? (
                          <Check className="h-4 w-4" />
                        ) : day.isToday ? (
                          <Flame className="h-3.5 w-3.5" />
                        ) : (
                          '·'
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini leaderboard + action */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Trophy className="h-4 w-4 shrink-0 text-secondary" />
                  {myRank ? (
                    <span>
                      Ranked <strong className="text-foreground">#{myRank}</strong> of{' '}
                      {currentItem.ranking.length}
                      {myRank > 1 && leader
                        ? ` · ${Math.max(1, leader.percentage - (currentItem.progress?.percentage ?? 0))}% behind ${leader.username}`
                        : ' · Leading the group!'}
                    </span>
                  ) : (
                    <span>
                      {currentItem.progress?.percentage ?? 0}% achieved · Goal:{' '}
                      {currentItem.progress?.targetPercentage ?? currentItem.challenge.targetPercentage ?? 100}%
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <ChallengeCheckInStatus
                    isAutoTracked={isAutoTrackedChallenge(currentItem.challenge)}
                    todayCompleted={todayCompleted}
                    onCheckIn={handleCheckInToday}
                    loading={markingToday}
                    actionLabel="Check in today (+30 XP)"
                  />
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-border bg-card text-foreground hover:bg-muted"
                  >
                    <Link href={`/protected/groups/${currentItem.groupId}/challenges`}>
                      Details
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                <Flame className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">Start your first group streak!</h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Join or create a group challenge (like “No Soda Week”) to unlock your 7-day streak tracker,
                earn XP, and climb the group leaderboard.
              </p>
              <Button
                size="sm"
                onClick={onOpenChallengePicker}
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Trophy className="mr-1.5 h-4 w-4" />
                Explore group challenges
              </Button>
            </div>
          )}
        </div>

        {/* Right: Daily Quests (inline only when not compact; in compact mode opened via header pill) */}
        {!compact && (
          <div className="flex flex-col justify-between rounded-xl border border-border bg-background p-4 sm:p-5 lg:col-span-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Daily Quests
                </h3>
                <span className="text-xs font-medium text-muted-foreground">
                  {completedQuestsCount} of {quests.length} done
                </span>
              </div>

              <div className="space-y-3">
                {quests.map((quest) => {
                  const Icon = quest.icon;
                  const inner = (
                    <div className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${quest.done
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            {quest.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </div>
                          <span className="truncate text-xs font-semibold text-foreground">
                            {quest.title}
                          </span>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-[#2B211A] dark:bg-amber-200">
                          {quest.xp}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Progress value={quest.progressPct} className="h-1.5 flex-1" />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {quest.statusText}
                        </span>
                      </div>
                    </div>
                  );

                  return quest.href ? (
                    <Link key={quest.id} href={quest.href} className="block">
                      {inner}
                    </Link>
                  ) : (
                    <button
                      key={quest.id}
                      type="button"
                      onClick={onOpenChallengePicker}
                      className="block w-full text-left"
                    >
                      {inner}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Badges preview footer */}
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Award className="h-4 w-4 text-primary" />
                  Your Badges ({badges.length})
                </span>
                <div className="flex items-center gap-3">
                  {badges.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsBadgeModalOpen(true)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {primaryBadge ? 'Change badge' : 'Equip badge'}
                    </button>
                  )}
                  <Link
                    href="/protected/history"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                  >
                    View all
                  </Link>
                </div>
              </div>
              {badges.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {badges.slice(0, 4).map((badge) => {
                    const isEquipped = primaryBadge?.BadgeID === badge.BadgeID;
                    return (
                      <button
                        key={badge.BadgeID}
                        type="button"
                        onClick={() => setIsBadgeModalOpen(true)}
                        title={`${badge.description} — Click to equip on your profile`}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${isEquipped
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-primary/30 bg-primary/10 text-foreground hover:bg-primary/20'
                          }`}
                      >
                        {badge.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={badge.iconUrl}
                            alt={badge.name}
                            className="h-4 w-4 rounded-full bg-white/90 object-contain p-0.5"
                          />
                        ) : (
                          <Award className={`h-3.5 w-3.5 ${isEquipped ? 'text-primary-foreground' : 'text-primary'}`} />
                        )}
                        {badge.name}
                        {isEquipped && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })}
                  {badges.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setIsBadgeModalOpen(true)}
                      className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      +{badges.length - 4} more
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Create groups, log meals &amp; keep streaks to unlock badges.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Daily Quests & Badges Modal (opened by clicking the "X/3 quests today" pill) */}
      <Dialog open={isQuestsModalOpen} onOpenChange={setIsQuestsModalOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-card text-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-secondary" />
              Daily Quests ({completedQuestsCount}/{quests.length} done)
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Complete daily quests to earn XP and level up your profile.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            {quests.map((quest) => {
              const Icon = quest.icon;
              const inner = (
                <div className="rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-primary/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${quest.done
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                          }`}
                      >
                        {quest.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <span className="truncate text-xs font-semibold text-foreground">
                        {quest.title}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-[#2B211A] dark:bg-amber-200">
                      {quest.xp}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={quest.progressPct} className="h-1.5 flex-1" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {quest.statusText}
                    </span>
                  </div>
                </div>
              );

              return quest.href ? (
                <Link
                  key={quest.id}
                  href={quest.href}
                  onClick={() => setIsQuestsModalOpen(false)}
                  className="block"
                >
                  {inner}
                </Link>
              ) : (
                <button
                  key={quest.id}
                  type="button"
                  onClick={() => {
                    setIsQuestsModalOpen(false);
                    onOpenChallengePicker();
                  }}
                  className="block w-full text-left"
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <BadgeSelectionModal
        profileId={profileId}
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        onSuccess={() => {
          void refetchPrimaryBadge();
          toast.success('Profile badge updated!');
        }}
      />
    </section>
  );
}
