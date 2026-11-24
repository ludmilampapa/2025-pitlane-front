'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '@/lib/config/api';
import { useUser } from '@/lib/contexts/UserContext';

export type InboxNotificationType = 'voting' | 'menu_proposal' | 'group_invitation';

export interface InboxNotification {
  id: string;
  type: InboxNotificationType;
  groupId?: number;
  groupName: string;
  title: string;
  description: string;
  href: string;
  createdAt: string;
  meta?: Record<string, unknown>;
}

interface NotificationsResponse {
  notifications: InboxNotification[];
  counts: {
    total: number;
    voting: number;
    menuProposals: number;
    invitations: number;
  };
}

const READ_STORAGE_KEY = 'qc_read_notifications_v1';
const READ_EVENT = 'qc-notifications-read-updated';

function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((v): v is string => typeof v === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    // Keep only the latest 200 IDs to avoid unbounded growth
    const arr = Array.from(ids).slice(-200);
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(arr));
    window.dispatchEvent(new Event(READ_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function useInboxNotifications() {
  const { userData } = useUser();
  const profileId = userData?.profile?.id;

  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());

  const fetchNotifications = useCallback(async () => {
    if (!profileId) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/notifications`);
      if (!res.ok) return;
      const data = (await res.json()) as NotificationsResponse;
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // Fail quietly so polling never spams the user
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void fetchNotifications();
    if (!profileId) return;

    const interval = window.setInterval(() => {
      void fetchNotifications();
    }, 20000);

    const handleFocus = () => {
      void fetchNotifications();
    };
    const handleReadSync = () => {
      setReadIds(loadReadIds());
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener(READ_EVENT, handleReadSync);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(READ_EVENT, handleReadSync);
    };
  }, [fetchNotifications, profileId]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      saveReadIds(next);
      return next;
    });
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds],
  );

  return {
    notifications,
    loading,
    readIds,
    unreadCount,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
