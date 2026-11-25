'use client';

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Flame,
  MessageSquare,
  Moon,
  Pencil,
  Plus,
  Settings2,
  Sun,
  Trash2,
  Utensils,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/lib/config/api';
import { addDaysYMD, formatLocalYMD, getMondayYMD } from '@/lib/hooks/useWeeklyMenu';
import { Leaf } from 'lucide-react';
import type { RestrictionItem } from '@/lib/utils/dietaryCompatibility';
import type { MenuProposal, WeeklyMenuEntry } from '@/lib/types/groupChallenges';
import type { Meal } from '@/lib/contexts/MealsContext';

export type CalendarMoment = 'breakfast' | 'lunch' | 'dinner';

export const CALENDAR_MOMENTS: Array<{
  key: CalendarMoment;
  label: string;
  timeHint: string;
  Icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}> = [
  {
    key: 'breakfast',
    label: 'Breakfast',
    timeHint: 'Morning',
    Icon: Coffee,
    accentClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25',
  },
  {
    key: 'lunch',
    label: 'Lunch',
    timeHint: 'Midday',
    Icon: Sun,
    accentClass: 'text-secondary bg-secondary/10 border-secondary/25',
  },
  {
    key: 'dinner',
    label: 'Dinner',
    timeHint: 'Evening',
    Icon: Moon,
    accentClass: 'text-primary bg-primary/10 border-primary/25',
  },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WeeklyMenuCalendarProps {
  groupId: number | string;
  profileId: string;
  isAdmin: boolean;
  entries: WeeklyMenuEntry[];
  weekStart: string;
  onChangeWeek?: (newWeekStartYMD: string) => void;
  onRefresh: () => Promise<void> | void;
  meals?: Meal[];
  groupRestrictions?: RestrictionItem[];
  loading?: boolean;
  /**
   * 'preview': read-only calendar overview with a single CTA to open `/protected/groups/[id]/menu`.
   * 'manage': the single unified configuration & proposal calendar.
   */
  mode?: 'preview' | 'manage';
  onOpenManagePage?: () => void;
}

interface SelectedSlot {
  dateKey: string;
  dayDisplay: string;
  moment: CalendarMoment;
  momentLabel: string;
}

function getEntryCalories(entry: WeeklyMenuEntry | undefined): number {
  if (!entry?.meal?.mealFoods?.length) return 0;
  return Math.round(
    entry.meal.mealFoods.reduce(
      (sum, mf) => sum + (mf.quantity || 1) * (mf.food?.kCal || 0),
      0
    )
  );
}

function formatWeekRange(weekStartYMD: string): string {
  const [y, m, d] = weekStartYMD.split('-').map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1);
  const end = new Date(y, (m || 1) - 1, (d || 1) + 6);
  const fmt = (dt: Date) =>
    dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`;
}

export function WeeklyMenuCalendar({
  groupId,
  profileId,
  isAdmin,
  entries,
  weekStart,
  onChangeWeek,
  onRefresh,
  meals = [],
  groupRestrictions = [],
  loading = false,
  mode = 'manage',
  onOpenManagePage,
}: WeeklyMenuCalendarProps) {
  const todayYMD = useMemo(() => formatLocalYMD(new Date()), []);
  const currentMondayYMD = useMemo(() => getMondayYMD(new Date()), []);

  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [saving, setSaving] = useState(false);

  // Admin slot assignment form state
  const [slotMealId, setSlotMealId] = useState<string>('');
  const [slotCustomMeal, setSlotCustomMeal] = useState<string>('');
  const [mealFilter, setMealFilter] = useState<string>('');

  // Member proposal form state
  const [showProposalBox, setShowProposalBox] = useState(false);
  const [proposedMealId, setProposedMealId] = useState<string>('');
  const [alternativeText, setAlternativeText] = useState<string>('');
  const [proposalReason, setProposalReason] = useState<string>('');

  const weekDays = useMemo(() => {
    return DAY_LABELS.map((shortName, index) => {
      const dateKey = addDaysYMD(weekStart, index);
      const [y, m, d] = dateKey.split('-').map(Number);
      const dateObj = new Date(y, (m || 1) - 1, d || 1);
      return {
        shortName,
        dayNumber: dateObj.getDate(),
        monthShort: dateObj.toLocaleDateString('en-US', { month: 'short' }),
        fullDisplay: dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        dateKey,
        isToday: dateKey === todayYMD,
      };
    });
  }, [weekStart, todayYMD]);

  // Index entries by `${YYYY-MM-DD}_${moment}`
  const entryMap = useMemo(() => {
    const map = new Map<string, WeeklyMenuEntry>();
    entries.forEach((entry) => {
      const ymd = entry.date.slice(0, 10);
      map.set(`${ymd}_${entry.moment}`, entry);
    });
    return map;
  }, [entries]);

  const activeEntry = useMemo(() => {
    if (!selectedSlot) return undefined;
    return entryMap.get(`${selectedSlot.dateKey}_${selectedSlot.moment}`);
  }, [selectedSlot, entryMap]);

  const filteredMeals = useMemo(() => {
    if (!mealFilter.trim()) return meals;
    const q = mealFilter.toLowerCase();
    return meals.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q)
    );
  }, [meals, mealFilter]);

  const openSlotModal = (
    day: (typeof weekDays)[number],
    momentMeta: (typeof CALENDAR_MOMENTS)[number]
  ) => {
    if (mode !== 'manage') return;
    const existing = entryMap.get(`${day.dateKey}_${momentMeta.key}`);
    if (!isAdmin && !existing) {
      toast.info('Slot not scheduled yet', {
        description: 'A group admin can assign a dish to this slot first.',
      });
      return;
    }

    setSelectedSlot({
      dateKey: day.dateKey,
      dayDisplay: day.fullDisplay,
      moment: momentMeta.key,
      momentLabel: momentMeta.label,
    });
    setSlotMealId(existing?.mealId ? String(existing.mealId) : '');
    setSlotCustomMeal(existing?.customMeal || '');
    setMealFilter('');
    setShowProposalBox(false);
    setProposedMealId('');
    setAlternativeText('');
    setProposalReason('');
  };

  const closeSlotModal = () => {
    if (saving) return;
    setSelectedSlot(null);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    if (!slotMealId && !slotCustomMeal.trim()) {
      toast.error('Select a catalog dish or enter a custom meal name.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          date: selectedSlot.dateKey,
          moment: selectedSlot.moment,
          mealId: slotMealId ? Number(slotMealId) : null,
          customMeal: slotMealId ? null : slotCustomMeal.trim(),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Could not save menu slot');
      }
      toast.success(`${selectedSlot.momentLabel} saved for ${selectedSlot.dayDisplay}`);
      await onRefresh();
      setSelectedSlot(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save menu slot');
    } finally {
      setSaving(false);
    }
  };

  const handleClearSlot = async () => {
    if (!activeEntry) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/menu/${activeEntry.MenuEntryID}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Could not clear slot');
      }
      toast.success('Slot cleared');
      await onRefresh();
      setSelectedSlot(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not clear slot');
    } finally {
      setSaving(false);
    }
  };

  const handleSendProposal = async () => {
    if (!activeEntry) return;
    if (!proposedMealId && !alternativeText.trim()) {
      toast.error('Choose an alternative meal or write a suggestion.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/menu/${activeEntry.MenuEntryID}/proposals`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId,
            proposedMealId: proposedMealId ? Number(proposedMealId) : null,
            alternativeText: proposedMealId ? null : alternativeText.trim(),
            reason: proposalReason.trim() || null,
          }),
        }
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Could not send proposal');
      }
      toast.success('Alternative proposed to group admins!');
      setShowProposalBox(false);
      setProposedMealId('');
      setAlternativeText('');
      setProposalReason('');
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send proposal');
    } finally {
      setSaving(false);
    }
  };

  const handleRespondProposal = async (
    proposalId: number,
    status: 'accepted' | 'rejected'
  ) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/menu-proposals/${proposalId}/respond`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, status }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Could not update proposal');
      }
      toast.success(status === 'accepted' ? 'Proposal accepted & menu updated!' : 'Proposal declined');
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not respond to proposal');
    } finally {
      setSaving(false);
    }
  };

  const handleLogConsumption = async () => {
    if (!activeEntry?.mealId) {
      toast.info('Only catalog dishes with nutritional data can be logged directly.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/consumptions/individual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          name: `${activeEntry.meal?.name || 'Planned Meal'} (${selectedSlot?.momentLabel})`,
          description: `Logged from group weekly menu`,
          meals: [{ mealId: activeEntry.mealId, quantity: 1 }],
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Could not log consumption');
      }
      toast.success('Meal logged to your history!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log consumption');
    } finally {
      setSaving(false);
    }
  };

  const pendingTotal = useMemo(
    () =>
      entries.reduce(
        (sum, e) => sum + (e.proposals || []).filter((p) => p.status === 'pending').length,
        0
      ),
    [entries]
  );

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b border-border/70 bg-muted/25 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <CalendarDays className="h-5 w-5 text-secondary" />
                Weekly Meal Calendar
              </CardTitle>
              <Badge variant="outline" className="bg-card text-xs font-medium">
                {formatWeekRange(weekStart)}
              </Badge>
              {pendingTotal > 0 && (
                <Badge className="border border-secondary/35 bg-secondary/15 text-xs text-secondary hover:bg-secondary/15">
                  {pendingTotal} pending {pendingTotal === 1 ? 'proposal' : 'proposals'}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === 'manage'
                ? isAdmin
                  ? 'Click any Breakfast, Lunch, or Dinner cell below to assign, edit, or moderate dishes.'
                  : 'Click any scheduled dish to inspect calories, log it, or propose an alternative.'
                : 'Overview of Breakfast, Lunch, and Dinner for this week.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onChangeWeek && (
              <div className="inline-flex items-center rounded-xl border border-border bg-card p-0.5 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onChangeWeek(addDaysYMD(weekStart, -7))}
                  aria-label="Previous week"
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => onChangeWeek(currentMondayYMD)}
                  className="px-2.5 py-1 text-xs font-semibold text-foreground hover:text-primary"
                >
                  This Week
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onChangeWeek(addDaysYMD(weekStart, 7))}
                  aria-label="Next week"
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {mode === 'preview' && onOpenManagePage && (
              <Button
                type="button"
                size="sm"
                onClick={onOpenManagePage}
                className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                {isAdmin ? 'Configure Weekly Menu' : 'Open Weekly Menu'}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="grid grid-cols-7 gap-2 p-5">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="h-44 animate-pulse rounded-xl border border-border/60 bg-muted/40"
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                {/* Day Column Headers */}
                <div className="grid grid-cols-[130px_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/20">
                  <div className="flex items-center px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Meal Moment
                  </div>
                  {weekDays.map((day) => (
                    <div
                      key={day.dateKey}
                      className={`border-l border-border/70 px-2.5 py-2.5 text-center ${
                        day.isToday ? 'bg-secondary/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${
                            day.isToday ? 'text-secondary' : 'text-muted-foreground'
                          }`}
                        >
                          {day.shortName}
                        </span>
                        {day.isToday && (
                          <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                        )}
                      </div>
                      <p
                        className={`mt-0.5 text-xs font-semibold ${
                          day.isToday ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {day.monthShort} {day.dayNumber}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 3 Rows: Breakfast, Lunch, Dinner */}
                {CALENDAR_MOMENTS.map((momentMeta, rowIdx) => {
                  const Icon = momentMeta.Icon;
                  return (
                    <div
                      key={momentMeta.key}
                      className={`grid grid-cols-[130px_repeat(7,minmax(0,1fr))] ${
                        rowIdx < CALENDAR_MOMENTS.length - 1 ? 'border-b border-border/70' : ''
                      }`}
                    >
                      {/* Row Header */}
                      <div className="flex flex-col justify-center gap-1 bg-muted/15 px-3.5 py-4">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-lg border ${momentMeta.accentClass}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {momentMeta.label}
                          </span>
                        </div>
                        <span className="pl-7 text-[11px] text-muted-foreground">
                          {momentMeta.timeHint}
                        </span>
                      </div>

                      {/* 7 Day Cells for this Meal Moment */}
                      {weekDays.map((day) => {
                        const entry = entryMap.get(`${day.dateKey}_${momentMeta.key}`);
                        const dishName = entry?.meal?.name || entry?.customMeal || null;
                        const kcal = getEntryCalories(entry);
                        const pendingCount =
                          entry?.proposals?.filter((p) => p.status === 'pending').length || 0;
                        const isInteractive =
                          mode === 'manage' && (isAdmin || Boolean(entry));

                        return (
                          <div
                            key={`${day.dateKey}_${momentMeta.key}`}
                            onClick={() => openSlotModal(day, momentMeta)}
                            role={isInteractive ? 'button' : undefined}
                            tabIndex={isInteractive ? 0 : undefined}
                            onKeyDown={(e) => {
                              if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                openSlotModal(day, momentMeta);
                              }
                            }}
                            className={`group relative flex min-h-[102px] flex-col justify-between border-l border-border/70 p-2.5 transition-colors ${
                              day.isToday ? 'bg-secondary/[0.04]' : 'bg-card'
                            } ${
                              isInteractive
                                ? 'cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                                : ''
                            }`}
                          >
                            {dishName ? (
                              <>
                                <div className="space-y-1">
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground">
                                      {dishName}
                                    </p>
                                    {mode === 'manage' && isAdmin && (
                                      <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                    )}
                                  </div>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                                  {kcal > 0 ? (
                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                      <Flame className="h-2.5 w-2.5" />
                                      {kcal} kcal
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">
                                      Custom
                                    </span>
                                  )}

                                  {pendingCount > 0 && (
                                    <span
                                      title={`${pendingCount} pending proposal(s)`}
                                      className="inline-flex items-center gap-0.5 rounded-md bg-secondary/15 px-1.5 py-0.5 text-[10px] font-bold text-secondary"
                                    >
                                      <MessageSquare className="h-2.5 w-2.5" />
                                      {pendingCount}
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/15 p-2 text-center">
                                {mode === 'manage' && isAdmin ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
                                    <Plus className="h-3 w-3" />
                                    Add
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/55">—</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          UNIFIED SLOT CONFIGURATION & PROPOSAL MODAL (ONLY IN 'manage')
         ================================================================ */}
      {mode === 'manage' &&
        selectedSlot &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
            onClick={closeSlotModal}
          >
            <div
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
                <div>
                  <Badge
                    variant="secondary"
                    className="border border-border bg-muted/70 text-xs font-semibold text-foreground"
                  >
                    {selectedSlot.momentLabel}
                  </Badge>
                  <h3 className="mt-1.5 text-lg font-bold text-foreground">
                    {selectedSlot.dayDisplay}
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={closeSlotModal}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-5 p-6">
                {groupRestrictions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-3.5 py-2.5 text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <Leaf className="h-3.5 w-3.5" />
                      Filtered for group restrictions:
                    </span>
                    {groupRestrictions.map((r) => (
                      <Badge
                        key={r.DietaryRestrictionID}
                        variant="secondary"
                        className="border border-border bg-card text-[11px] text-foreground"
                      >
                        {r.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Currently Scheduled Dish Summary */}
                {activeEntry && (
                  <div className="rounded-2xl border border-border bg-muted/30 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Scheduled Dish
                        </p>
                        <h4 className="mt-0.5 text-base font-bold text-foreground">
                          {activeEntry.meal?.name || activeEntry.customMeal}
                        </h4>
                        {activeEntry.meal?.description && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {activeEntry.meal.description}
                          </p>
                        )}
                      </div>
                      {getEntryCalories(activeEntry) > 0 && (
                        <Badge className="border border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
                          <Flame className="mr-1 h-3 w-3" />
                          {getEntryCalories(activeEntry)} kcal
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeEntry.mealId && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleLogConsumption}
                          disabled={saving}
                          className="rounded-xl bg-card text-xs"
                        >
                          <Utensils className="mr-1.5 h-3.5 w-3.5 text-primary" />
                          Log Meal to My History
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowProposalBox((v) => !v)}
                        className="rounded-xl bg-card text-xs"
                      >
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-secondary" />
                        {showProposalBox ? 'Hide Proposal Form' : 'Propose Alternative'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Member Proposal Form */}
                {activeEntry && showProposalBox && (
                  <div className="space-y-3 rounded-2xl border border-secondary/30 bg-secondary/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                      Suggest an Alternative Dish
                    </p>
                    <select
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                      value={proposedMealId}
                      onChange={(e) => {
                        setProposedMealId(e.target.value);
                        if (e.target.value) setAlternativeText('');
                      }}
                    >
                      <option value="">Choose from catalog...</option>
                      {meals.map((m) => (
                        <option key={m.MealID} value={m.MealID}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Or write a custom dish suggestion..."
                      value={alternativeText}
                      onChange={(e) => {
                        setAlternativeText(e.target.value);
                        if (e.target.value) setProposedMealId('');
                      }}
                      className="rounded-xl bg-card"
                    />
                    <Textarea
                      placeholder="Reason or note (optional)"
                      value={proposalReason}
                      onChange={(e) => setProposalReason(e.target.value)}
                      className="min-h-[68px] rounded-xl bg-card"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving}
                        onClick={handleSendProposal}
                        className="rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      >
                        Send Proposal
                      </Button>
                    </div>
                  </div>
                )}

                {/* Admin Direct Slot Configuration */}
                {isAdmin && (
                  <form onSubmit={handleSaveSlot} className="space-y-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {activeEntry ? 'Update Scheduled Dish' : 'Assign Dish to Slot'}
                    </p>

                    <div className="space-y-2">
                      <Input
                        placeholder="Filter catalog dishes..."
                        value={mealFilter}
                        onChange={(e) => setMealFilter(e.target.value)}
                        className="h-9 rounded-xl text-xs"
                      />
                      <select
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                        value={slotMealId}
                        onChange={(e) => {
                          setSlotMealId(e.target.value);
                          if (e.target.value) setSlotCustomMeal('');
                        }}
                      >
                        <option value="">— Select a catalog dish —</option>
                        {filteredMeals.map((meal) => (
                          <option key={meal.MealID} value={meal.MealID}>
                            {meal.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-border" />
                      <span className="mx-3 shrink text-[11px] uppercase text-muted-foreground">
                        or custom text
                      </span>
                      <div className="flex-grow border-t border-border" />
                    </div>

                    <Input
                      placeholder="e.g., Homemade Avocado Toast"
                      value={slotCustomMeal}
                      onChange={(e) => {
                        setSlotCustomMeal(e.target.value);
                        if (e.target.value) setSlotMealId('');
                      }}
                      className="rounded-xl"
                    />

                    <div className="flex items-center justify-between gap-2 pt-2">
                      {activeEntry ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={saving}
                          onClick={handleClearSlot}
                          className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Clear Slot
                        </Button>
                      ) : (
                        <div />
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={closeSlotModal}
                          className="rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={saving}
                          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {saving ? 'Saving...' : 'Save Slot'}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Existing Proposals Moderation / List */}
                {activeEntry && activeEntry.proposals?.length > 0 && (
                  <div className="space-y-2.5 border-t border-border pt-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Member Proposals ({activeEntry.proposals.length})
                    </p>
                    {activeEntry.proposals.map((item: MenuProposal) => (
                      <div
                        key={item.ProposalID}
                        className="space-y-2 rounded-xl border border-border bg-muted/20 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {item.proposedMeal?.name || item.alternativeText}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Suggested by {item.proposedBy?.username || 'Member'}
                            </p>
                          </div>
                          <Badge
                            variant={item.status === 'accepted' ? 'default' : 'outline'}
                            className="capitalize text-[11px]"
                          >
                            {item.status}
                          </Badge>
                        </div>
                        {item.reason && (
                          <p className="text-xs text-muted-foreground">&ldquo;{item.reason}&rdquo;</p>
                        )}
                        {isAdmin && item.status === 'pending' && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              type="button"
                              size="sm"
                              disabled={saving}
                              onClick={() => handleRespondProposal(item.ProposalID, 'accepted')}
                              className="h-8 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Accept &amp; Replace
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => handleRespondProposal(item.ProposalID, 'rejected')}
                              className="h-8 rounded-lg px-3 text-xs"
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
