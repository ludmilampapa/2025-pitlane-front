'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  Compass,
  Loader2,
  Plus,
  Sparkles,
  Trophy,
  Users,
  Vote,
} from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { PreferencesWarning } from '@/components/forms';
import type { DashboardGroup } from '@/components/groups/DashboardGroupsSection';
import { GamificationHub } from '@/components/dashboard/GamificationHub';
import { HomeWeeklyMenuCard } from '@/components/dashboard/HomeWeeklyMenuCard';
import { LiveActivityBanner } from '@/components/dashboard/LiveActivityBanner';
import { GameLauncherHero } from '@/components/dashboard/GameLauncherHero';
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
    setShowQuickGuide(false);
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
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-[420px] animate-pulse rounded-2xl border border-border bg-card lg:col-span-6" />
        <div className="h-[420px] animate-pulse rounded-2xl border border-border bg-card lg:col-span-6" />
      </div>
    );
  }

  if (!loading && error) {
    return (
      <div className="flex-1 w-full flex flex-col gap-6">
        <div className="rounded-xl border border-destructive/40 bg-card p-4 text-destructive">
          Error loading profile: {error}
        </div>
      </div>
    );
  }

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
        'Start quick group votes factoring in everyone’s preferences and dietary restrictions.',
      cta: 'Open group voting',
      accent: 'bg-primary/15 text-primary',
    },
    {
      destination: 'menu',
      icon: CalendarDays,
      title: 'Plan the weekly menu',
      description:
        'Coordinate Breakfast, Lunch, and Dinner on a shared visual weekly board.',
      cta: 'Open weekly menu',
      accent: 'bg-secondary/15 text-secondary',
    },
    {
      destination: 'challenges',
      icon: Trophy,
      title: 'Join group challenges',
      description:
        'Take on shared healthy challenges linked to your daily meal log and track group progress.',
      cta: 'Explore challenges',
      accent: 'bg-primary/15 text-primary',
    },
  ];

  return (
    <div className="flex-1 w-full flex flex-col gap-5 pb-4">
      {/* Primary Focus: Meal Showdown Party Game Launcher */}
      <GameLauncherHero groups={userGroups} loadingGroups={loadingGroups} />

      {/* Live Group Alerts (Active Votes, Menu Change Proposals & Invitations) */}
      <LiveActivityBanner />

      {/* Show preferences warning if user doesn't have preferences set */}
      {(!userData.preferences || !userData.preferences.hasPreferences) && (
        <PreferencesWarning />
      )}

      {/* Side-by-side compact Home dashboard: Weekly Challenge + Weekly Menu */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <GamificationHub
            profileId={profile.id}
            onOpenChallengePicker={() => openGroupPicker('challenges')}
            sharedGroups={userGroups}
            sharedGroupsLoading={loadingGroups}
            compact
          />
        </div>

        <div className="lg:col-span-6">
          <HomeWeeklyMenuCard
            profileId={profile.id}
            groups={userGroups}
            loadingGroups={loadingGroups}
          />
        </div>
      </div>

      {/* Floating Quick Guide & Shortcuts Button */}
      <button
        type="button"
        onClick={() => setShowQuickGuide(true)}
        aria-label="Open Quick Guide"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Sparkles className="h-4 w-4" />
        <span>Quick guide</span>
      </button>

      {/* Quick Guide & Shortcuts Dialog */}
      <Dialog open={showQuickGuide} onOpenChange={setShowQuickGuide}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-border bg-card text-foreground sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              Hey, {displayName}! Quick guide &amp; shortcuts
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              How QueComemos works: vote together, plan your weekly menu, and track shared challenges.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex flex-wrap gap-2">
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/protected/groups/create" onClick={() => setShowQuickGuide(false)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create group
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-border bg-background text-foreground hover:bg-muted">
              <Link href="/protected/groups" onClick={() => setShowQuickGuide(false)}>
                <Users className="mr-1.5 h-4 w-4" />
                My groups
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-border bg-background text-foreground hover:bg-muted">
              <Link href="/protected/foods" onClick={() => setShowQuickGuide(false)}>
                <Compass className="mr-1.5 h-4 w-4" />
                Explore foods
              </Link>
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
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
                    <h3 className="text-sm font-semibold text-foreground">{pillar.title}</h3>
                    <p className="text-xs leading-snug text-muted-foreground">{pillar.description}</p>
                  </div>
                  <span className="mt-3 inline-flex items-center text-xs font-semibold text-primary group-hover:underline">
                    {pillar.cta}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
