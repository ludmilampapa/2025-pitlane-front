'use client';

import Link from "next/link";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UserSidebar } from "@/components/profile";
import { BadgeSelectionModal } from "@/components/profile/BadgeSelectionModal";
import { ThemeSwitcher } from "@/components/common";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import { usePrimaryBadge } from "@/lib/hooks/usePrimaryBadge";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthButton() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const { profile, loading } = useUserProfile();
  const { primaryBadge, refetch: refetchPrimaryBadge } = usePrimaryBadge(profile?.id);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getClaims();
      setIsAuthenticated(!!data?.claims);
    };

    checkAuth();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
        }
      }
    );


    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Mostrar loading mientras verificamos autenticación
  if (isAuthenticated === null) {
    return <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>;
  }

  return isAuthenticated ? (
    <div className="flex items-center gap-2">
      {loading ? (
        <div className="h-8 w-28 animate-pulse rounded-full bg-muted" />
      ) : (
        <button
          type="button"
          onClick={() => setIsBadgeModalOpen(true)}
          title="Customize your profile badge"
          className="badge-shimmer-btn hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-transform duration-200 hover:scale-[1.03] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:inline-flex"
        >
          {primaryBadge?.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryBadge.iconUrl}
              alt={primaryBadge.name}
              className="h-5 w-5 shrink-0 rounded-full bg-white/95 object-contain p-0.5"
            />
          ) : (
            <Crown className="h-4 w-4 shrink-0" />
          )}
          <span className="max-w-[140px] truncate">
            {profile?.username || profile?.email || 'User'}
          </span>
          {primaryBadge?.name && (
            <>
              <span className="opacity-65">·</span>
              <span className="max-w-[90px] truncate opacity-95">{primaryBadge.name}</span>
            </>
          )}
        </button>
      )}
      <ThemeSwitcher />
      <UserSidebar />

      {profile?.id && (
        <BadgeSelectionModal
          profileId={profile.id}
          isOpen={isBadgeModalOpen}
          onClose={() => setIsBadgeModalOpen(false)}
          onSuccess={() => {
            void refetchPrimaryBadge();
            toast.success('Profile badge updated!');
          }}
        />
      )}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <ThemeSwitcher />
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
