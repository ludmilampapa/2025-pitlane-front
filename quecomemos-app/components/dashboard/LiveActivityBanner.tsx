'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, UserPlus, Vote } from 'lucide-react';
import { useInboxNotifications } from '@/lib/hooks/useInboxNotifications';

export function LiveActivityBanner() {
  const { notifications, markAsRead } = useInboxNotifications();

  if (notifications.length === 0) return null;

  const activeVotes = notifications.filter((n) => n.type === 'voting');
  const pendingMenuProposals = notifications.filter((n) => n.type === 'menu_proposal');
  const pendingInvitations = notifications.filter((n) => n.type === 'group_invitation');

  return (
    <section className="space-y-2.5" aria-label="Live group alerts">
      {activeVotes.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          onClick={() => markAsRead(item.id)}
          className="group flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 shadow-sm transition-all hover:border-amber-500/70 hover:bg-amber-500/15 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
              <Vote className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                <p className="text-sm font-bold text-foreground">{item.title}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-amber-700 sm:self-center">
            Join Vote
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ))}

      {pendingMenuProposals.slice(0, 3).map((item) => (
        <Link
          key={item.id}
          href={item.href}
          onClick={() => markAsRead(item.id)}
          className="group flex flex-col gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 shadow-sm transition-all hover:border-emerald-500/60 hover:bg-emerald-500/15 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-emerald-700 sm:self-center">
            Review Proposal
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ))}

      {pendingInvitations.slice(0, 2).map((item) => (
        <Link
          key={item.id}
          href={item.href}
          onClick={() => markAsRead(item.id)}
          className="group flex flex-col gap-3 rounded-2xl border border-primary/35 bg-primary/10 p-4 shadow-sm transition-all hover:border-primary/60 hover:bg-primary/15 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90 sm:self-center">
            View Invitation
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ))}
    </section>
  );
}
