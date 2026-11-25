'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Leaf, Trophy, Vote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/config/api';
import { useUser } from '@/lib/contexts/UserContext';
import { useWeeklyMenu, getGroupAdmin } from '@/lib/hooks/useWeeklyMenu';
import {
  isMealCompatibleWithRestrictions,
  type RestrictionItem,
} from '@/lib/utils/dietaryCompatibility';
import { WeeklyMenuCalendar } from '@/components/groups/WeeklyMenuCalendar';
import type { GroupData } from '@/lib/types/groupChallenges';
import type { Meal } from '@/lib/contexts/MealsContext';

export default function GroupMenuPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const { userData } = useUser();
  const profileId = userData?.profile?.id;

  const [group, setGroup] = useState<GroupData | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [groupRestrictions, setGroupRestrictions] = useState<RestrictionItem[]>([]);
  const [catalogRestrictions, setCatalogRestrictions] = useState<RestrictionItem[]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);

  const menu = useWeeklyMenu(groupId, profileId);
  const isAdmin = getGroupAdmin(group, profileId);

  const fetchMeta = useCallback(async () => {
    if (!profileId) return;
    setGroupError(null);
    try {
      const [groupRes, mealsRes, dietRes, catRes] = await Promise.all([
        fetch(`${API_BASE_URL}/groups/${groupId}`),
        fetch(`${API_BASE_URL}/meals/all`),
        fetch(`${API_BASE_URL}/groups/${groupId}/dietary-info`).catch(() => null),
        fetch(`${API_BASE_URL}/dietary-restrictions`).catch(() => null),
      ]);
      if (!groupRes.ok) throw new Error('Could not load group details');
      setGroup((await groupRes.json()) as GroupData);
      if (mealsRes.ok) setMeals((await mealsRes.json()) as Meal[]);
      if (catRes && catRes.ok) {
        setCatalogRestrictions((await catRes.json()) as RestrictionItem[]);
      }
      if (dietRes && dietRes.ok) {
        const dietData = (await dietRes.json()) as {
          dietaryRestrictions?: RestrictionItem[];
        };
        setGroupRestrictions(
          (dietData.dietaryRestrictions || []).filter(
            (r) => r.DietaryRestrictionID !== 0 && !r.name.toLowerCase().includes('everyone')
          )
        );
      }
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [groupId, profileId]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  const compatibleMeals = useMemo(() => {
    const reqMap = new Map<number, RestrictionItem>();
    groupRestrictions.forEach((r) => reqMap.set(r.DietaryRestrictionID, r));
    (userData?.preferences?.dietaryRestrictions || []).forEach((id) => {
      if (id !== 0 && !reqMap.has(id)) {
        const found = catalogRestrictions.find((c) => c.DietaryRestrictionID === id);
        reqMap.set(id, { DietaryRestrictionID: id, name: found?.name || '' });
      }
    });
    const requiredList = Array.from(reqMap.values());
    return meals.filter((meal) => isMealCompatibleWithRestrictions(meal, requiredList));
  }, [meals, groupRestrictions, catalogRestrictions, userData?.preferences?.dietaryRestrictions]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Editorial Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl"
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/protected/groups/${groupId}`)}
              aria-label="Back to group"
              className="mt-0.5 h-9 w-9 shrink-0 rounded-xl border-border bg-background/80 hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                <CalendarDays className="h-3.5 w-3.5" />
                Weekly Planner
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {group?.name ? `${group.name} · Weekly Menu` : 'Weekly Menu'}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Plan Breakfast, Lunch, and Dinner across the week from one single calendar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/protected/groups/${groupId}/voting`)}
              className="rounded-xl border-border bg-background/80 text-xs hover:bg-muted"
            >
              <Vote className="mr-1.5 h-3.5 w-3.5 text-secondary" />
              Meal Showdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/protected/groups/${groupId}/challenges`)}
              className="rounded-xl border-border bg-background/80 text-xs hover:bg-muted"
            >
              <Trophy className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Challenges
            </Button>
          </div>
        </div>
      </div>

      {(groupError || menu.error) && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">
            {groupError || menu.error}
          </CardContent>
        </Card>
      )}

      {groupRestrictions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
            <Leaf className="h-3.5 w-3.5" />
            Active Group Dietary Restrictions ({compatibleMeals.length} compatible dishes):
          </span>
          {groupRestrictions.map((r) => (
            <Badge
              key={r.DietaryRestrictionID}
              variant="secondary"
              className="border border-border bg-card text-foreground"
            >
              {r.name}
            </Badge>
          ))}
        </div>
      )}

      {profileId && (
        <WeeklyMenuCalendar
          groupId={groupId}
          profileId={profileId}
          isAdmin={isAdmin}
          entries={menu.entries}
          weekStart={menu.weekStart}
          onChangeWeek={menu.setWeekStart}
          onRefresh={menu.refresh}
          meals={compatibleMeals}
          groupRestrictions={groupRestrictions}
          loading={menu.loading}
          mode="manage"
        />
      )}
    </div>
  );
}
