'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config/api';
import { useUser } from '@/lib/contexts/UserContext';
import { useGlobalNotification } from '@/lib/contexts/NotificationContext';
import { playGameSfx } from '@/lib/utils/gameSfx';

interface EarnedBadge {
  BadgeID: number;
  name: string;
  description?: string;
}

const STORAGE_PREFIX = 'qc_seen_badges_';

export function triggerBadgeCheck(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('qc:check-badges'));
  }
}

export function markBadgesSeen(profileId: string, badgeIds: number[]): void {
  if (typeof window === 'undefined' || !profileId || badgeIds.length === 0) return;
  try {
    const key = `${STORAGE_PREFIX}${profileId}`;
    const raw = window.localStorage.getItem(key);
    const existing: number[] = raw ? JSON.parse(raw) : [];
    const merged = Array.from(new Set([...existing, ...badgeIds]));
    window.localStorage.setItem(key, JSON.stringify(merged));
  } catch {
    // Ignore storage errors
  }
}

export function BadgeUnlockWatcher() {
  const { userData } = useUser();
  const profileId = userData.profile?.id;
  const { showSuccess } = useGlobalNotification();
  const inFlightRef = useRef(false);

  const checkBadges = useCallback(async () => {
    if (!profileId || inFlightRef.current || typeof window === 'undefined') return;
    inFlightRef.current = true;
    try {
      const res = await fetch(`${API_BASE_URL}/badges/user/${profileId}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data: EarnedBadge[] = await res.json();
      if (!Array.isArray(data)) return;

      const key = `${STORAGE_PREFIX}${profileId}`;
      const raw = window.localStorage.getItem(key);
      const currentIds = data.map((b) => b.BadgeID);

      // First run for this user: seed seen list without spamming old badges
      if (raw === null) {
        window.localStorage.setItem(key, JSON.stringify(currentIds));
        return;
      }

      const seenSet = new Set<number>(JSON.parse(raw));
      const newlyEarned = data.filter((b) => !seenSet.has(b.BadgeID));

      if (newlyEarned.length > 0) {
        window.localStorage.setItem(
          key,
          JSON.stringify(Array.from(new Set([...seenSet, ...currentIds])))
        );
        playGameSfx('badge');
        for (const badge of newlyEarned) {
          showSuccess(
            'New Badge Unlocked!',
            badge.description ? `${badge.name} — ${badge.description}` : badge.name,
            <Trophy className="h-6 w-6 text-amber-500" />
          );
        }
      }
    } catch {
      // Ignore background polling errors
    } finally {
      inFlightRef.current = false;
    }
  }, [profileId, showSuccess]);

  useEffect(() => {
    if (!profileId) return;
    void checkBadges();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void checkBadges();
      }
    }, 30_000);

    const onFocus = () => void checkBadges();
    const onCustomCheck = () => void checkBadges();

    window.addEventListener('focus', onFocus);
    window.addEventListener('qc:check-badges', onCustomCheck);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('qc:check-badges', onCustomCheck);
    };
  }, [profileId, checkBadges]);

  return null;
}
