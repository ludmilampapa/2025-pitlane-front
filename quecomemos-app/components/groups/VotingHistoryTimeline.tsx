'use client';

import React from 'react';
import { Calendar, ChefHat, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/config/api';
import { VotingService } from '@/components/voting/VotingService';

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
        description: 'Nueva juntada creada desde el historial.',
      });

      await VotingService.proposeMeal(started.VotingSessionID, {
        mealId: session.winnerMeal.mealId,
        proposedById: initiatorId,
      });

      toast.success('Juntada creada', { description: `Se inició una nueva sesión con “${session.winnerMeal.name}”.` });
      onRepeated?.(started.VotingSessionID);
    } catch (error) {
      toast.error('No se pudo repetir la juntada', { description: error instanceof Error ? error.message : 'Intentá nuevamente.' });
    }
  };

  if (sessions.length === 0) {
    return (
      <Card className="border border-dashed border-[#E8E2D9] bg-[#FAF7F2]">
        <CardContent className="py-12 text-center"><Calendar className="mx-auto h-10 w-10 text-[#A8B89F]" /><h3 className="mt-3 font-semibold text-neutral-900">Todavía no hay votaciones completadas</h3><p className="mt-1 text-sm text-muted-foreground">La línea de tiempo aparecerá después de la primera juntada.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="relative space-y-5 pl-5 before:absolute before:bottom-2 before:left-1.5 before:top-2 before:w-px before:bg-[#E8E2D9]">
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
    ? new Date(session.completedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Fecha no disponible';

  return (
    <div className="relative">
      <span className="absolute -left-5 top-6 h-3 w-3 rounded-full border-2 border-white bg-[#4A7C59] shadow-sm" />
      <Card className="border-[#E8E2D9] bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C85A32]">Juntada completada</p>
              <h3 className="mt-1 flex items-center gap-2 text-xl font-bold text-neutral-900"><ChefHat className="h-5 w-5 text-[#4A7C59]" />{session.winnerMeal.name}</h3>
              <p className="mt-1 text-sm text-neutral-500">{completedDate} • {session.totalVotes} votos • {session.participantCount} participantes</p>
            </div>
            <Button variant="outline" onClick={onRepeat} className="border-[#E8E2D9] text-[#4A7C59] hover:bg-[#EDF4EE]">
              <RotateCcw className="mr-2 h-4 w-4" />Repetir esta juntada
            </Button>
          </div>

          {participants.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E8E2D9] pt-4">
              {participants.map((participant) => {
                const fraction = participant.portionFraction;
                const label = participant.defaultedToWhole
                  ? '1'
                  : fraction === 0.25 ? '1/4' : fraction === 0.5 ? '1/2' : fraction === 0.75 ? '3/4' : fraction ? fraction.toString() : 'Sin porción';
                return (
                  <span key={participant.userId} className="rounded-full border border-[#D9E5DA] bg-[#EDF4EE] px-3 py-1 text-xs font-semibold text-[#4A7C59]">
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
