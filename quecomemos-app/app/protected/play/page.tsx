'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Dices, Flame, Gamepad2, Plus, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/lib/contexts/UserContext';
import { API_BASE_URL } from '@/lib/config/api';

interface PlayGroup {
  GroupID: number;
  name: string;
  description?: string;
  members?: Array<{ profile?: { id: string; username?: string } }>;
  activeSession?: {
    VotingSessionID: number;
    title?: string;
    status: string;
    proposals?: unknown[];
  } | null;
}

export default function PlayLobbyPage() {
  const router = useRouter();
  const { userData, loading: userLoading } = useUser();
  const profileId = userData?.profile?.id;
  const [rooms, setRooms] = useState<PlayGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading || !profileId) return;
    let cancelled = false;

    async function loadRooms() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/groups/dashboard/${profileId}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const groups = (await res.json()) as PlayGroup[];
        const withSessions = await Promise.all(
          (Array.isArray(groups) ? groups : []).map(async (g) => {
            try {
              const sRes = await fetch(`${API_BASE_URL}/voting/groups/${g.GroupID}/active`, {
                cache: 'no-store',
              });
              const sessions = sRes.ok ? await sRes.json() : [];
              return { ...g, activeSession: Array.isArray(sessions) ? sessions[0] ?? null : null };
            } catch {
              return { ...g, activeSession: null };
            }
          })
        );
        // Put rooms with live active voting sessions first
        withSessions.sort((a, b) => Number(Boolean(b.activeSession)) - Number(Boolean(a.activeSession)));
        if (!cancelled) setRooms(withSessions);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRooms();
    return () => {
      cancelled = true;
    };
  }, [profileId, userLoading]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-secondary/35 bg-gradient-to-br from-card via-card to-secondary/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/35 bg-secondary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary">
              <Gamepad2 className="h-3.5 w-3.5" />
              Meal Showdown Lobby
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Pick a Group Room &amp; Play
            </h1>
            <p className="text-sm text-muted-foreground">
              Join a live voting round or start a fresh Swipe + Meal Roulette showdown with your group.
            </p>
          </div>
          <Button asChild variant="outline" className="self-start rounded-xl sm:self-center">
            <Link href="/protected/groups">
              <Plus className="mr-1.5 h-4 w-4" />
              Manage Groups
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Dices className="mb-3 h-10 w-10 text-secondary" />
            <h2 className="text-lg font-bold text-foreground">No game rooms yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create or join a group to play Meal Showdown with friends, family, or roommates.
            </p>
            <Button asChild className="mt-4 rounded-xl bg-primary text-primary-foreground">
              <Link href="/protected/groups">
                <Plus className="mr-1.5 h-4 w-4" />
                Create your first group
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const isLive = Boolean(room.activeSession);
            return (
              <Card
                key={room.GroupID}
                className={`overflow-hidden rounded-2xl border transition-all hover:shadow-md ${
                  isLive ? 'border-emerald-500/45 bg-card' : 'border-border bg-card'
                }`}
              >
                <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Now
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          <Sparkles className="h-3 w-3 text-primary" />
                          Ready to Play
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {room.members?.length || 1}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-foreground">{room.name}</h2>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {isLive
                        ? `${room.activeSession?.title || 'Meal Showdown'} · ${
                            room.activeSession?.status === 'proposal_phase'
                              ? 'Round 1: Swipe & Pool'
                              : 'Round 2: Voting Arena'
                          }`
                        : room.description || 'Swipe dishes, spin the roulette, and vote together.'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => router.push(`/protected/groups/${room.GroupID}/voting`)}
                    className={`w-full rounded-xl font-bold ${
                      isLive
                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {isLive ? (
                      <>
                        <Flame className="mr-1.5 h-4 w-4" />
                        Join Live Round
                      </>
                    ) : (
                      <>
                        <Dices className="mr-1.5 h-4 w-4" />
                        Enter Game Room
                      </>
                    )}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
