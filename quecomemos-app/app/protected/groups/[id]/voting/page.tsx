'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Vote, History, ListChecks, Flame, Dices } from 'lucide-react';
import { VotingProvider, useVoting } from '@/lib/contexts/VotingContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GroupVotingSystem, GroupSwipeMatch, GroupMealRoulette, VotingHistorySection } from '@/components/voting';
import type { VotingMode } from '@/components/voting/GroupVotingSystem';
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
        if (res.status === 404) {
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
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 animate-pulse rounded bg-muted" />
            <div className="h-8 flex-1 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container mx-auto p-6">
        <div className="py-12 text-center">
          <h1 className="mb-4 text-3xl font-bold">Group Not Found</h1>
          <p className="mb-6 text-muted-foreground">
            The group you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
            <Button onClick={() => router.push('/protected/groups')} className="bg-amber-700 text-white hover:bg-amber-800">
              Go to Groups
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Error Loading Voting Page</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
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

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="flex items-center text-3xl font-bold text-foreground">
            <Vote className="mr-3 h-8 w-8 text-amber-600" />
            Group Voting
          </h1>
          <p className="mt-1 text-muted-foreground">
            Voting for <span className="font-medium text-amber-600">{group?.name}</span>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {group && (
          <VotingProvider groupId={group.GroupID}>
            {/* Voting System - Takes up 2 columns on large screens */}
            <div className="space-y-6 lg:col-span-2">
              <VotingModes group={group} onVotingComplete={handleVotingComplete} />
            </div>

            {/* Voting History - Takes up 1 column on large screens */}
            <div className="space-y-6">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-foreground">
                    <History className="mr-2 h-5 w-5 text-muted-foreground" />
                    Voting History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VotingHistorySection groupId={group.GroupID} className="w-full" />
                </CardContent>
              </Card>
            </div>
          </VotingProvider>
        )}
      </div>

      {/* Instructions Card */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">How to Use Group Voting</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </div>
              <p>Choose your preferred mode (Classic List or Quick Swipe Match) and click &quot;Start Group Vote&quot;.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </div>
              <p>During the proposal phase, members suggest meals from the list or by swiping Like on meal cards.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </div>
              <p>Once voting begins, everyone votes on their preferred meal options in either mode.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                4
              </div>
              <p>The meal with the most votes wins and gets automatically registered for the group!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface VotingModesProps {
  group: Group;
  onVotingComplete: () => void;
}

function VotingModes({ group, onVotingComplete }: VotingModesProps) {
  const { activeSession, startSession } = useVoting();
  const [mode, setMode] = useState<VotingMode>('classic');

  return (
    <Tabs
      value={mode}
      onValueChange={(value) => setMode(value as VotingMode)}
      className="w-full"
    >
      <TabsList className="mb-4 grid h-auto w-full grid-cols-3 rounded-xl border border-border bg-muted/60 p-1">
        <TabsTrigger
          value="classic"
          className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium sm:text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <ListChecks className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Classic List</span>
        </TabsTrigger>
        <TabsTrigger
          value="match"
          className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium sm:text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <Flame className="h-4 w-4 shrink-0 text-[#C85A32]" />
          <span>Swipe Match</span>
        </TabsTrigger>
        <TabsTrigger
          value="roulette"
          className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium sm:text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
        >
          <Dices className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Meal Roulette</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="classic">
        <GroupVotingSystem
          group={group}
          onVotingComplete={onVotingComplete}
          selectedMode={mode}
          onSelectMode={setMode}
          className="w-full"
        />
      </TabsContent>

      <TabsContent value="match">
        <GroupSwipeMatch
          groupId={group.GroupID}
          group={group}
          session={activeSession}
          onSessionStarted={startSession}
          onSwitchToClassic={() => setMode('classic')}
          onFinished={() => setMode('classic')}
        />
      </TabsContent>

      <TabsContent value="roulette">
        <GroupMealRoulette
          groupId={group.GroupID}
          group={group}
          session={activeSession}
          onSessionStarted={startSession}
          onSwitchToClassic={() => setMode('classic')}
        />
      </TabsContent>
    </Tabs>
  );
}
