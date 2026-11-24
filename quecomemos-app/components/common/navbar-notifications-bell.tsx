'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CalendarDays, CheckCheck, RefreshCw, UserPlus, Vote } from 'lucide-react';
import { useInboxNotifications, type InboxNotification } from '@/lib/hooks/useInboxNotifications';
import { useUser } from '@/lib/contexts/UserContext';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NavbarNotificationsBell() {
  const router = useRouter();
  const { userData } = useUser();
  const { notifications, loading, readIds, unreadCount, refresh, markAsRead, markAllAsRead } =
    useInboxNotifications();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!userData?.profile?.id) return null;

  const handleOpenItem = (item: InboxNotification) => {
    markAsRead(item.id);
    setOpen(false);
    router.push(item.href);
  };

  const renderIcon = (type: InboxNotification['type']) => {
    switch (type) {
      case 'voting':
        return (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Vote className="h-4 w-4" />
          </span>
        );
      case 'menu_proposal':
        return (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CalendarDays className="h-4 w-4" />
          </span>
        );
      case 'group_invitation':
        return (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UserPlus className="h-4 w-4" />
          </span>
        );
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) void refresh();
        }}
        aria-label="Notifications inbox"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#C85A32] px-1 text-[11px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {notifications.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {notifications.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                title="Refresh notifications"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium text-foreground">You&apos;re all caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Active group votes, weekly menu change proposals, and group invitations will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !readIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenItem(item)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${
                      isUnread ? 'bg-primary/5' : ''
                    }`}
                  >
                    {renderIcon(item.type)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                        {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#C85A32]" />}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground/80">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
