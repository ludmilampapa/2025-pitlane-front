'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Users, TrendingUp, Clock, ChefHat, Flame, X, Crown, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfettiBurst } from './ConfettiBurst';
import { playGameSfx } from '@/lib/utils/gameSfx';
import { useUser } from '@/lib/contexts/UserContext';
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
  const { userData } = useUser();
  const currentUserId = userData?.profile?.id;
  const userWon = Boolean(currentUserId && winnerProposal?.proposedById === currentUserId);

  useEffect(() => {
    if (isOpen && winnerProposal) {
      playGameSfx('winner');
    }
  }, [isOpen, winnerProposal]);

  if (!isOpen || !winnerProposal || typeof document === 'undefined') {
    return null;
  }

  const sortedProposals = [...(session.proposals || [])].sort(
    (a, b) => b.voteCount - a.voteCount
  );
  const podiumTop3 = sortedProposals.slice(0, 3);
  const winnerImage = (winnerProposal.meal as { svgLink?: string | null }).svgLink || null;
  const totalVotes = sortedProposals.reduce((sum, p) => sum + p.voteCount, 0);
  const maxVotes = Math.max(...sortedProposals.map((p) => p.voteCount), 0);
  const tiedAtTopCount = sortedProposals.filter((p) => p.voteCount === maxVotes).length;
  const wasRandomTieBreaker = tiedAtTopCount > 1;

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
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ConfettiBurst active={isOpen} />
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
          {userWon && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-emerald-800 dark:text-emerald-200">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <Award className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">You won this vote!</p>
                <p className="text-xs opacity-90">
                  Your dish took 1st place and counts toward your Vote Winner badge.
                </p>
              </div>
            </div>
          )}

          {/* Winner Banner with Dish Photo */}
          <div className="overflow-hidden rounded-2xl border border-amber-500/40 bg-amber-500/10">
            {winnerImage && (
              <div className="relative h-44 w-full overflow-hidden border-b border-amber-500/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={winnerImage}
                  alt={winnerProposal.meal.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute left-4 top-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-md">
                  <Crown className="h-3.5 w-3.5" />
                  Champion Dish
                </span>
              </div>
            )}
            <div className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                    {wasRandomTieBreaker ? `Winner · Random tie-breaker (${tiedAtTopCount} tied)` : 'Winner'}
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
          </div>

          {/* Arcade Top-3 Podium */}
          {podiumTop3.length >= 2 && (
            <div className="grid grid-cols-3 items-end gap-3 rounded-2xl border border-border bg-muted/25 p-4 pt-6 text-center">
              {[
                { item: podiumTop3[1], rank: '2nd', height: 'h-20', bg: 'bg-slate-400/20 border-slate-400/40' },
                { item: podiumTop3[0], rank: '1st', height: 'h-28', bg: 'bg-amber-500/20 border-amber-500/50' },
                { item: podiumTop3[2], rank: '3rd', height: 'h-16', bg: 'bg-secondary/15 border-secondary/35' },
              ].map(({ item, rank, height, bg }) =>
                item ? (
                  <div key={item.MealProposalID} className="flex flex-col items-center gap-1.5">
                    <p className="line-clamp-1 text-xs font-bold text-foreground">
                      {item.meal.name}
                    </p>
                    <div
                      className={`flex w-full flex-col items-center justify-center rounded-t-xl border ${bg} ${height} px-2`}
                    >
                      <span className="text-sm font-extrabold text-foreground">{rank}</span>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {item.voteCount} {item.voteCount === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div key={rank} />
                )
              )}
            </div>
          )}

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
