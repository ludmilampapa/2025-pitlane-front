'use client';

import { API_BASE_URL } from '@/lib/config/api';
import { formatArgentinaYMD } from '@/lib/utils/timezone';
import type {
  ActivePausedChallenge,
  Challenge,
  ChallengeProgress,
  ChallengeRankingRow,
  WeeklyMenuEntry,
} from '@/lib/types/groupChallenges';

async function requestJson<T>(url: string, init?: RequestInit, fallbackError = 'Request failed'): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || fallbackError);
  }
  return (await response.json()) as T;
}

/**
 * Facade over group challenges & weekly menu API endpoints.
 */
export const GroupChallengesService = {
  listChallenges(groupId: string | number): Promise<Challenge[]> {
    return requestJson<Challenge[]>(
      `${API_BASE_URL}/groups/${groupId}/challenges`,
      undefined,
      'Failed to load challenges'
    );
  },

  createChallenge(
    groupId: string | number,
    payload: {
      name: string;
      ruleText: string;
      description?: string;
      startDate: string;
      endDate: string;
      pausedFoods?: string[];
      profileId: string;
    }
  ): Promise<Challenge> {
    return requestJson<Challenge>(
      `${API_BASE_URL}/groups/${groupId}/challenges`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Failed to create challenge'
    );
  },

  getProgress(
    challengeId: number,
    profileId: string,
    dateYMD: string = formatArgentinaYMD()
  ): Promise<ChallengeProgress> {
    return requestJson<ChallengeProgress>(
      `${API_BASE_URL}/challenges/${challengeId}/progress/${profileId}?date=${encodeURIComponent(dateYMD)}`,
      undefined,
      'Failed to load challenge progress'
    );
  },

  getRanking(challengeId: number, profileId: string): Promise<ChallengeRankingRow[]> {
    return requestJson<ChallengeRankingRow[]>(
      `${API_BASE_URL}/challenges/${challengeId}/ranking/${profileId}`,
      undefined,
      'Failed to load challenge ranking'
    );
  },

  markCompletion(
    challengeId: number,
    profileId: string,
    dateYMD: string = formatArgentinaYMD(),
    completed = true
  ): Promise<unknown> {
    return requestJson(
      `${API_BASE_URL}/challenges/${challengeId}/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, date: dateYMD, completed }),
      },
      'Failed to mark completion'
    );
  },

  getActivePausedChallenges(
    dateYMD: string = formatArgentinaYMD()
  ): Promise<ActivePausedChallenge[]> {
    return requestJson<ActivePausedChallenge[]>(
      `${API_BASE_URL}/challenges/active-paused?date=${encodeURIComponent(dateYMD)}`,
      undefined,
      'Failed to load active challenges'
    );
  },

  upsertMenuEntry(
    groupId: string | number,
    payload: {
      profileId: string;
      date: string;
      moment: 'breakfast' | 'lunch' | 'snack' | 'dinner';
      mealId: number;
    }
  ): Promise<WeeklyMenuEntry> {
    return requestJson<WeeklyMenuEntry>(
      `${API_BASE_URL}/groups/${groupId}/menu`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Could not save menu slot'
    );
  },

  deleteMenuEntry(entryId: number): Promise<unknown> {
    return requestJson(
      `${API_BASE_URL}/menu/${entryId}`,
      { method: 'DELETE' },
      'Could not clear slot'
    );
  },
};
