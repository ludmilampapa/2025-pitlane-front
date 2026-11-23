import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/config/api';

interface BadgeData {
  BadgeID: number;
  name: string;
  description: string;
  badgeType: string;
  iconUrl?: string;
  earnedAt: string;
  progress?: number;
  maxProgress?: number;
}

interface BadgeStats {
  totalBadges: number;
  earnedBadges: number;
  completionPercentage: number;
  recentBadges: BadgeData[];
}

export function useUserBadges(profileId?: string) {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [stats, setStats] = useState<BadgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserBadges = useCallback(async () => {
    if (!profileId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user badges & stats
      const [badgesResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/badges/user/${profileId}`),
        fetch(`${API_BASE_URL}/badges/user/${profileId}/stats`),
      ]);

      if (!badgesResponse.ok) {
        throw new Error(`Failed to fetch badges: ${badgesResponse.status}`);
      }

      const badgesData = await badgesResponse.json();
      const statsData = statsResponse.ok ? await statsResponse.json() : null;

      setBadges(Array.isArray(badgesData) ? badgesData : []);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching user badges:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch badges');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchUserBadges();
  }, [fetchUserBadges]);

  const refetchBadges = useCallback(() => {
    fetchUserBadges();
  }, [fetchUserBadges]);

  return {
    badges,
    stats,
    loading,
    error,
    refetchBadges
  };
}