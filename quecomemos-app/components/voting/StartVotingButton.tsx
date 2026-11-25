'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Vote, Clock, Users, Play, Sparkles } from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { useGlobalNotification } from '@/lib/contexts/NotificationContext';
import { VotingService } from './VotingService';
import { formatArgentinaDate } from '@/lib/utils/timezone';
import type { Group } from '../groups/index';
import type { VotingSession } from './types';

interface StartVotingButtonProps {
  group: Group;
  onVotingStarted?: (session?: VotingSession) => void;
  disabled?: boolean;
  className?: string;
}

export function StartVotingButton({
  group,
  onVotingStarted,
  disabled = false,
  className = '',
}: StartVotingButtonProps) {
  const { userData } = useUser();
  const { showSuccess, showError } = useGlobalNotification();
  const [loading, setLoading] = useState(false);

  const userId = userData?.profile?.id;
  const isGroupMember = group.members?.some((member) => member.profile.id === userId) || false;

  const handleStartVoting = async () => {
    if (!userId || !isGroupMember) {
      showError('Access Denied', 'You must be a member of this group to start a voting session.');
      return;
    }

    setLoading(true);
    try {
      const createdSession = await VotingService.startVotingSession({
        initiatorId: userId,
        groupId: group.GroupID,
        title: `Meal Vote · ${formatArgentinaDate(new Date(), 'en-US', { month: 'short', day: 'numeric' })}`,
        description: `Group meal voting session for ${group.name}`,
      });

      showSuccess(
        'Voting Session Started!',
        'Members can now propose meals for the next 5 minutes.'
      );

      onVotingStarted?.(createdSession);
    } catch (error) {
      showError(
        'Failed to Start Voting',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isGroupMember) {
    return null;
  }

  return (
    <Button
      onClick={handleStartVoting}
      disabled={disabled || loading}
      className={`rounded-xl bg-secondary text-secondary-foreground shadow-sm transition-all hover:bg-secondary/90 hover:shadow ${className}`}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      {loading ? 'Starting game...' : 'Start Meal Game'}
    </Button>
  );
}

interface VotingInfoCardProps {
  className?: string;
}

export function VotingInfoCard({ className = '' }: VotingInfoCardProps) {
  const steps = [
    {
      num: 1,
      title: 'Swipe Your Cravings',
      desc: 'Swipe dishes matched to your personal tastes & dietary restrictions.',
      icon: Vote,
    },
    {
      num: 2,
      title: 'Build or Randomize',
      desc: 'Add dishes by swipe/search — or skip to auto-load random meals.',
      icon: Clock,
    },
    {
      num: 3,
      title: 'Pick Your Arena',
      desc: 'Enter Classic List or Meal Roulette in one immersive game view.',
      icon: Users,
    },
    {
      num: 4,
      title: 'Crown the Winner',
      desc: 'Winning dish logs to group history with custom portions.',
      icon: Play,
    },
  ];

  return (
    <Card className={`border-border bg-card shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Vote className="h-4 w-4 text-primary" />
          How Group Voting Works
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/35 p-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {step.num}
              </span>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
