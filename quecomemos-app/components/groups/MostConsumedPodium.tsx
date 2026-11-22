import { Trophy, Crown, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MostConsumedMeal } from '@/components/types/group-consumption';

interface MostConsumedPodiumProps {
  meals: MostConsumedMeal[];
  loading?: boolean;
}

export function MostConsumedPodium({ meals, loading = false }: MostConsumedPodiumProps) {
  const podium = meals.slice(0, 3);

  return (
    <Card className="border-[#E8E2D9] bg-white shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-neutral-900"><Trophy className="h-5 w-5 text-[#C85A32]" /> Podio de comidas</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-[#F3EEE6]" />)}</div>
        ) : podium.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">Todavía no hay consumos registrados.</p>
        ) : (
          <div className="grid grid-cols-3 items-end gap-3">
            {podium.map((meal, index) => {
              const height = index === 0 ? 'h-32' : index === 1 ? 'h-24' : 'h-20';
              const Icon = index === 0 ? Crown : index === 1 ? Medal : Trophy;
              return (
                <div key={meal.mealId} className="text-center">
                  <div className={`${height} flex flex-col items-center justify-center rounded-2xl border border-[#E8E2D9] bg-[#FAF7F2] px-2`}>
                    <Icon className={`mb-2 h-5 w-5 ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-orange-500'}`} />
                    <p className="line-clamp-2 text-xs font-bold text-neutral-900">{meal.name}</p>
                    <p className="mt-1 text-xs text-neutral-500">{meal.count} veces</p>
                  </div>
                  <p className="mt-2 text-xs font-medium text-neutral-500">#{index + 1}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
