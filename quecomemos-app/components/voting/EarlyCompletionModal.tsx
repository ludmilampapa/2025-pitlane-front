'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Clock, Trophy, Vote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { VotingSession } from './types';

interface EarlyCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onContinue: () => void;
  session: VotingSession;
  loading?: boolean;
}

export function EarlyCompletionModal({
  isOpen,
  onClose,
  onConfirm,
  onContinue,
  session,
  loading = false,
}: EarlyCompletionModalProps) {
  if (!isOpen || typeof document === 'undefined') return null;

  const totalMembers = session.group?.members?.length || 0;
  const totalVoters = new Set(
    session.proposals?.flatMap((p) =>
      (p.votes || []).filter((v) => v.isActive).map((v) => v.voterId)
    ) || []
  ).size;

  const majorityThreshold = Math.ceil(totalMembers * 0.6);
  const hasMajority = totalVoters >= majorityThreshold;
  const participationPercentage = totalMembers > 0 ? (totalVoters / totalMembers) * 100 : 0;

  const leadingProposal =
    session.proposals?.reduce((leader, current) => {
      if (!leader) return current;
      return current.voteCount > leader.voteCount ? current : leader;
    }, session.proposals[0]) || null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <Card
        className="w-full max-w-lg rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b border-border/60 bg-card pb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Trophy className="h-5 w-5 text-secondary" />
                End Voting Early?
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasMajority
                  ? 'Over 60% of group members have voted. You can finalize the decision now.'
                  : 'Most active members have voted. You can wrap up or let the timer run.'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          {/* Participation */}
          <div className="space-y-2.5 rounded-xl border border-border bg-background/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Group Participation</span>
              <span className="font-semibold text-foreground">
                {totalVoters} / {totalMembers} members
              </span>
            </div>

            <Progress value={participationPercentage} className="h-2" />

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {participationPercentage.toFixed(0)}% voted
              </span>
              <Badge
                variant={hasMajority ? 'default' : 'outline'}
                className={
                  hasMajority
                    ? 'border border-primary/30 bg-primary/15 text-primary hover:bg-primary/15'
                    : ''
                }
              >
                {hasMajority ? 'Majority Reached' : 'In Progress'}
              </Badge>
            </div>
          </div>

          {/* Current Leader */}
          {leadingProposal && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <Trophy className="h-3.5 w-3.5" />
                Current Leader
              </div>
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-foreground">{leadingProposal.meal.name}</h4>
                <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                  {leadingProposal.voteCount} {leadingProposal.voteCount === 1 ? 'vote' : 'votes'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Proposed by {leadingProposal.proposedBy?.username || 'Member'}
              </p>
            </div>
          )}

          {/* Options info */}
          <div className="space-y-1.5 rounded-xl border border-border bg-muted/35 p-3.5 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Vote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">Finalize Now:</strong> Crowns the current leader and logs it for the group.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
              <span>
                <strong className="text-foreground">Keep Open:</strong> Wait for remaining members or the countdown timer.
              </span>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button
              onClick={onContinue}
              variant="outline"
              disabled={loading}
              className="flex-1 rounded-xl"
            >
              <Clock className="mr-1.5 h-4 w-4" />
              Keep Open
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading || !leadingProposal}
              className="flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Trophy className="mr-1.5 h-4 w-4" />
              {loading ? 'Finalizing...' : 'Finalize Now'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
