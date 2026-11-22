'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Heart, RotateCcw, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/config/api';
import { useUser } from '@/lib/contexts/UserContext';
import { useVoting } from '@/lib/contexts/VotingContext';
import { VotingService } from './VotingService';
import type { VotingSession } from './types';

interface MatchMeal {
  MealID: number;
  name: string;
  description: string | null;
  svgLink?: string;
  mealFoods: Array<{ quantity: number; food: { kCal: number; name: string; dietaryRestrictions?: Array<{ name: string }> } }>;
  profile?: { id: string; username: string };
}

interface FilteredMealsResponse {
  availableMeals: MatchMeal[];
  appliedRestrictions: Array<{ DietaryRestrictionID: number; name: string }>;
}

interface GroupSwipeMatchProps {
  groupId: number;
  session: VotingSession | null;
  onFinished?: () => void;
}

export function GroupSwipeMatch({ groupId, session, onFinished }: GroupSwipeMatchProps) {
  const { userData } = useUser();
  const { refreshSession } = useVoting();
  const profileId = userData?.profile?.id;

  const [meals, setMeals] = useState<MatchMeal[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finishedMembers, setFinishedMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function loadCompatibleMeals() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/consumptions/groups/${groupId}/filtered-meals`);
        if (!response.ok) throw new Error('No pudimos cargar las comidas compatibles');
        const data = await response.json() as FilteredMealsResponse;
        if (!cancelled) setMeals(data.availableMeals || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCompatibleMeals();
    return () => { cancelled = true; };
  }, [groupId]);

  const currentMeal = meals[index] ?? null;

  const restrictions = useMemo(() => {
    if (!currentMeal) return [];
    const names = new Set<string>();
    currentMeal.mealFoods.forEach((mealFood) => {
      mealFood.food.dietaryRestrictions?.forEach((restriction) => names.add(restriction.name));
    });
    return Array.from(names);
  }, [currentMeal]);

  const calories = currentMeal?.mealFoods.reduce(
    (total, mealFood) => total + mealFood.quantity * mealFood.food.kCal,
    0,
  ) ?? 0;

  const members = session?.group.members || [];

  const finishSwiping = () => {
    if (profileId) {
      setFinishedMembers((current) => new Set(current).add(profileId));
    }
    toast.success('Match rápido completado', { description: 'Tus preferencias ya fueron registradas.' });
    onFinished?.();
  };

  const handlePass = () => {
    if (index + 1 >= meals.length) {
      finishSwiping();
      return;
    }
    setIndex((current) => current + 1);
  };

  const handleLike = async () => {
    if (!currentMeal) return;

    try {
      if (!session) {
        throw new Error('No hay una sesión de votación activa');
      }

      if (!profileId) {
        throw new Error('Tenés que iniciar sesión');
      }

      if (session.status === 'proposal_phase') {
        await VotingService.proposeMeal(session.VotingSessionID, {
          mealId: currentMeal.MealID,
          proposedById: profileId,
        });
        toast.success('Comida propuesta', { description: `“${currentMeal.name}” fue propuesta al grupo.` });
      } else if (session.status === 'voting_phase') {
        const existingProposal = session.proposals.find((proposal) => proposal.mealId === currentMeal.MealID);
        if (!existingProposal) {
          await VotingService.proposeMeal(session.VotingSessionID, {
            mealId: currentMeal.MealID,
            proposedById: profileId,
          });
        }

        const refreshedSession = await VotingService.getVotingSession(session.VotingSessionID);
        const proposal = refreshedSession.proposals.find((item) => item.mealId === currentMeal.MealID);
        if (!proposal) throw new Error('La propuesta todavía no está disponible');

        await VotingService.castVote(session.VotingSessionID, {
          mealProposalId: proposal.MealProposalID,
          voterId: profileId,
          voteType: 'up',
        });
        toast.success('¡Me tienta!', { description: `Votaste por “${currentMeal.name}”.`, action: { label: 'Deshacer', onClick: () => void refreshSession() } });
      }

      await refreshSession();
      if (index + 1 >= meals.length) {
        finishSwiping();
      } else {
        setIndex((current) => current + 1);
      }
    } catch (err) {
      toast.error('No se pudo registrar tu elección', {
        description: err instanceof Error ? err.message : 'Intentá nuevamente.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-[#E8E2D9] bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#E8E2D9] border-t-[#4A7C59]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-[#E8E2D9] bg-white"><CardContent className="p-8 text-center"><p className="text-sm text-[#C85A32]">{error}</p></CardContent></Card>
    );
  }

  if (!currentMeal) {
    return (
      <Card className="border border-dashed border-[#DCCFBE] bg-[#FAF7F2]">
        <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
          <Utensils className="h-12 w-12 text-[#A8B89F]" />
          <h3 className="mt-4 text-xl font-bold text-neutral-900">Ya revisaste todas las opciones</h3>
          <p className="mt-2 max-w-md text-sm text-neutral-600">Tus elecciones quedaron registradas para la sesión del grupo.</p>
          <Button variant="outline" className="mt-5 border-[#E8E2D9]" onClick={() => setIndex(0)}><RotateCcw className="mr-2 h-4 w-4" />Volver a empezar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#E8E2D9] bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4A7C59]">Modo Match Rápido</p>
          <p className="mt-1 text-sm text-neutral-500">{index + 1} de {meals.length} opciones compatibles</p>
        </div>
        <div className="flex -space-x-2">
          {members.slice(0, 5).map((member) => {
            const done = finishedMembers.has(member.profile.id);
            return (
              <div key={member.profile.id} title={member.profile.username} className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#F3EEE6] text-xs font-bold text-[#4A7C59]">
                {(member.profile.username || 'U').slice(0, 2).toUpperCase()}
                {done && <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#4A7C59] text-white"><Check className="h-3 w-3" /></span>}
              </div>
            );
          })}
        </div>
      </div>

      <Card className="mx-auto max-w-xl overflow-hidden border-[#E8E2D9] bg-white shadow-[0_18px_50px_-30px_rgba(74,124,89,0.45)]">
        <CardContent className="p-0">
          <div className="relative flex h-72 items-center justify-center bg-gradient-to-br from-[#F3EEE6] via-[#FAF7F2] to-[#E8F0E6]">
            {currentMeal.svgLink ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentMeal.svgLink} alt={currentMeal.name} className="h-full w-full object-cover" />
            ) : (
              <Utensils className="h-16 w-16 text-[#A8B89F]" />
            )}
            <Badge className="absolute right-4 top-4 border border-emerald-200 bg-emerald-50 text-emerald-700">100% Apto Grupo</Badge>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900">{currentMeal.name}</h2>
              {currentMeal.description && <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{currentMeal.description}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-[#E8E2D9] bg-[#FAF7F2] text-neutral-700">{calories} kcal</Badge>
              {restrictions.length > 0 ? restrictions.map((restriction) => (
                <Badge key={restriction} className="border border-emerald-200 bg-emerald-50 text-emerald-700">Sin {restriction}</Badge>
              )) : (
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">Etiquetas seguras</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button variant="outline" onClick={handlePass} className="h-14 rounded-2xl border-[#E8E2D9] text-neutral-600 hover:bg-neutral-50">
                <RotateCcw className="mr-2 h-5 w-5" />Paso
              </Button>
              <Button onClick={() => void handleLike()} className="h-14 rounded-2xl bg-[#C85A32] text-white shadow-sm hover:bg-[#B84F2B]">
                <Heart className="mr-2 h-5 w-5 fill-current" />Me tienta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
