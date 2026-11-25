'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, ThumbsUp, Clock, User, Flame, Check } from 'lucide-react';
import { MealComposition } from '../meal/MealComposition';
import { VoteConfirmationModal } from './VoteConfirmationModal';
import type { MealProposal } from './types';
import { DietaryCompatibilityBadge } from './DietaryCompatibilityBadge';

interface DietaryRestriction {
  DietaryRestrictionID: number;
  name: string;
}

interface MealProposalCardProps {
  proposal: MealProposal;
  canVote: boolean;
  isProposalPhase?: boolean;
  hasUserVoted: boolean;
  onVote: () => Promise<void> | void;
  onUndoVote?: () => Promise<void> | void;
  disabled?: boolean;
  showComposition?: boolean;
  groupRestrictions?: DietaryRestriction[];
}

export function MealProposalCard({
  proposal,
  canVote,
  isProposalPhase = false,
  hasUserVoted,
  onVote,
  onUndoVote,
  disabled = false,
  showComposition = false,
  groupRestrictions = [],
}: MealProposalCardProps) {
  const [showVoteConfirmation, setShowVoteConfirmation] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);

  const totalCalories =
    proposal.meal.mealFoods?.reduce(
      (total, mealFood) => total + mealFood.food.kCal * mealFood.quantity,
      0
    ) || 0;

  const mealRestrictions =
    proposal.meal.mealFoods?.flatMap((mealFood) =>
      (mealFood.food.dietaryRestrictions || []).flatMap((restriction) =>
        typeof restriction === 'number'
          ? [{ DietaryRestrictionID: restriction, name: `Restriction ${restriction}` }]
          : [
              {
                DietaryRestrictionID: restriction.DietaryRestrictionID || 0,
                name: restriction.name || `Restriction ${restriction.DietaryRestrictionID || ''}`,
              },
            ]
      )
    ) || [];

  const uniqueMealRestrictions = mealRestrictions.filter(
    (restriction, index, restrictions) =>
      restrictions.findIndex(
        (candidate) => candidate.DietaryRestrictionID === restriction.DietaryRestrictionID
      ) === index
  );

  const activeUpvotes = (proposal.votes || []).filter(
    (vote) => vote.isActive && vote.voteType === 'up'
  );

  const handleOpenVoteAction = () => {
    if (!canVote || disabled) return;
    setShowVoteConfirmation(true);
  };

  const handleConfirmAction = async () => {
    setVotingLoading(true);
    try {
      if (hasUserVoted && onUndoVote) {
        await onUndoVote();
      } else {
        await onVote();
      }
      setShowVoteConfirmation(false);
    } finally {
      setVotingLoading(false);
    }
  };

  return (
    <>
      <div
        className={`group rounded-2xl border p-4 transition-all ${
          hasUserVoted
            ? 'border-primary/50 bg-primary/5 shadow-sm'
            : 'border-border bg-background/60 hover:border-border hover:bg-muted/35'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                <ChefHat className="h-4 w-4" />
              </span>
              <h4 className="text-base font-semibold text-foreground">{proposal.meal.name}</h4>
              {hasUserVoted && (
                <Badge className="border border-primary/30 bg-primary/15 text-primary hover:bg-primary/15 text-xs">
                  <Check className="mr-1 h-3 w-3" />
                  Your Vote
                </Badge>
              )}
              <DietaryCompatibilityBadge
                meal={proposal.meal}
                mealRestrictions={uniqueMealRestrictions}
                groupRestrictions={groupRestrictions}
              />
            </div>

            {proposal.meal.description && (
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                {proposal.meal.description}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-primary" />
                {proposal.proposedBy?.username || 'Member'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(proposal.proposedAt).toLocaleTimeString('en-US', {
                  timeZone: 'America/Argentina/Buenos_Aires',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {totalCalories > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                  <Flame className="h-3 w-3 text-secondary" />
                  {Math.round(totalCalories)} kcal
                </span>
              )}
            </div>

            {showComposition && proposal.meal && (
              <div className="mt-3">
                <MealComposition meal={proposal.meal} />
              </div>
            )}
          </div>

          {/* Right Vote Counter + CTA (both the 👍 pill and button trigger voting when canVote is true) */}
          <div className="flex shrink-0 items-center justify-between gap-2.5 border-t border-border/60 pt-2.5 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
            <button
              type="button"
              onClick={handleOpenVoteAction}
              disabled={!canVote || disabled}
              title={
                canVote
                  ? hasUserVoted
                    ? 'Click to remove your vote'
                    : 'Click to vote for this meal'
                  : 'Voting opens once the proposal phase ends'
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 shadow-sm transition-all ${
                canVote
                  ? hasUserVoted
                    ? 'cursor-pointer border-primary/50 bg-primary/10 hover:bg-primary/15'
                    : 'cursor-pointer border-border bg-card hover:border-secondary/50 hover:bg-secondary/10'
                  : 'cursor-default border-border bg-card opacity-85'
              }`}
            >
              <ThumbsUp
                className={`h-3.5 w-3.5 ${
                  hasUserVoted
                    ? 'fill-primary text-primary'
                    : proposal.voteCount > 0
                      ? 'text-secondary'
                      : 'text-muted-foreground'
                }`}
              />
              <span className="text-base font-bold tabular-nums text-foreground">
                {proposal.voteCount}
              </span>
              <span className="text-xs text-muted-foreground">
                {proposal.voteCount === 1 ? 'vote' : 'votes'}
              </span>
            </button>

            {canVote ? (
              <Button
                type="button"
                onClick={handleOpenVoteAction}
                size="sm"
                disabled={disabled}
                variant={hasUserVoted ? 'outline' : 'default'}
                className={
                  hasUserVoted
                    ? 'rounded-xl border-primary/50 text-primary hover:bg-primary/10'
                    : 'rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90'
                }
              >
                {hasUserVoted ? 'Voted ✓' : 'Vote'}
              </Button>
            ) : isProposalPhase ? (
              <span className="text-[11px] font-medium text-muted-foreground">
                Voting opens next
              </span>
            ) : null}
          </div>
        </div>

        {/* Voter Chips */}
        {activeUpvotes.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2.5">
            <span className="text-[11px] font-medium text-muted-foreground">Voted by:</span>
            {activeUpvotes.map((vote) => (
              <span
                key={vote.VoteID}
                className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground"
              >
                {vote.voter?.username || 'Member'}
              </span>
            ))}
          </div>
        )}
      </div>

      <VoteConfirmationModal
        isOpen={showVoteConfirmation}
        onClose={() => setShowVoteConfirmation(false)}
        onConfirm={handleConfirmAction}
        proposal={proposal}
        hasAlreadyVoted={hasUserVoted}
        loading={votingLoading}
      />
    </>
  );
}
