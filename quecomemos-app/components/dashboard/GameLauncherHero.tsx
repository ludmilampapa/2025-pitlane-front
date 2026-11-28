'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Dices, Flame, Gamepad2, Plus, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/config/api';
import type { DashboardGroup } from '@/components/groups/DashboardGroupsSection';

interface LiveSessionInfo {
  groupId: number;
  groupName: string;
  sessionId: number;
  title: string;
  status: string;
  proposalCount: number;
}

interface GameLauncherHeroProps {
  groups: DashboardGroup[];
  loadingGroups: boolean;
}

export function GameLauncherHero({ groups, loadingGroups }: GameLauncherHeroProps) {
  const router = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [liveSession, setLiveSession] = useState<LiveSessionInfo | null>(null);
  const [checkingLive, setCheckingLive] = useState(true);

  useEffect(() => {
    if (groups.length > 0 && selectedGroupId === null) {
      setSelectedGroupId(groups[0].GroupID);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (loadingGroups) return;
    if (groups.length === 0) {
      setLiveSession(null);
      setCheckingLive(false);
      return;
    }

    let cancelled = false;
    setCheckingLive(true);

    Promise.all(
      groups.slice(0, 6).map(async (group) => {
        try {
          const res = await fetch(`${API_BASE_URL}/voting/groups/${group.GroupID}/active`, {
            cache: 'no-store',
          });
          if (!res.ok) return null;
          const sessions = (await res.json()) as Array<{
            VotingSessionID: number;
            title?: string;
            status: string;
            proposals?: unknown[];
          }>;
          const active = Array.isArray(sessions) ? sessions[0] : null;
          if (!active) return null;
          return {
            groupId: group.GroupID,
            groupName: group.name,
            sessionId: active.VotingSessionID,
            title: active.title || 'Group Meal Game',
            status: active.status,
            proposalCount: active.proposals?.length || 0,
          } satisfies LiveSessionInfo;
        } catch {
          return null;
        }
      })
    )
      .then((results) => {
        if (cancelled) return;
        const found = results.find((r): r is LiveSessionInfo => r !== null) ?? null;
        setLiveSession(found);
      })
      .finally(() => {
        if (!cancelled) setCheckingLive(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groups, loadingGroups]);

  const targetGroupId = selectedGroupId ?? groups[0]?.GroupID ?? null;

  return (
    <section className="rounded-3xl border border-secondary/35 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Game Pitch */}
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            {liveSession ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Round in {liveSession.groupName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/35 bg-secondary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary">
                <Gamepad2 className="h-3.5 w-3.5" />
                Group Meal Game
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Swipe · Roulette · Live Vote
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            {liveSession
              ? `Join "${liveSession.title}"`
              : "Can't decide what to eat? Play with your group"}
          </h1>

          <p className="text-sm text-muted-foreground">
            {liveSession
              ? `${liveSession.status === 'proposal_phase' ? 'Round 1: Swipe dishes into the pool' : 'Round 2: Spin the roulette or cast your votes'} · ${liveSession.proposalCount} ${liveSession.proposalCount === 1 ? 'dish' : 'dishes'} in play.`
              : 'Swipe right on dishes that fit everyone’s dietary restrictions, spin the Meal Roulette, and crown tonight’s winner together.'}
          </p>
        </div>

        {/* Right: 1-Click Play Controls */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center lg:shrink-0">
          {liveSession ? (
            <Button
              size="lg"
              onClick={() => router.push(`/protected/groups/${liveSession.groupId}/voting`)}
              className="h-12 rounded-2xl bg-secondary px-6 text-sm font-bold text-secondary-foreground shadow-md transition-transform hover:scale-[1.02] hover:bg-secondary/90"
            >
              <Flame className="mr-2 h-5 w-5" />
              Join Live Game
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : loadingGroups || checkingLive ? (
            <div className="h-12 w-48 animate-pulse rounded-2xl bg-muted" />
          ) : groups.length > 0 ? (
            <>
              {groups.length > 1 && (
                <div className="relative">
                  <select
                    aria-label="Choose group to play"
                    value={targetGroupId ?? ''}
                    onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                    className="h-12 rounded-2xl border border-border bg-background px-4 pr-8 text-sm font-semibold text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {groups.map((g) => (
                      <option key={g.GroupID} value={g.GroupID}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                size="lg"
                onClick={() => {
                  if (targetGroupId) {
                    router.push(`/protected/groups/${targetGroupId}/voting`);
                  }
                }}
                className="h-12 rounded-2xl bg-secondary px-6 text-sm font-bold text-secondary-foreground shadow-md transition-transform hover:scale-[1.02] hover:bg-secondary/90"
              >
                <Dices className="mr-2 h-5 w-5" />
                Play Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              asChild
              size="lg"
              className="h-12 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary/90"
            >
              <Link href="/protected/groups">
                <Plus className="mr-2 h-5 w-5" />
                Create a Group to Play
              </Link>
            </Button>
          )}

          {groups.length > 0 && (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-2xl border-border bg-background/90 px-4 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <Link href="/protected/play">
                <Users className="mr-1.5 h-4 w-4 text-primary" />
                All Rooms
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
