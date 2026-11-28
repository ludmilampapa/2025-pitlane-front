'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dices,
  History,
  ListChecks,
  TimerOff,
  Trophy,
  Users,
  UtensilsCrossed,
  Vote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VotingService } from './VotingService';
import { VotingDetailsModal } from './VotingDetailsModal';
import { useVoting } from '@/lib/contexts/VotingContext';
import { useUser } from '@/lib/contexts/UserContext';
import { formatArgentinaDate } from '@/lib/utils/timezone';

interface ProposalSummary {
  proposalId: number;
  mealId: number;
  mealName: string;
  proposedById?: string | null;
  proposedByUsername?: string | null;
  voteCount: number;
}

interface VotingHistoryItem {
  sessionId: number;
  title?: string;
  createdAt: string;
  completedAt: string | null;
  status: string;
  gameMode?: 'classic' | 'roulette' | 'expired';
  cancelReason?: string | null;
  winnerMeal: {
    mealId: number;
    name: string;
    voteCount: number;
    proposedByUsername?: string | null;
  } | null;
  proposals?: ProposalSummary[];
  totalVotes: number;
  participantCount: number;
  loggedUserIds?: string[];
}

interface VotingHistorySectionProps {
  groupId: number;
  className?: string;
}

export function VotingHistorySection({ groupId, className = '' }: VotingHistorySectionProps) {
  const [history, setHistory] = useState<VotingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { onVotingCompleted } = useVoting();
  const { userData } = useUser();
  const currentUserId = userData?.profile?.id;

  useEffect(() => {
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    const unsubscribe = onVotingCompleted(() => {
      void loadHistory();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await VotingService.getGroupVotingHistory(groupId, 15, 0);
      setHistory(data.sessions || []);
    } catch (err) {
      console.error('Failed to load voting history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load voting history');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) =>
    formatArgentinaDate(dateString, 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Group voting trends summary
  const trends = useMemo(() => {
    const completed = history.filter((s) => s.status === 'completed' && s.winnerMeal);
    const expired = history.filter((s) => s.status === 'cancelled' || !s.winnerMeal);
    const rouletteCount = completed.filter((s) => s.gameMode === 'roulette').length;
    const classicCount = completed.length - rouletteCount;

    const dishCounts = new Map<string, number>();
    const proposerCounts = new Map<string, number>();

    for (const session of history) {
      if (session.winnerMeal?.name) {
        dishCounts.set(
          session.winnerMeal.name,
          (dishCounts.get(session.winnerMeal.name) || 0) + 1
        );
      }
      for (const p of session.proposals || []) {
        const who = p.proposedByUsername || 'Member';
        proposerCounts.set(who, (proposerCounts.get(who) || 0) + 1);
      }
    }

    const topDish = [...dishCounts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
    const topProposer = [...proposerCounts.entries()].sort((a, b) => b[1] - a[1])[0] || null;
    const completionRate =
      history.length > 0 ? Math.round((completed.length / history.length) * 100) : 0;

    return {
      total: history.length,
      completedCount: completed.length,
      expiredCount: expired.length,
      rouletteCount,
      classicCount,
      topDish,
      topProposer,
      completionRate,
    };
  }, [history]);

  return (
    <>
      <Card className={`rounded-2xl border-border bg-card shadow-sm ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <History className="h-4 w-4 text-primary" />
              Past Votings
            </CardTitle>
            {history.length > 0 && (
              <Badge variant="secondary" className="rounded-full text-xs">
                {history.length}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-2.5 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/70" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-xs text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={loadHistory} className="mt-2.5 h-7 text-xs">
                Retry
              </Button>
            </div>
          ) : history.length > 0 ? (
            <>
              <div className="space-y-3 rounded-xl border border-border bg-muted/25 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                    Group Trends
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {trends.completionRate}% completed
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                    {trends.completedCount > 0 && (
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${trends.completionRate}%` }}
                      />
                    )}
                    {trends.expiredCount > 0 && (
                      <div
                        className="h-full bg-destructive/60 transition-all"
                        style={{ width: `${100 - trends.completionRate}%` }}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{trends.completedCount} decided</span>
                    {trends.expiredCount > 0 && (
                      <span className="text-destructive">
                        {trends.expiredCount} cancelled (timeout)
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5 text-xs">
                  <div className="rounded-lg border border-border/70 bg-card px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Top Dish
                    </p>
                    <p className="mt-0.5 truncate font-semibold text-foreground">
                      {trends.topDish ? trends.topDish[0] : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Favorite Mode
                    </p>
                    <p className="mt-0.5 truncate font-semibold text-foreground">
                      {trends.completedCount === 0
                        ? '—'
                        : trends.rouletteCount > trends.classicCount
                        ? `Roulette (${trends.rouletteCount})`
                        : `Classic List (${trends.classicCount})`}
                    </p>
                  </div>
                </div>

                {trends.topProposer && (
                  <p className="text-[11px] text-muted-foreground">
                    Most active proposer:{' '}
                    <strong className="text-foreground">{trends.topProposer[0]}</strong> (
                    {trends.topProposer[1]} {trends.topProposer[1] === 1 ? 'dish' : 'dishes'})
                  </p>
                )}
              </div>

              <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                {history.map((session) => {
                  const isCancelled = session.status === 'cancelled' || !session.winnerMeal;
                  const isRoulette = session.gameMode === 'roulette';
                  const proposals = session.proposals || [];

                  return (
                    <button
                      key={session.sessionId}
                      type="button"
                      onClick={() => !isCancelled && handleViewDetails(session.sessionId)}
                      disabled={isCancelled}
                      className={`group flex w-full items-start justify-between gap-2.5 rounded-xl border p-3.5 text-left transition-all ${
                        isCancelled
                          ? 'cursor-default border-destructive/25 bg-destructive/5'
                          : 'border-border bg-background/60 hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                                isCancelled
                                  ? 'bg-destructive/15 text-destructive'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {isCancelled ? (
                                <TimerOff className="h-3.5 w-3.5" />
                              ) : (
                                <Trophy className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <h3 className="truncate text-sm font-semibold text-foreground">
                              {isCancelled
                                ? 'Cancelled · Time expired'
                                : session.winnerMeal?.name || 'Winning meal'}
                            </h3>
                          </div>

                          {!isCancelled && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              {isRoulette ? (
                                <>
                                  <Dices className="h-3 w-3 text-secondary" />
                                  Roulette
                                </>
                              ) : (
                                <>
                                  <ListChecks className="h-3 w-3 text-primary" />
                                  Classic List
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        {isCancelled && (
                          <p className="text-xs text-muted-foreground">
                            Time ran out before the group picked a final meal.
                          </p>
                        )}

                        {proposals.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {proposals.slice(0, 4).map((p) => (
                              <span
                                key={p.proposalId}
                                className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-card px-2 py-0.5 text-[11px] text-muted-foreground"
                              >
                                <span className="font-medium text-foreground">
                                  {p.proposedByUsername || 'Member'}:
                                </span>
                                <span className="truncate">{p.mealName}</span>
                              </span>
                            ))}
                            {proposals.length > 4 && (
                              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                +{proposals.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(session.completedAt || session.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {session.participantCount}
                          </span>
                          {!isCancelled && (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                              <Vote className="h-3 w-3 text-secondary" />
                              {session.totalVotes}{' '}
                              {session.totalVotes === 1 ? 'vote' : 'votes'}
                            </span>
                          )}
                          {!isCancelled && currentUserId && (
                            session.loggedUserIds?.includes(currentUserId) ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Meal logged
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                                <UtensilsCrossed className="h-3 w-3" />
                                Not logged yet
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {!isCancelled && (
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-8 text-center">
              <Trophy className="mx-auto mb-2.5 h-8 w-8 text-muted-foreground/60" />
              <h3 className="text-sm font-semibold text-foreground">No past votings yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Completed and expired group voting sessions and trends will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <VotingDetailsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          void loadHistory();
        }}
        sessionId={selectedSessionId}
      />
    </>
  );
}
