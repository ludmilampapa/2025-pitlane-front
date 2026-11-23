'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import GroupCard from './GroupCard';
import { API_BASE_URL } from '@/lib/config/api';

export interface DashboardGroup {
  GroupID: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  members: Array<{
    profile: {
      id: string;
      username: string;
    };
  }>;
  _count: {
    members: number;
    consumptions: number;
  };
}

interface DashboardGroupsSectionProps {
  userId: string;
  sharedGroups?: DashboardGroup[];
  sharedLoading?: boolean;
  sharedError?: string | null;
  onRefresh?: () => void;
}

export function DashboardGroupsSection({
  userId,
  sharedGroups,
  sharedLoading,
  sharedError,
  onRefresh,
}: DashboardGroupsSectionProps) {
  const [internalGroups, setInternalGroups] = useState<DashboardGroup[]>([]);
  const [internalLoading, setInternalLoading] = useState(sharedGroups === undefined);
  const [internalError, setInternalError] = useState<string | null>(null);
  const router = useRouter();

  const useShared = sharedGroups !== undefined;

  const fetchDashboardGroups = useCallback(async () => {
    if (useShared) {
      onRefresh?.();
      return;
    }
    try {
      setInternalLoading(true);
      const url = `${API_BASE_URL}/groups/dashboard/${userId}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error loading groups');
      }

      const data = await response.json();
      setInternalGroups(Array.isArray(data) ? data : []);
      setInternalError(null);
    } catch (err) {
      setInternalError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setInternalLoading(false);
    }
  }, [userId, useShared, onRefresh]);

  useEffect(() => {
    if (!useShared) {
      fetchDashboardGroups();
    }
  }, [fetchDashboardGroups, useShared]);

  const groups = useShared ? sharedGroups : internalGroups;
  const loading = useShared ? Boolean(sharedLoading) : internalLoading;
  const error = useShared ? (sharedError ?? null) : internalError;

  const handleViewAllGroups = () => {
    router.push(`/protected/groups`);
  };

  const handleCreateGroup = () => {
    router.push(`/protected/groups/create`);
  };


  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="flex items-center text-2xl font-bold text-foreground">
        <Users className="mr-2 h-6 w-6 text-primary" />
        My Groups
      </h2>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleCreateGroup}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1 h-4 w-4" />
          Create group
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewAllGroups}
          className="border-border bg-card text-foreground hover:bg-muted"
        >
          View all
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className="space-y-4">
        {header}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4">
        {header}
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">Could not load groups.</p>
            <Button variant="outline" size="sm" onClick={fetchDashboardGroups} className="mt-3">
              Retry
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {header}
      {groups.length === 0 ? (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="py-10 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">You don&apos;t have any groups yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create your first group to start organizing meals together.
            </p>
            <Button onClick={handleCreateGroup} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create my first group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard key={group.GroupID} group={group} showActivity={true} />
            ))}
          </div>
          {groups.length >= 5 && (
            <Button
              variant="outline"
              className="w-full border-border bg-card text-foreground hover:bg-muted"
              onClick={handleViewAllGroups}
            >
              View all groups ({groups.length})
            </Button>
          )}
        </>
      )}
    </section>
  );
}

export default DashboardGroupsSection;
