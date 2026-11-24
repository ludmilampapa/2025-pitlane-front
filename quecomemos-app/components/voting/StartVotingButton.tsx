'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Vote, Clock, Users, Play } from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { useGlobalNotification } from '@/lib/contexts/NotificationContext';
import { VotingService } from './VotingService';
import type { Group } from '../groups/index';

interface StartVotingButtonProps {
  group: Group;
  onVotingStarted?: () => void;
  disabled?: boolean;
  className?: string;
}

export function StartVotingButton({ group, onVotingStarted, disabled = false, className = '' }: StartVotingButtonProps) {
  const { userData } = useUser();
  const { showSuccess, showError } = useGlobalNotification();
  const [loading, setLoading] = useState(false);

  const userId = userData?.profile?.id;
  const isGroupMember = group.members?.some(member => member.profile.id === userId) || false;

  const handleStartVoting = async () => {
    if (!userId || !isGroupMember) {
      showError('Access Denied', 'You must be a member of this group to start a voting session.');
      return;
    }

    setLoading(true);
    try {
      await VotingService.startVotingSession({
        initiatorId: userId,
        groupId: group.GroupID,
        title: `Meal Vote - ${new Date().toLocaleDateString()}`,
        description: `Group meal voting session for ${group.name}`
      });

      showSuccess(
        'Voting Session Started!',
        'Members can now propose meals for the next 5 minutes.'
      );

      onVotingStarted?.();
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
      className={`bg-amber-600 hover:bg-amber-700 text-white ${className}`}
    >
      <Vote className="w-4 h-4 mr-2" />
      {loading ? 'Starting...' : 'Start Group Vote'}
    </Button>
  );
}

interface VotingInfoCardProps {
  className?: string;
}

export function VotingInfoCard({ className = '' }: VotingInfoCardProps) {
  return (
    <Card className={`border-border bg-card shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Vote className="w-5 h-5 text-amber-600" />
          How Group Voting Works
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              1
            </div>
            <div>
              <h4 className="font-medium text-foreground">Start Voting Session</h4>
              <p className="text-sm text-muted-foreground">Any group member can initiate a meal voting session.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              2
            </div>
            <div>
              <h4 className="font-medium text-foreground flex items-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Propose Meals (5 minutes)
              </h4>
              <p className="text-sm text-muted-foreground">Members can propose meals via the Classic List or Quick Swipe Match.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              3
            </div>
            <div>
              <h4 className="font-medium text-foreground flex items-center gap-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                Vote on Proposals
              </h4>
              <p className="text-sm text-muted-foreground">Everyone votes on their preferred meals from the proposed options.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-6 h-6 shrink-0 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              4
            </div>
            <div>
              <h4 className="font-medium text-foreground flex items-center gap-1">
                <Play className="w-4 h-4 text-muted-foreground" />
                Winner Selection
              </h4>
              <p className="text-sm text-muted-foreground">The meal with the most votes becomes the group&apos;s meal choice.</p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-muted/50 border border-border rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Pro tip:</strong> All proposed meals are filtered based on the group&apos;s dietary restrictions
            to ensure everyone can enjoy the winning meal!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}