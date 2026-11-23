'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Activity, Calendar, ChefHat } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface GroupMember {
  profile: {
    id: string;
    username: string;
  };
}

interface Group {
  GroupID: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  _count: {
    members: number;
    consumptions: number;
  };
}

interface GroupCardProps {
  group: Group;
  showActivity?: boolean;
  onRegisterMeal?: (group: Group) => void;
}

export function GroupCard({ group, showActivity = true, onRegisterMeal }: GroupCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/protected/groups/${group.GroupID}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const memberCount = group.members.length;

  return (
    <Card className="flex h-full flex-col border-border bg-card shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex-1 cursor-pointer" onClick={handleClick}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate text-lg font-semibold text-foreground">
              {group.name}
            </CardTitle>
            {showActivity && (
              <Badge
                variant="secondary"
                title="Registered meals"
                className="shrink-0 border-transparent bg-amber-100 text-[#2B211A] hover:bg-amber-100 dark:bg-amber-200 dark:hover:bg-amber-200 dark:text-[#2B211A]"
              >
                <Activity className="mr-1 h-3 w-3" />
                {group._count.consumptions}
              </Badge>
            )}
          </div>
          {group.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{group.description}</p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-secondary" />
              <span>{formatDate(group.updatedAt)}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center -space-x-1">
            {group.members.slice(0, 3).map((member) => (
              <div
                key={member.profile.id}
                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-xs font-semibold text-white"
              >
                {getInitials(member.profile.username || 'Anonymous')}
              </div>
            ))}
            {memberCount > 3 && (
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-semibold text-foreground">
                +{memberCount - 3}
              </div>
            )}
          </div>
        </CardContent>
      </div>

      {onRegisterMeal && (
        <CardContent className="pt-0 pb-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-primary text-primary hover:bg-primary/15 hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onRegisterMeal(group);
            }}
          >
            <ChefHat className="mr-2 h-4 w-4" />
            Register group meal
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default GroupCard;
