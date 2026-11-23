'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Compass,
  Loader2,
  Plus,
  Sparkles,
  Trophy,
  Users,
  Vote,
} from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { AllMeals } from './all-meals';
import { PreferencesWarning } from '@/components/forms';
import DashboardGroupsSection, { type DashboardGroup } from '@/components/groups/DashboardGroupsSection';
import { GamificationHub } from '@/components/dashboard/GamificationHub';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { API_BASE_URL } from '@/lib/config/api';

type GroupDestination = 'voting' | 'menu' | 'challenges';

const DESTINATION_COPY: Record<
  GroupDestination,
  { title: string; description: string }
> = {
  voting: {
    title: 'Choose a group for Voting',
    description: 'Select which group you want to open to vote on what to eat.',
  },
  menu: {
    title: 'Choose a group for Weekly Menu',
    description: 'Select which group you want to open to view or plan its weekly menu.',
  },
  challenges: {
    title: 'Choose a group for Challenges',
    description: 'Select which group you want to open to view or track shared challenges.',
  },
};

export function UserProfileSection() {
  const router = useRouter();
  const { userData, loading, error } = useUser();

  const [showQuickGuide, setShowQuickGuide] = useState(false);
  const [pickerDestination, setPickerDestination] = useState<GroupDestination | null>(null);
  const [userGroups, setUserGroups] = useState<DashboardGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const profile = userData.profile;

  const fetchUserGroups = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setLoadingGroups(true);
      setGroupsError(null);
      const response = await fetch(`${API_BASE_URL}/groups/dashboard/${profile.id}`);
      if (!response.ok) {
        throw new Error('Could not load your groups');
      }
      const data = await response.json();
      setUserGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      setGroupsError(err instanceof Error ? err.message : 'Error loading groups');
    } finally {
      setLoadingGroups(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    void fetchUserGroups();
  }, [fetchUserGroups]);

  const openGroupPicker = useCallback((destination: GroupDestination) => {
    setPickerDestination(destination);
  }, []);

  const handleSelectGroup = (groupId: number) => {
    if (!pickerDestination) return;
    const dest = pickerDestination;
    setPickerDestination(null);
    router.push(`/protected/groups/${groupId}/${dest}`);
  };

  if (loading) {
    return (
      <div className="flex-1 w-full flex flex-col gap-8">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="w-40 h-5 bg-muted rounded-full animate-pulse mb-4" />
          <div className="w-2/3 h-9 bg-muted rounded animate-pulse mb-3" />
          <div className="w-full max-w-2xl h-5 bg-muted/70 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-muted/70 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="w-48 h-6 bg-muted rounded animate-pulse" />
          <div className="w-full h-32 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Only show error when not loading and there's an actual error
  if (!loading && error) {
    return (
      <div className="flex-1 w-full flex flex-col gap-12">
        <div className="rounded-xl border border-destructive/40 bg-card p-4 text-destructive">
          Error loading profile: {error}
        </div>
      </div>
    );
  }

  // If no profile but no error, just return null (user is signing out)
  if (!profile) {
    return null;
  }

  const displayName = profile.username || profile.email?.split('@')[0] || 'User';

  const pillars: Array<{
    destination: GroupDestination;
    icon: typeof Vote;
    title: string;
    description: string;
    cta: string;
    accent: string;
  }> = [
    {
      destination: 'voting',
      icon: Vote,
      title: 'Decide what to eat together',
      description:
        'Start quick group votes with friends or family factoring in everyone’s preferences and dietary restrictions.',
      cta: 'Open group voting',
      accent: 'bg-primary/15 text-primary',
    },
    {
      destination: 'menu',
      icon: CalendarDays,
      title: 'Plan the weekly menu',
      description:
        'Coordinate lunches and dinners on a shared weekly calendar and propose alternatives for any meal.',
      cta: 'Open weekly menu',
      accent: 'bg-secondary/15 text-secondary',
    },
    {
      destination: 'challenges',
      icon: Trophy,
      title: 'Join group challenges',
      description:
        'Take on shared healthy challenges like a soda-free week, check in daily, and follow the group ranking.',
      cta: 'Explore challenges',
      accent: 'bg-primary/15 text-primary',
    },
  ];

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      {/* Collapsible Quick Guide & Shortcuts */}
      <section className="rounded-2xl border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setShowQuickGuide((prev) => !prev)}
          aria-expanded={showQuickGuide}
          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40 rounded-2xl"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                Quick guide &amp; shortcuts
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                How QueComemos works: voting, weekly menus, and group challenges
              </span>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
            {showQuickGuide ? (
              <>
                Hide
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Open
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </span>
        </button>

        {showQuickGuide && (
          <div className="border-t border-border p-5 md:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-2.5">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Hey, {displayName}! Decide what to eat together without the hassle.
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <strong className="font-semibold text-foreground">QueComemos</strong> brings your group together to vote
                  on meals that fit everyone&apos;s tastes and restrictions, plan the weekly menu, share healthy challenges,
                  and discover new dishes.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 lg:shrink-0">
                <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/protected/groups/create">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Create group
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-border bg-background text-foreground hover:bg-muted">
                  <Link href="/protected/groups">
                    <Users className="mr-1.5 h-4 w-4" />
                    My groups
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-border bg-background text-foreground hover:bg-muted">
                  <Link href="/protected/foods">
                    <Compass className="mr-1.5 h-4 w-4" />
                    Explore foods
                  </Link>
                </Button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 md:grid-cols-3">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <button
                    key={pillar.destination}
                    type="button"
                    onClick={() => openGroupPicker(pillar.destination)}
                    className="group flex flex-col justify-between rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
                  >
                    <div className="space-y-2">
                      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${pillar.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h2 className="text-base font-semibold text-foreground">{pillar.title}</h2>
                      <p className="text-sm leading-snug text-muted-foreground">{pillar.description}</p>
                    </div>
                    <span className="mt-3 inline-flex items-center text-xs font-semibold text-primary group-hover:underline">
                      {pillar.cta}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Group selector dialog for Voting / Weekly Menu / Challenges */}
      <Dialog open={pickerDestination !== null} onOpenChange={(open) => !open && setPickerDestination(null)}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {pickerDestination ? DESTINATION_COPY[pickerDestination].title : 'Choose a group'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {pickerDestination ? DESTINATION_COPY[pickerDestination].description : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-2">
            {loadingGroups ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading your groups...
              </div>
            ) : groupsError ? (
              <div className="rounded-lg border border-destructive/40 bg-background p-4 text-center">
                <p className="text-sm text-destructive">{groupsError}</p>
                {pickerDestination && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fetchUserGroups()}
                    className="mt-3"
                  >
                    Retry
                  </Button>
                )}
              </div>
            ) : userGroups.length === 0 ? (
              <div className="rounded-lg border border-border bg-background p-6 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-primary" />
                <p className="text-sm font-semibold text-foreground">You don&apos;t belong to any group yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create a group first to use voting, weekly menus, and shared challenges.
                </p>
                <Button
                  onClick={() => {
                    setPickerDestination(null);
                    router.push('/protected/groups/create');
                  }}
                  className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                  size="sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create group
                </Button>
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {userGroups.map((group) => {
                  const count = group._count?.members ?? group.members?.length ?? 0;
                  return (
                    <button
                      key={group.GroupID}
                      type="button"
                      onClick={() => handleSelectGroup(group.GroupID)}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-3.5 text-left transition-colors hover:border-primary/60 hover:bg-muted/60"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="truncate font-semibold text-foreground">{group.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {count} {count === 1 ? 'member' : 'members'}
                          {group.description ? ` · ${group.description}` : ''}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Duolingo-style Gamification Hub (Streak, XP, Daily Quests, Mini Leaderboard) */}
      <GamificationHub
        profileId={profile.id}
        onOpenChallengePicker={() => openGroupPicker('challenges')}
        sharedGroups={userGroups}
        sharedGroupsLoading={loadingGroups}
      />

      {/* Show preferences warning if user doesn't have preferences set */}
      {(!userData.preferences || !userData.preferences.hasPreferences) && (
        <PreferencesWarning />
      )}

      {/* Dashboard with groups and meals */}
      <div className="flex flex-col gap-10">
        <div>
          <DashboardGroupsSection
            userId={profile.id}
            sharedGroups={userGroups}
            sharedLoading={loadingGroups}
            sharedError={groupsError}
            onRefresh={() => void fetchUserGroups()}
          />
        </div>

        <div>
          <AllMeals />
        </div>
      </div>
    </div>
  );
}
