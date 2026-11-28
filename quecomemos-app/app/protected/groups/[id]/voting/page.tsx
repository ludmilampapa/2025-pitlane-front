'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Vote,
  Users,
  CalendarDays,
  Trophy,
  Gamepad2,
} from 'lucide-react';
import { VotingProvider } from '@/lib/contexts/VotingContext';
import {
  GroupVotingSystem,
  VotingHistorySection,
  VotingInfoCard,
} from '@/components/voting';
import { API_BASE_URL } from '@/lib/config/api';
import type { Group } from '@/components/groups';

export default function GroupVotingPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/groups/${groupId}`);
      if (!res.ok) {
        if (res.status === 404 || res.status === 403) {
          setNotFound(true);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setGroup(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleVotingComplete = useCallback(() => {
    fetchGroup();
  }, [fetchGroup]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6 p-6">
        <div className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-96 animate-pulse rounded-2xl border border-border bg-card lg:col-span-2" />
          <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="py-12 text-center">
            <Vote className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-2xl font-bold text-foreground">Group Not Available</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              This group does not exist or you don&apos;t have access to it.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => router.back()} variant="outline">
                Go Back
              </Button>
              <Button
                onClick={() => router.push('/protected/groups')}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                My Groups
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Error Loading Voting Page</h1>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>
              <Button onClick={fetchGroup}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const memberCount = group?.members?.length ?? 0;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                  <Gamepad2 className="h-3.5 w-3.5" />
                  Group Meal Game
                </span>
                <span className="text-muted-foreground/40">•</span>
                <Badge
                  variant="secondary"
                  className="rounded-full border border-border bg-muted/70 px-2.5 py-0.5 text-xs font-medium text-foreground"
                >
                  <Users className="mr-1 h-3 w-3 text-primary" />
                  {memberCount} {memberCount === 1 ? 'player' : 'players'}
                </Badge>
              </div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {group?.name}
              </h1>
              {group?.description ? (
                <p className="mt-1 line-clamp-1 max-w-xl text-sm text-muted-foreground">
                  {group.description}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">
                  Swipe dishes tailored to your tastes &amp; diet, then play Classic List or Meal Roulette.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/protected/groups/${groupId}/menu`)}
              className="rounded-xl border-border bg-background/80 text-xs hover:bg-muted"
            >
              <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Weekly Menu
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/protected/groups/${groupId}/challenges`)}
              className="rounded-xl border-border bg-background/80 text-xs hover:bg-muted"
            >
              <Trophy className="mr-1.5 h-3.5 w-3.5 text-secondary" />
              Challenges
            </Button>
          </div>
        </div>
      </div>

      {/* Unified Immersive Game Stage + Past Decisions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {group && (
          <VotingProvider groupId={group.GroupID}>
            <div className="space-y-6 lg:col-span-8">
              <GroupVotingSystem
                group={group}
                onVotingComplete={handleVotingComplete}
                className="w-full"
              />
            </div>

            <div className="space-y-6 lg:col-span-4">
              <VotingHistorySection groupId={group.GroupID} className="w-full" />
            </div>
          </VotingProvider>
        )}
      </div>

      {/* Compact 4-Step Game Guide */}
      <VotingInfoCard />
    </div>
  );
}
