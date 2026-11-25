'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Users, Clock, PieChart, X, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VotingService } from './VotingService';
import { MealModal } from '@/components/modals/meal-modal';
import { useUser } from '@/lib/contexts/UserContext';
import { API_BASE_URL } from '@/lib/config/api';
import { PortionSelectionModal } from './PortionSelectionModal';

interface Participant {
  userId: string;
  userName: string;
  hasSelectedPortion: boolean;
  defaultedToWhole: boolean;
  portionFraction?: number;
  portionDeadline: string;
  joinedAt: string;
}

interface VotingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number | null;
}

interface SessionDetails {
  sessionId: number;
  createdAt: string;
  status: string;
  winnerMeal?: {
    mealId: number;
    name: string;
    description?: string;
    mealFoods: Array<{
      foodId: number;
      foodName: string;
      quantity: number;
      svgLink?: string;
      kCal: number;
    }>;
    totalCalories: number;
  };
  proposals: Array<{
    proposalId: number;
    mealId: number;
    mealName: string;
    proposedBy: string;
    voteCount: number;
  }>;
  participants: Participant[];
}

export function VotingDetailsModal({ isOpen, onClose, sessionId }: VotingDetailsModalProps) {
  const { userData } = useUser();
  const [loading, setLoading] = useState(true);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showPortionModal, setShowPortionModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{
    MealID: number;
    name: string;
    description?: string;
    preparationTime?: number;
    servings?: number;
    createdAt: string;
    updatedAt: string;
    profileId: string;
    profile: {
      username?: string;
      id: string;
      role: string;
    };
    mealFoods: Array<{
      food: {
        FoodID: number;
        name: string;
        svgLink?: string;
        kCal: number;
      };
      quantity: number;
    }>;
  } | null>(null);

  const userId = userData?.profile?.id;

  const loadSessionDetails = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      const details = await VotingService.getVotingSessionDetails(sessionId);
      setSessionDetails(details);
    } catch (err) {
      console.error('Failed to load session details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewWinnerMeal = async () => {
    if (!sessionDetails?.winnerMeal) return;

    try {
      const response = await fetch(`${API_BASE_URL}/meals/${sessionDetails.winnerMeal.mealId}`);
      if (!response.ok) throw new Error('Failed to fetch meal details');

      const mealData = await response.json();
      setSelectedMeal(mealData);
      setShowMealModal(true);
    } catch (err) {
      console.error('Error loading meal details:', err);
    }
  };

  const getCurrentUserParticipant = () => {
    if (!userId || !sessionDetails?.participants) return null;
    return sessionDetails.participants.find((p) => p.userId === userId);
  };

  useEffect(() => {
    if (isOpen && sessionId) {
      loadSessionDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sessionId]);

  const renderProposals = () => {
    if (!sessionDetails?.proposals || sessionDetails.proposals.length === 0) {
      return <p className="text-sm text-muted-foreground">No proposals found.</p>;
    }

    const sortedProposals = [...sessionDetails.proposals].sort(
      (a, b) => b.voteCount - a.voteCount
    );
    const totalVotes = sortedProposals.reduce((sum, p) => sum + p.voteCount, 0);
    const winner = sortedProposals[0];
    const currentParticipant = getCurrentUserParticipant();
    const deadlinePassed =
      !!currentParticipant?.portionDeadline &&
      new Date() > new Date(currentParticipant.portionDeadline);

    return (
      <div className="space-y-4">
        {winner && sessionDetails.winnerMeal && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Winner
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleViewWinnerMeal}
                  className="text-left text-base font-bold text-foreground transition-colors hover:text-primary"
                >
                  {winner.mealName}
                </button>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Proposed by {winner.proposedBy}
                </p>
                {sessionDetails.winnerMeal.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {sessionDetails.winnerMeal.description}
                  </p>
                )}
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{winner.voteCount}</div>
                <p className="text-xs text-muted-foreground">
                  {totalVotes > 0 ? `${Math.round((winner.voteCount / totalVotes) * 100)}%` : '0%'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewWinnerMeal}
                className="flex-1 rounded-xl bg-card"
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                View Meal
              </Button>

              {userId && sessionDetails.status === 'completed' && (
                <Button
                  size="sm"
                  variant={currentParticipant?.hasSelectedPortion ? 'outline' : 'default'}
                  onClick={() => setShowPortionModal(true)}
                  disabled={Boolean(currentParticipant?.defaultedToWhole || deadlinePassed)}
                  className={
                    currentParticipant?.hasSelectedPortion
                      ? 'flex-1 rounded-xl border-primary/40 bg-card text-primary'
                      : 'flex-1 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  }
                >
                  <PieChart className="mr-1.5 h-3.5 w-3.5" />
                  {currentParticipant?.hasSelectedPortion
                    ? `Portion: ${Math.round((currentParticipant.portionFraction || 1) * 100)}%`
                    : deadlinePassed
                      ? 'Deadline Passed'
                      : currentParticipant?.defaultedToWhole
                        ? 'Whole Meal (Default)'
                        : 'Select Portion'}
                </Button>
              )}
            </div>
          </div>
        )}

        {sortedProposals.length > 1 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Other Proposals
            </h4>
            {sortedProposals.slice(1).map((proposal, index) => {
              const pct = totalVotes > 0 ? (proposal.voteCount / totalVotes) * 100 : 0;
              return (
                <div
                  key={proposal.proposalId}
                  className="rounded-xl border border-border bg-background/60 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 2}
                        </Badge>
                        <p className="truncate text-sm font-medium text-foreground">
                          {proposal.mealName}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        by {proposal.proposedBy}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-foreground">
                        {proposal.voteCount}
                      </div>
                      <p className="text-xs text-muted-foreground">{Math.round(pct)}%</p>
                    </div>
                  </div>
                  <Progress value={pct} className="mt-2 h-1.5" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderParticipants = () => {
    if (!sessionDetails?.participants || sessionDetails.participants.length === 0) {
      return <p className="text-sm text-muted-foreground">No participants recorded.</p>;
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3.5 w-3.5 text-primary" />
          Participants ({sessionDetails.participants.length})
        </div>

        <div className="grid gap-2">
          {sessionDetails.participants.map((participant) => (
            <div
              key={participant.userId}
              className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3.5 py-2.5"
            >
              <span className="text-sm font-medium text-foreground">{participant.userName}</span>
              <div className="flex items-center gap-2">
                {participant.hasSelectedPortion ? (
                  <Badge className="border border-primary/30 bg-primary/15 text-primary hover:bg-primary/15 text-xs">
                    <PieChart className="mr-1 h-3 w-3" />
                    {participant.portionFraction
                      ? `${Math.round(participant.portionFraction * 100)}% portion`
                      : 'Portion selected'}
                  </Badge>
                ) : participant.defaultedToWhole ? (
                  <Badge variant="secondary" className="text-xs">
                    Full meal (default)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-secondary border-secondary/40">
                    Pending portion
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {isOpen && typeof document !== 'undefined' &&
        createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <Card
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-card pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
                <Trophy className="h-5 w-5 text-secondary" />
                Voting Session Details
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 pt-5">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {!loading && !error && sessionDetails && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(sessionDetails.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Badge variant="secondary" className="capitalize">
                      {sessionDetails.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Voting Results</h3>
                    {renderProposals()}
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Member Portions</h3>
                    {renderParticipants()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>,
        document.body
      )}

      {sessionDetails?.winnerMeal && userId && (
        <PortionSelectionModal
          isOpen={showPortionModal}
          onClose={() => setShowPortionModal(false)}
          sessionId={sessionId!}
          winnerMeal={sessionDetails.winnerMeal}
          userId={userId}
          onSuccess={loadSessionDetails}
        />
      )}

      {selectedMeal && (
        <MealModal
          meal={selectedMeal}
          isOpen={showMealModal}
          onClose={() => {
            setShowMealModal(false);
            setSelectedMeal(null);
          }}
        />
      )}
    </>
  );
}
