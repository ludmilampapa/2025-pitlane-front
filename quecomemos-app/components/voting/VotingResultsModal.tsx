'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Users, TrendingUp, Clock, ChefHat, Flame, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { VotingSession, MealProposal } from './types';

interface VotingResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewMeal: () => void;
  session: VotingSession;
  winnerProposal?: MealProposal;
}

export function VotingResultsModal({
  isOpen,
  onClose,
  onViewMeal,
  session,
  winnerProposal,
}: VotingResultsModalProps) {
  if (!isOpen || !winnerProposal || typeof document === 'undefined') {
    return null;
  }

  const sortedProposals = [...(session.proposals || [])].sort(
    (a, b) => b.voteCount - a.voteCount
  );
  const totalVotes = sortedProposals.reduce((sum, p) => sum + p.voteCount, 0);
  const maxVotes = Math.max(...sortedProposals.map((p) => p.voteCount), 0);

  const totalCalories =
    winnerProposal.meal.mealFoods?.reduce(
      (total, mealFood) => total + mealFood.food.kCal * mealFood.quantity,
      0
    ) || 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <Card
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b border-border/60 bg-card pb-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
                <Trophy className="h-5 w-5 text-amber-500" />
                Voting Results
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                The group has decided! Here is the final breakdown.
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

        <CardContent className="space-y-6 pt-6">
          {/* Winner Banner */}
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                    Winner
                  </span>
                  <h3 className="text-lg font-bold text-foreground">
                    {winnerProposal.meal.name}
                  </h3>
                </div>
              </div>

              <div className="text-right">
                <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                  {winnerProposal.voteCount} {winnerProposal.voteCount === 1 ? 'vote' : 'votes'}
                </Badge>
                {totalCalories > 0 && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Flame className="h-3 w-3 text-secondary" />
                    {Math.round(totalCalories)} kcal
                  </div>
                )}
              </div>
            </div>

            {winnerProposal.meal.description && (
              <p className="text-sm text-muted-foreground">{winnerProposal.meal.description}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/20 pt-2.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                Proposed by {winnerProposal.proposedBy?.username || 'Member'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(winnerProposal.proposedAt).toLocaleString('en-US', {
                  timeZone: 'America/Argentina/Buenos_Aires',
                })}
              </span>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Session Summary
            </h4>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-card p-3 border border-border/60">
                <div className="text-2xl font-bold text-foreground">{sortedProposals.length}</div>
                <div className="text-xs text-muted-foreground">Proposals</div>
              </div>
              <div className="rounded-xl bg-card p-3 border border-border/60">
                <div className="text-2xl font-bold text-secondary">{totalVotes}</div>
                <div className="text-xs text-muted-foreground">Total Votes</div>
              </div>
              <div className="rounded-xl bg-card p-3 border border-border/60">
                <div className="text-2xl font-bold text-primary">
                  {session.group?.members?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Members</div>
              </div>
            </div>
          </div>

          {/* Ranked Proposals */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Full Ranking
            </h4>

            {sortedProposals.map((proposal, index) => {
              const percentage = maxVotes > 0 ? (proposal.voteCount / maxVotes) * 100 : 0;
              const isWinner = proposal.MealProposalID === winnerProposal.MealProposalID;

              return (
                <div
                  key={proposal.MealProposalID}
                  className={`rounded-xl border p-3.5 ${
                    isWinner
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-border bg-background/60'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
                      <span className="font-semibold text-foreground">{proposal.meal.name}</span>
                    </div>
                    <Badge variant={isWinner ? 'default' : 'outline'} className={isWinner ? 'bg-amber-600 text-white hover:bg-amber-600' : ''}>
                      {proposal.voteCount} {proposal.voteCount === 1 ? 'vote' : 'votes'}
                    </Badge>
                  </div>

                  <Progress value={percentage} className="mb-2 h-2" />

                  <div className="text-xs text-muted-foreground">
                    Proposed by {proposal.proposedBy?.username || 'Member'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl">
              Close
            </Button>
            <Button
              onClick={onViewMeal}
              className="flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ChefHat className="mr-1.5 h-4 w-4" />
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
