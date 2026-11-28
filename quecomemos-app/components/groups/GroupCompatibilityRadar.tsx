'use client';

import { Leaf, ShieldCheck, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Preference {
  PreferenceID: number;
  name: string;
}

interface DietaryRestriction {
  DietaryRestrictionID: number;
  name: string;
}

export interface CompatibilityMember {
  id: string;
  username: string;
  preferences: Preference[];
  dietaryRestrictions: DietaryRestriction[];
}

interface GroupCompatibilityRadarProps {
  members: CompatibilityMember[];
}

export function GroupCompatibilityRadar({ members }: GroupCompatibilityRadarProps) {
  const restrictionNames = Array.from(
    new Set(members.flatMap((member) => member.dietaryRestrictions.map((item) => item.name)))
  );
  const preferenceNames = Array.from(
    new Set(members.flatMap((member) => member.preferences.map((item) => item.name)))
  );
  const restrictionScore = Math.max(0, 100 - restrictionNames.length * 8);
  const preferenceScore =
    members.length === 0
      ? 100
      : Math.round(
          (members.reduce((sum, member) => sum + member.preferences.length, 0) / members.length) * 12
        );
  const compatibility = Math.min(100, Math.round((restrictionScore + preferenceScore) / 2));

  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate">Group Compatibility Radar</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[10px] border-primary/15">
            <div className="absolute inset-0 rounded-full border-[10px] border-primary border-r-secondary/30 border-b-secondary/30" />
            <div className="text-center">
              <strong className="text-2xl font-bold text-foreground">{compatibility}%</strong>
              <p className="text-[11px] text-muted-foreground">compatible</p>
            </div>
          </div>

          <div className="w-full min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Shared preferences
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preferenceNames.length > 0 ? (
                preferenceNames.map((name) => (
                  <Badge
                    key={name}
                    className="border border-primary/30 bg-primary/10 text-xs text-primary hover:bg-primary/10"
                  >
                    <Leaf className="mr-1 h-3 w-3 shrink-0" />
                    {name}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No preferences recorded</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {members.map((member) => (
            <div key={member.id} className="min-w-0 rounded-xl border border-border bg-background p-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{member.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.preferences.length} pref · {member.dietaryRestrictions.length} rest
                  </p>
                </div>
              </div>
              {(member.dietaryRestrictions.length > 0 || member.preferences.length > 0) && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {member.dietaryRestrictions.map((restriction) => (
                    <Badge
                      key={restriction.DietaryRestrictionID}
                      className="border border-secondary/35 bg-secondary/10 text-[11px] text-secondary hover:bg-secondary/10"
                    >
                      {restriction.name}
                    </Badge>
                  ))}
                  {member.preferences.map((preference) => (
                    <Badge
                      key={preference.PreferenceID}
                      className="border border-primary/30 bg-primary/10 text-[11px] text-primary hover:bg-primary/10"
                    >
                      {preference.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
