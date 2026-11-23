'use client';

import { useState } from 'react';
import { Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/lib/contexts/UserContext';
import { usePrimaryBadge } from '@/lib/hooks/usePrimaryBadge';
import { BadgeSelectionModal } from '@/components/profile/BadgeSelectionModal';

export function NavbarBadgeButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { userData } = useUser();
  const profileId = userData.profile?.id;
  const { primaryBadge, refetch } = usePrimaryBadge(profileId);

  if (!profileId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Customize your profile badge"
        className="badge-shimmer-btn inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-transform duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {primaryBadge?.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryBadge.iconUrl}
            alt={primaryBadge.name}
            className="h-5 w-5 shrink-0 rounded-full bg-white/90 object-contain p-0.5"
          />
        ) : (
          <Crown className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="max-w-[130px] truncate">
          {primaryBadge ? primaryBadge.name : 'Customize Badge'}
        </span>
      </button>

      <BadgeSelectionModal
        profileId={profileId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          void refetch();
          toast.success('Profile badge updated!');
        }}
      />
    </>
  );
}
