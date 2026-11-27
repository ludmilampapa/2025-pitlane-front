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
    <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-foreground"><Trophy className="h-5 w-5 text-secondary" /> Meal Podium</CardTitle></CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-3 gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : podium.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No consumptions logged yet.</p>
        ) : (
          <div className="grid grid-cols-3 items-end gap-3">
            {podium.map((meal, index) => {
              const height = index === 0 ? 'h-32' : index === 1 ? 'h-24' : 'h-20';
              const Icon = index === 0 ? Crown : index === 1 ? Medal : Trophy;
              return (
                <div key={meal.mealId} className="text-center">
                  <div className={`${height} flex flex-col items-center justify-center rounded-2xl border border-border bg-background px-2`}>
                    <Icon className={`mb-2 h-5 w-5 ${index === 0 ? 'text-secondary' : index === 1 ? 'text-muted-foreground' : 'text-primary'}`} />
                    <p className="line-clamp-2 text-xs font-bold text-foreground">{meal.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{meal.count} {meal.count === 1 ? 'time' : 'times'}</p>
                  </div>
                  <p className="mt-2 text-xs font-medium text-muted-foreground">#{index + 1}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
