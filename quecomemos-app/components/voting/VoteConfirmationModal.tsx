'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Vote, Users, Clock, CheckCircle, Flame, X, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MealProposal } from './types';

interface VoteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  proposal: MealProposal;
  hasAlreadyVoted: boolean;
  loading?: boolean;
}

export function VoteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  proposal,
  hasAlreadyVoted,
  loading = false,
}: VoteConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const totalCalories =
    proposal.meal.mealFoods?.reduce(
      (total, mealFood) => total + mealFood.food.kCal * mealFood.quantity,
      0
    ) || 0;

  const activeUpvotes = (proposal.votes || []).filter(
    (vote) => vote.isActive && vote.voteType === 'up'
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              {hasAlreadyVoted ? (
                <Undo2 className="h-5 w-5 text-secondary" />
              ) : (
                <Vote className="h-5 w-5 text-primary" />
              )}
              {hasAlreadyVoted ? 'Remove Your Vote?' : 'Confirm Your Vote'}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasAlreadyVoted
                ? 'You already voted for this dish. Would you like to undo your vote?'
                : 'Cast your vote for this dish in the active group session.'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={loading}
            className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-foreground">{proposal.meal.name}</h4>
                {proposal.meal.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{proposal.meal.description}</p>
                )}
              </div>
              {totalCalories > 0 && (
                <Badge
                  variant="secondary"
                  className="shrink-0 gap-1 border border-border bg-card text-foreground"
                >
                  <Flame className="h-3 w-3 text-secondary" />
                  {Math.round(totalCalories)} kcal
                </Badge>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-primary" />
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
            </div>
          </div>

          {activeUpvotes.length > 0 && (
            <div className="rounded-xl border border-primary/25 bg-primary/10 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <CheckCircle className="h-3.5 w-3.5" />
                Current Votes ({proposal.voteCount})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeUpvotes.slice(0, 6).map((vote) => (
                  <span
                    key={vote.VoteID}
                    className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    {vote.voter?.username || 'User'}
                  </span>
                ))}
                {activeUpvotes.length > 6 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    +{activeUpvotes.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2.5 pt-1">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={loading}
              className="flex-1 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={
                hasAlreadyVoted
                  ? 'flex-1 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  : 'flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90'
              }
            >
              {loading
                ? 'Saving...'
                : hasAlreadyVoted
                  ? 'Remove Vote'
                  : 'Confirm Vote'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
