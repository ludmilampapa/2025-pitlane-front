'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Clock, ChevronRight, History, Vote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { VotingService } from './VotingService';
import { VotingDetailsModal } from './VotingDetailsModal';
import { useVoting } from '@/lib/contexts/VotingContext';

interface VotingHistoryItem {
  sessionId: number;
  createdAt: string;
  completedAt: string;
  status: string;
  winnerMeal: {
    mealId: number;
    name: string;
    voteCount: number;
  };
  totalVotes: number;
  participantCount: number;
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

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    const unsubscribe = onVotingCompleted(() => {
      loadHistory();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await VotingService.getGroupVotingHistory(groupId, 10, 0);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Card className={`rounded-2xl border-border bg-card shadow-sm ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <History className="h-4 w-4 text-primary" />
              Past Decisions
            </CardTitle>
            {history.length > 0 && (
              <Badge variant="secondary" className="rounded-full text-xs">
                {history.length}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2.5 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/70" />
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
            <div className="max-h-[460px] space-y-2.5 overflow-y-auto pr-1">
              {history.map((session) => (
                <button
                  key={session.sessionId}
                  type="button"
                  onClick={() => handleViewDetails(session.sessionId)}
                  className="group flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-background/60 p-3.5 text-left transition-all hover:border-primary/40 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <Trophy className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {session.winnerMeal.name}
                      </h3>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(session.completedAt || session.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {session.participantCount}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                        <Vote className="h-3 w-3 text-secondary" />
                        {session.totalVotes} {session.totalVotes === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-8 text-center">
              <Trophy className="mx-auto mb-2.5 h-8 w-8 text-muted-foreground/60" />
              <h3 className="text-sm font-semibold text-foreground">No voting history yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Completed group votes and portion choices will show up here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <VotingDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sessionId={selectedSessionId}
      />
    </>
  );
}
