'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Flame,
  Loader2,
  Moon,
  Plus,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDaysYMD, formatLocalYMD, getMondayYMD, useWeeklyMenu } from '@/lib/hooks/useWeeklyMenu';
import { formatYMDDisplay } from '@/lib/utils/timezone';
import { DAY_LABELS, formatWeekRangeLabel, getEntryCalories, indexEntriesBySlot } from '@/lib/utils/weeklyMenu';
import type { DashboardGroup } from '@/components/groups/DashboardGroupsSection';

interface HomeWeeklyMenuCardProps {
  profileId: string;
  groups: DashboardGroup[];
  loadingGroups?: boolean;
}

const MOMENTS = [
  { key: 'breakfast' as const, label: 'Breakfast', Icon: Coffee, accent: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { key: 'lunch' as const, label: 'Lunch', Icon: Sun, accent: 'bg-primary/15 text-primary' },
  { key: 'dinner' as const, label: 'Dinner', Icon: Moon, accent: 'bg-secondary/15 text-secondary' },
];

export function HomeWeeklyMenuCard({
  profileId,
  groups,
  loadingGroups = false,
}: HomeWeeklyMenuCardProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    groups[0]?.GroupID ?? null
  );
  const todayYMD = useMemo(() => formatLocalYMD(new Date()), []);
  const currentMondayYMD = useMemo(() => getMondayYMD(new Date()), []);
  const [selectedDayYMD, setSelectedDayYMD] = useState<string>(todayYMD);

  useEffect(() => {
    if (groups.length > 0 && !groups.some((g) => g.GroupID === selectedGroupId)) {
      setSelectedGroupId(groups[0].GroupID);
    }
  }, [groups, selectedGroupId]);

  const activeGroupId = selectedGroupId ?? groups[0]?.GroupID ?? null;
  const menu = useWeeklyMenu(
    activeGroupId ? String(activeGroupId) : '',
    activeGroupId ? profileId : undefined
  );

  const weekDays = useMemo(() => {
    return DAY_LABELS.map((label, idx) => {
      const ymd = addDaysYMD(menu.weekStart, idx);
      return {
        label,
        ymd,
        dayNum: Number(ymd.slice(8, 10)),
        isToday: ymd === todayYMD,
      };
    });
  }, [menu.weekStart, todayYMD]);

  useEffect(() => {
    if (!weekDays.some((d) => d.ymd === selectedDayYMD)) {
      const todayInWeek = weekDays.find((d) => d.isToday);
      setSelectedDayYMD(todayInWeek ? todayInWeek.ymd : weekDays[0]?.ymd || todayYMD);
    }
  }, [weekDays, selectedDayYMD, todayYMD]);

  const entryMap = useMemo(() => indexEntriesBySlot(menu.entries), [menu.entries]);

  const weekRangeLabel = useMemo(() => formatWeekRangeLabel(menu.weekStart), [menu.weekStart]);
  const isCurrentWeek = menu.weekStart === currentMondayYMD;

  const selectedDayDisplay = useMemo(
    () =>
      formatYMDDisplay(selectedDayYMD, 'en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    [selectedDayYMD]
  );

  return (
    <section className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">Weekly Menu</h2>
              <p className="text-xs text-muted-foreground">{weekRangeLabel}</p>
            </div>
          </div>

          {activeGroupId && (
            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => menu.setWeekStart(addDaysYMD(menu.weekStart, -7))}
                  aria-label="Previous week"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    menu.setWeekStart(currentMondayYMD);
                    setSelectedDayYMD(todayYMD);
                  }}
                  title={isCurrentWeek ? 'Current week' : 'Return to this week'}
                  className="px-2 py-0.5 text-[11px] font-semibold text-foreground hover:text-primary"
                >
                  {isCurrentWeek ? 'This Week' : weekRangeLabel}
                </button>
                <button
                  type="button"
                  onClick={() => menu.setWeekStart(addDaysYMD(menu.weekStart, 7))}
                  aria-label="Next week"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8 rounded-lg px-2.5 text-xs">
                <Link href={`/protected/groups/${activeGroupId}/menu`}>
                  Open planner
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Group Switcher Pills */}
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {groups.slice(0, 5).map((g) => (
              <button
                key={g.GroupID}
                type="button"
                onClick={() => setSelectedGroupId(g.GroupID)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${g.GroupID === activeGroupId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        {loadingGroups ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading weekly menu...
          </div>
        ) : !activeGroupId ? (
          <div className="rounded-xl border border-dashed border-border bg-background p-6 text-center">
            <CalendarDays className="mx-auto mb-2.5 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">No group menu yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create or join a group to plan Breakfast, Lunch, and Dinner together.
            </p>
            <Button asChild size="sm" className="mt-3 bg-primary text-primary-foreground">
              <Link href="/protected/groups/create">
                <Plus className="mr-1.5 h-4 w-4" />
                Create group
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* 7-day compact selector strip */}
            <div className="grid grid-cols-7 gap-1.5 rounded-xl border border-border bg-background p-2">
              {weekDays.map((day) => {
                const count = MOMENTS.filter((m) => entryMap.has(`${day.ymd}_${m.key}`)).length;
                const isSelected = day.ymd === selectedDayYMD;
                return (
                  <button
                    key={day.ymd}
                    type="button"
                    onClick={() => setSelectedDayYMD(day.ymd)}
                    className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-center transition-all ${isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : day.isToday
                        ? 'bg-secondary/15 text-foreground ring-1 ring-secondary/40'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <span className="text-[10px] font-bold uppercase">{day.label}</span>
                    <span className="text-xs font-bold">{day.dayNum}</span>
                    <div className="flex gap-0.5">
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className={`h-1 w-1 rounded-full ${dot < count
                            ? isSelected
                              ? 'bg-primary-foreground'
                              : 'bg-primary'
                            : isSelected
                              ? 'bg-primary-foreground/25'
                              : 'bg-border'
                            }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected day's Breakfast / Lunch / Dinner */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {selectedDayDisplay}
              </p>

              {menu.loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {MOMENTS.map(({ key, label, Icon, accent }) => {
                    const entry = entryMap.get(`${selectedDayYMD}_${key}`);
                    const dishName = entry?.meal?.name || entry?.customMeal || null;
                    const kcal = getEntryCalories(entry);

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {label}
                            </p>
                            <p
                              className={`truncate text-sm font-semibold ${dishName ? 'text-foreground' : 'text-muted-foreground/70 italic'
                                }`}
                            >
                              {dishName || 'Not planned yet'}
                            </p>
                          </div>
                        </div>

                        {kcal > 0 ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            <Flame className="h-3 w-3" />
                            {kcal} kcal
                          </span>
                        ) : !dishName && activeGroupId ? (
                          <Link
                            href={`/protected/groups/${activeGroupId}/menu`}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            <Plus className="h-3 w-3" />
                            {label}
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
