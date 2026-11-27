'use client';

import { useUser } from '@/lib/contexts/UserContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/config/api';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Utensils, ArrowRight, Leaf, SlidersHorizontal, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreferenceWithName {
  PreferenceID: number;
  name: string;
}

interface RestrictionWithName {
  DietaryRestrictionID: number;
  name: string;
}

export function UserPreferenceCards() {
  const { userData, loading } = useUser();
  const [preferences, setPreferences] = useState<PreferenceWithName[]>([]);
  const [restrictions, setRestrictions] = useState<RestrictionWithName[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const userPreferences = userData.preferences;

  useEffect(() => {
    const fetchUserTasteProfile = async () => {
      if (!userPreferences) {
        setLoadingData(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const [prefRes, restRes] = await Promise.all([
          fetch(`${API_BASE_URL}/preferences`, { headers }),
          fetch(`${API_BASE_URL}/dietary-restrictions`, { headers }),
        ]);

        if (prefRes.ok) {
          const allPrefs: PreferenceWithName[] = await prefRes.json();
          const prefIds = userPreferences.preferences || [];
          setPreferences(allPrefs.filter((p) => prefIds.includes(p.PreferenceID)));
        }

        if (restRes.ok) {
          const allRests: RestrictionWithName[] = await restRes.json();
          const restIds = (userPreferences.dietaryRestrictions || []).filter((id) => id !== 0);
          setRestrictions(
            allRests.filter(
              (r) =>
                restIds.includes(r.DietaryRestrictionID) &&
                !r.name.toLowerCase().includes('everyone')
            )
          );
        }
      } catch (error) {
        console.error('Error fetching taste profile:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (!loading) {
      void fetchUserTasteProfile();
    }
  }, [userPreferences, loading, supabase]);

  if (loading || loadingData) {
    return (
      <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="h-5 w-44 animate-pulse rounded bg-muted mb-3" />
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Your Preferences &amp; Dietary Restrictions
          </h2>
          <p className="text-xs text-muted-foreground">
            Meals and foods below are tailored to your taste profile. Click a preference to explore matching foods.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="shrink-0 self-start rounded-xl border-border bg-background text-xs font-semibold text-foreground hover:bg-muted sm:self-center"
        >
          <Link href="/protected/settings">
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-primary" />
            Edit preferences
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Preferences */}
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Heart className="h-3 w-3 text-secondary" />
            Preferences
          </p>
          {preferences.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {preferences.map((preference) => (
                <button
                  key={preference.PreferenceID}
                  type="button"
                  onClick={() => router.push(`/protected/foods/${preference.PreferenceID}`)}
                  className="group inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <Utensils className="h-3.5 w-3.5 text-primary" />
                  <span>{preference.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No preferences selected yet. Add some to personalize recommendations.
            </p>
          )}
        </div>

        {/* Dietary Restrictions */}
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Leaf className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Dietary Restrictions
          </p>
          {restrictions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {restrictions.map((restriction) => (
                <span
                  key={restriction.DietaryRestrictionID}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/30 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  <Leaf className="h-3.5 w-3.5" />
                  {restriction.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No dietary restrictions active — all foods are shown.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
