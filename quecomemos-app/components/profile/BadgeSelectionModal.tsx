'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, X } from 'lucide-react';
import { useUserBadges } from '@/lib/hooks/useUserBadges';
import { usePrimaryBadge } from '@/lib/hooks/usePrimaryBadge';

interface BadgeSelectionModalProps {
  profileId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const getDefaultBadgeIcon = (badgeType: string): string => {
  const typeIconMap: Record<string, string> = {
    group_creation: '👥',
    voting_participation: '🗳️',
    voting_winner: '🏆',
    meal_creation: '👨‍🍳',
    consumption_tracking: '📊',
    social_engagement: '🤝',
  };
  return typeIconMap[badgeType] || '🏅';
};

export function BadgeSelectionModal({
  profileId,
  isOpen,
  onClose,
  onSuccess,
}: BadgeSelectionModalProps) {
  const [mounted, setMounted] = useState(false);
  const { badges, loading: badgesLoading } = useUserBadges(profileId);
  const { primaryBadge, setPrimaryBadge, loading: primaryLoading } = usePrimaryBadge(profileId);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSelectBadge = async (badgeId: number | null) => {
    try {
      const success = await setPrimaryBadge(badgeId);
      if (success) {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Error selecting badge:', error);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Customize Profile Badge"
    >
      <Card
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                Customize Profile Badge
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Choose the badge displayed next to your name across QueComemos.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          {badgesLoading || primaryLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* No Badge Option */}
              <button
                type="button"
                onClick={() => handleSelectBadge(null)}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  !primaryBadge
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xl">
                    🚫
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">No Badge</h3>
                    <p className="text-xs text-muted-foreground">
                      Don&apos;t display any badge next to your name
                    </p>
                  </div>
                </div>

                {!primaryBadge ? (
                  <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                    <Check className="mr-1 h-3 w-3" />
                    Equipped
                  </Badge>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">Select</span>
                )}
              </button>

              {/* Available User Badges */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Your Unlocked Badges ({badges.length})
                </h4>

                {badges.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      You don&apos;t have any badges yet. Create groups, log meals, and participate in
                      voting to unlock badges!
                    </p>
                  </div>
                ) : (
                  badges.map((badge) => {
                    const isSelected = primaryBadge?.BadgeID === badge.BadgeID;
                    const hasCustomIcon = badge.iconUrl && badge.iconUrl.trim() !== '';

                    return (
                      <button
                        key={badge.BadgeID}
                        type="button"
                        onClick={() => handleSelectBadge(badge.BadgeID)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border bg-background hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative h-11 w-11 shrink-0">
                            {hasCustomIcon ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={badge.iconUrl!}
                                alt={badge.name}
                                className="h-11 w-11 rounded-full border border-border bg-card object-contain p-1"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted text-xl">
                                {getDefaultBadgeIcon(badge.badgeType)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-foreground">
                              {badge.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">{badge.description}</p>
                            {badge.earnedAt && (
                              <p className="mt-1 text-[11px] text-muted-foreground/80">
                                Earned {new Date(badge.earnedAt).toLocaleDateString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                              <Check className="mr-1 h-3 w-3" />
                              Equipped
                            </Badge>
                          ) : (
                            <span className="text-xs font-semibold text-primary">Equip</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>,
    document.body
  );
}
