'use client';

import React, { useEffect, useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, TrendingUp } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config/api';

interface RadarDatum {
  name: string;
  count: number;
  percentage: number;
}

interface GroupMember {
  GroupMemberID: number;
  role: string;
  joinedAt: string;
  profile: {
    id: string;
    username: string;
    role: string;
  };
}

interface Consumption {
  ConsumptionID: number;
  name: string;
  description?: string;
  consumedAt: string;
  consumptionMeals: {
    mealId: number;
    quantity: number;
    meal: {
      MealID: number;
      name: string;
      mealFoods: {
        foodId: number;
        quantity: number;
        food: {
          FoodID: number;
          name: string;
          preferences: {
            PreferenceID: number;
            name: string;
          }[];
          dietaryRestrictions?: {
            DietaryRestrictionID: number;
            name: string;
          }[];
        };
      }[];
    };
  }[];
}

interface GroupMealPreferencesPieChartProps {
  groupId: string;
  members: GroupMember[];
}

export default function GroupMealPreferencesPieChart({
  groupId,
  members,
}: GroupMealPreferencesPieChartProps) {
  const [radarData, setRadarData] = useState<RadarDatum[]>([]);
  const [restrictionStats, setRestrictionStats] = useState<RadarDatum[]>([]);
  const [totalMealsCounted, setTotalMealsCounted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupMealPreferences = async () => {
      if (!groupId || members.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('No authenticated session');
        }

        const headers = {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        };

        const [allPrefsRes, allRestsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/preferences`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/dietary-restrictions`, { headers }).catch(() => null),
        ]);

        const restrictionNameSet = new Set<string>(['vegan', 'vegetarian']);
        if (allRestsRes?.ok) {
          const allRests = (await allRestsRes.json()) as Array<{ name?: string }>;
          for (const r of allRests) {
            if (r.name && !r.name.toLowerCase().includes('everyone')) {
              restrictionNameSet.add(r.name.trim().toLowerCase());
            }
          }
        }

        const preferenceCount = new Map<string, number>();
        if (allPrefsRes?.ok) {
          const allPrefs = (await allPrefsRes.json()) as Array<{ name?: string }>;
          for (const p of allPrefs) {
            const name = p.name?.trim();
            if (name && !restrictionNameSet.has(name.toLowerCase())) {
              preferenceCount.set(name, 0);
            }
          }
        }

        const restrictionCount = new Map<string, number>();
        let mealsCounted = 0;

        for (const member of members) {
          try {
            const consumptionResponse = await fetch(
              `${API_BASE_URL}/consumptions/user/${member.profile.id}`,
              { headers }
            );
            if (!consumptionResponse.ok) continue;

            const consumptions: Consumption[] = await consumptionResponse.json();
            for (const consumption of consumptions) {
              for (const cm of consumption.consumptionMeals || []) {
                const meal = cm.meal;
                if (!meal?.mealFoods) continue;
                mealsCounted += cm.quantity || 1;

                const mealPrefs = new Set<string>();
                const mealRests = new Set<string>();

                for (const mf of meal.mealFoods) {
                  for (const pref of mf.food?.preferences || []) {
                    const name = pref.name?.trim();
                    if (!name) continue;
                    if (restrictionNameSet.has(name.toLowerCase())) {
                      mealRests.add(name);
                    } else {
                      mealPrefs.add(name);
                    }
                  }
                  for (const rest of mf.food?.dietaryRestrictions || []) {
                    const name = rest.name?.trim();
                    if (name && !name.toLowerCase().includes('everyone')) {
                      mealRests.add(name);
                    }
                  }
                }

                for (const name of mealPrefs) {
                  preferenceCount.set(name, (preferenceCount.get(name) || 0) + (cm.quantity || 1));
                }
                for (const name of mealRests) {
                  restrictionCount.set(
                    name,
                    (restrictionCount.get(name) || 0) + (cm.quantity || 1)
                  );
                }
              }
            }
          } catch {
            // Skip member if consumption endpoint fails
          }
        }

        setTotalMealsCounted(mealsCounted);

        const totalPrefHits = Array.from(preferenceCount.values()).reduce((s, n) => s + n, 0);
        const prefList: RadarDatum[] = Array.from(preferenceCount.entries())
          .map(([name, count]) => ({
            name,
            count,
            percentage: totalPrefHits > 0 ? Math.round((count / totalPrefHits) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        const totalRestHits = Array.from(restrictionCount.values()).reduce((s, n) => s + n, 0);
        const restList: RadarDatum[] = Array.from(restrictionCount.entries())
          .filter(([, count]) => count > 0)
          .map(([name, count]) => ({
            name,
            count,
            percentage: totalRestHits > 0 ? Math.round((count / totalRestHits) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count);

        setRadarData(totalPrefHits > 0 ? prefList : []);
        setRestrictionStats(restList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group meal preferences');
      } finally {
        setLoading(false);
      }
    };

    void fetchGroupMealPreferences();
  }, [groupId, members]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: RadarDatum }>;
  }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
          <p className="font-semibold text-foreground">{d.name}</p>
          <p className="mt-0.5 text-muted-foreground">
            {d.count} {d.count === 1 ? 'meal' : 'meals'} ({d.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Group Taste Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Group Taste Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (radarData.length === 0 && restrictionStats.length === 0) {
    return (
      <Card className="rounded-2xl border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Group Taste Radar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-60 flex-col items-center justify-center text-center">
            <TrendingUp className="mb-2 h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">
              No group meal consumption history yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Log meals to visualize your group&apos;s taste preferences radar.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          Group Taste Radar
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Taste preferences from meals consumed by the group (dietary restrictions shown separately)
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {radarData.length > 0 && (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Radar
                  name="Preferences"
                  dataKey="percentage"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.32}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {restrictionStats.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Leaf className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Dietary Restrictions in Consumed Meals
            </p>
            <div className="flex flex-wrap gap-1.5">
              {restrictionStats.map((r) => (
                <span
                  key={r.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                >
                  <span>{r.name}</span>
                  <span className="opacity-75">· {r.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 border-t border-border pt-3 text-center text-xs">
          <div className="rounded-xl bg-muted/40 p-2.5">
            <p className="text-base font-bold text-foreground">
              {radarData.filter((d) => d.count > 0).length}
            </p>
            <p className="text-muted-foreground">Active tastes</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-2.5">
            <p className="truncate text-base font-bold text-primary">
              {radarData[0]?.count ? radarData[0].name : '—'}
            </p>
            <p className="text-muted-foreground">Top preference</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-2.5">
            <p className="text-base font-bold text-foreground">{totalMealsCounted}</p>
            <p className="text-muted-foreground">Meals logged</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
