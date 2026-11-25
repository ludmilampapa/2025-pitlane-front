import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '@/lib/config/api';
import type { GroupData, WeeklyMenuEntry } from '@/lib/types/groupChallenges';
import { getArgentinaMondayYMD } from '@/lib/utils/timezone';

export {
  addDaysYMD,
  formatArgentinaYMD as formatLocalYMD,
  getArgentinaMondayYMD as getMondayYMD,
} from '@/lib/utils/timezone';

interface UseWeeklyMenuResult {
  entries: WeeklyMenuEntry[];
  loading: boolean;
  error: string | null;
  weekStart: string;
  setWeekStart: (weekStartYMD: string) => void;
  refresh: () => Promise<void>;
}

export function useWeeklyMenu(
  groupId: string,
  profileId: string | undefined,
  initialWeekStart?: string
): UseWeeklyMenuResult {
  const [weekStart, setWeekStart] = useState<string>(() => initialWeekStart || getArgentinaMondayYMD());
  const [entries, setEntries] = useState<WeeklyMenuEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/groups/${groupId}/menu?weekStart=${encodeURIComponent(weekStart)}`
      );
      if (!response.ok) throw new Error('Could not load weekly menu');
      setEntries((await response.json()) as WeeklyMenuEntry[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [groupId, profileId, weekStart]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, loading, error, weekStart, setWeekStart, refresh };
}

export function getGroupAdmin(group: GroupData | null, profileId: string | undefined): boolean {
  if (!group || !profileId) return false;
  return (
    group.createdBy === profileId ||
    group.members.some((member) => member.profile.id === profileId && member.role === 'admin')
  );
}
