'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { usePrimaryBadge } from '@/lib/hooks/usePrimaryBadge';

interface PrimaryBadgeDisplayProps {
  profileId: string;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getDefaultBadgeIcon = (badgeType: string): string => {
  const typeIconMap: Record<string, string> = {
    'group_creation': '👥',
    'voting_participation': '🗳️', 
    'voting_winner': '🏆',
    'meal_creation': '👨‍🍳'
  };
  return typeIconMap[badgeType] || '🏅';
};

const sizeConfig = {
  sm: { container: 'w-6 h-6', text: 'text-sm', spacing: 'gap-1' },
  md: { container: 'w-8 h-8', text: 'text-base', spacing: 'gap-2' },
  lg: { container: 'w-10 h-10', text: 'text-lg', spacing: 'gap-2' }
};

export function PrimaryBadgeDisplay({ 
  profileId, 
  showName = false, 
  size = 'md',
  className = '' 
}: PrimaryBadgeDisplayProps) {
  const { primaryBadge, loading } = usePrimaryBadge(profileId);

  if (loading || !primaryBadge) {
    return null;
  }

  const config = sizeConfig[size];
  const hasCustomIcon = primaryBadge.iconUrl && primaryBadge.iconUrl.trim() !== '';

  return (
    <div className={`flex items-center ${config.spacing} ${className}`}>
      <div className={`relative ${config.container}`}>
        {hasCustomIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryBadge.iconUrl!}
            alt={primaryBadge.name}
            className={`${config.container} rounded-full border border-border bg-card object-contain p-0.5`}
          />
        ) : (
          <div
            title={primaryBadge.name}
            className={`flex items-center justify-center ${config.container} ${config.text} bg-muted rounded-full border border-border`}
          >
            {getDefaultBadgeIcon(primaryBadge.badgeType)}
          </div>
        )}
      </div>
      
      {showName && (
        <Badge variant="secondary" className="text-xs border-transparent bg-amber-100 text-[#2B211A] hover:bg-amber-100 dark:bg-amber-200 dark:hover:bg-amber-200">
          {primaryBadge.name}
        </Badge>
      )}
    </div>
  );
}