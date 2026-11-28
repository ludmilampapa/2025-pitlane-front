'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut, X, Home, ChefHat, Users, Activity, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/contexts/UserContext';
import { PrimaryBadgeDisplay } from './PrimaryBadgeDisplay';

export function UserSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { userData, loading } = useUser();
  const router = useRouter();
  const profile = userData.profile;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close sidebar on ESC key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);

  if (loading) {
    return <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />;
  }

  if (!profile) {
    return null;
  }

  const drawer = (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-[90] bg-black/50 transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        aria-hidden={!isOpen}
      />

      {/* Solid Sidebar Drawer */}
      <aside
        ref={sidebarRef}
        aria-label="User Menu"
        className={`fixed top-0 right-0 z-[100] flex h-screen w-80 max-w-[85vw] flex-col border-l border-border bg-card text-card-foreground shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h2 className="text-lg font-semibold text-foreground">User Menu</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User Info */}
        <Link
          href="/protected/history"
          onClick={() => setIsOpen(false)}
          className="block border-b border-border bg-muted/50 p-4 transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-primary/15 text-primary">
              <User className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-foreground">
                  {profile.username || 'User'}
                </span>
                <PrimaryBadgeDisplay profileId={profile.id} size="sm" />
              </div>
              <div className="truncate text-xs text-muted-foreground">{profile.email}</div>
              <div className="mt-0.5 text-xs font-medium capitalize text-primary">
                {profile.role}
              </div>
              <div className="mt-1 text-xs font-medium text-muted-foreground">
                View activity history →
              </div>
            </div>
          </div>
        </Link>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-2">
          <Link
            href="/protected"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
          >
            <Home className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">Home</div>
              <div className="text-xs text-muted-foreground">Go to main dashboard</div>
            </div>
          </Link>

          <Link
            href="/protected/meals"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
          >
            <ChefHat className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">Food &amp; Meals</div>
              <div className="text-xs text-muted-foreground">
                Preferences, calorie goal, recipes &amp; foods
              </div>
            </div>
          </Link>

          <Link
            href="/protected/groups"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
          >
            <Users className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">Groups</div>
              <div className="text-xs text-muted-foreground">Manage your meal groups</div>
            </div>
          </Link>

          <Link
            href="/protected/play"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
          >
            <Gamepad2 className="h-5 w-5 text-secondary" />
            <div>
              <div className="text-sm font-medium text-foreground">Play</div>
              <div className="text-xs text-muted-foreground">Swipe, roulette &amp; group voting</div>
            </div>
          </Link>

          <Link
            href="/protected/history"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
          >
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">History</div>
              <div className="text-xs text-muted-foreground">
                Meals, badges, votings, challenges &amp; weekly menus
              </div>
            </div>
          </Link>

          <Link
            href="/protected/settings"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
          >
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">Settings</div>
              <div className="text-xs text-muted-foreground">
                Update your profile and preferences
              </div>
            </div>
          </Link>

          <div className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => {
                setIsOpen(false);
                import('@/lib/supabase/client').then(({ createClient }) => {
                  const supabase = createClient();
                  supabase.auth.signOut().then(() => {
                    if (typeof window !== 'undefined' && window.history) {
                      window.history.replaceState(null, '', '/auth/login');
                    }
                    router.replace('/auth/login');
                  });
                });
              }}
            >
              <LogOut className="h-5 w-5" />
              <div>
                <div className="text-sm font-medium">Sign Out</div>
                <div className="text-xs text-destructive/80">Sign out of your account</div>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative h-9 w-9 rounded-full border border-border bg-primary/15 p-0 text-primary transition-colors hover:bg-primary/25"
        aria-label="Open user menu"
      >
        <User className="h-4 w-4" />
      </Button>

      {mounted && createPortal(drawer, document.body)}
    </>
  );
}
