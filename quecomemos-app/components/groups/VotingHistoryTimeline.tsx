'use client';

import React from 'react';
import { Calendar, ChefHat, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VotingService } from '@/components/voting/VotingService';
import { formatArgentinaDate } from '@/lib/utils/timezone';

export interface TimelineSession {
  sessionId: number;
  createdAt: string;
  completedAt: string | null;
  winnerMeal: { mealId: number; name: string; voteCount: number };
  totalVotes: number;
  participantCount: number;
}

export interface TimelineParticipant {
  userId: string;
  userName: string;
  portionFraction?: number;
  hasSelectedPortion: boolean;
  defaultedToWhole: boolean;
}

interface VotingHistoryTimelineProps {
  sessions: TimelineSession[];
  initiatorId: string;
  groupId: number;
  loadParticipants: (sessionId: number) => Promise<TimelineParticipant[]>;
  onRepeated?: (sessionId: number) => void;
}

export function VotingHistoryTimeline({ sessions, initiatorId, groupId, loadParticipants, onRepeated }: VotingHistoryTimelineProps) {
  const repeatSession = async (session: TimelineSession) => {
    try {
      const started = await VotingService.startVotingSession({
        initiatorId,
        groupId,
        title: `Repeat: ${session.winnerMeal.name}`,
        description: 'New voting session created from history.',
      });

      await VotingService.proposeMeal(started.VotingSessionID, {
        mealId: session.winnerMeal.mealId,
        proposedById: initiatorId,
      });

      toast.success('Voting session created', { description: `Started a new session with "${session.winnerMeal.name}".` });
      onRepeated?.(started.VotingSessionID);
    } catch (error) {
      toast.error('Could not repeat session', { description: error instanceof Error ? error.message : 'Please try again.' });
    }
  };

  if (sessions.length === 0) {
    return (
      <Card className="border border-dashed border-border bg-card">
        <CardContent className="py-12 text-center"><Calendar className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-3 font-semibold text-foreground">No completed voting sessions yet</h3><p className="mt-1 text-sm text-muted-foreground">The timeline will appear after your first group vote.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="relative space-y-5 pl-5 before:absolute before:bottom-2 before:left-1.5 before:top-2 before:w-px before:bg-border">
      {sessions.map((session) => (
        <SessionTimelineCard
          key={session.sessionId}
          session={session}
          loadParticipants={loadParticipants}
          onRepeat={() => void repeatSession(session)}
        />
      ))}
    </div>
  );
}

interface SessionTimelineCardProps {
  session: TimelineSession;
  loadParticipants: (sessionId: number) => Promise<TimelineParticipant[]>;
  onRepeat: () => void;
}

function SessionTimelineCard({ session, loadParticipants, onRepeat }: SessionTimelineCardProps) {
  const [participants, setParticipants] = React.useState<TimelineParticipant[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void loadParticipants(session.sessionId).then((items) => {
      if (!cancelled) setParticipants(items);
    });
    return () => { cancelled = true; };
  }, [session.sessionId, loadParticipants]);

  const completedDate = session.completedAt
    ? formatArgentinaDate(session.completedAt, 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date unavailable';

  return (
    <div className="relative">
      <span className="absolute -left-5 top-6 h-3 w-3 rounded-full border-2 border-card bg-primary shadow-sm" />
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">Completed vote</p>
              <h3 className="mt-1 flex items-center gap-2 text-xl font-bold text-foreground"><ChefHat className="h-5 w-5 text-primary" />{session.winnerMeal.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{completedDate} • {session.totalVotes} votes • {session.participantCount} participants</p>
            </div>
            <Button variant="outline" onClick={onRepeat} className="border-border text-primary hover:bg-primary/10">
              <RotateCcw className="mr-2 h-4 w-4" />Repeat this vote
            </Button>
          </div>

          {participants.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {participants.map((participant) => {
                const fraction = participant.portionFraction;
                const label = participant.defaultedToWhole
                  ? '1'
                  : fraction === 0.25 ? '1/4' : fraction === 0.5 ? '1/2' : fraction === 0.75 ? '3/4' : fraction ? fraction.toString() : 'No portion';
                return (
                  <span key={participant.userId} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {participant.userName}: {label}
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
