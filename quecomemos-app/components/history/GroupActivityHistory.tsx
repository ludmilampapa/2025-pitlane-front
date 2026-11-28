'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  Crown,
  ExternalLink,
  Flame,
  Medal,
  Sparkles,
  Trophy,
  Users,
  Vote,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/config/api';
import { formatArgentinaDate, formatArgentinaYMD } from '@/lib/utils/timezone';
import type {
  Challenge,
  ChallengeRankingRow,
  WeeklyMenuEntry,
} from '@/lib/types/groupChallenges';

interface DashboardGroup {
  GroupID: number;
  name: string;
}

export interface VotingHistoryItem {
  groupId: number;
  groupName: string;
  sessionId: number;
  createdAt: string;
  completedAt: string | null;
  status: string;
  winnerMeal: {
    mealId?: number;
    name?: string;
    voteCount: number;
    proposedById?: string | null;
    proposedByUsername?: string | null;
  };
  totalVotes: number;
  participantCount: number;
  participantIds?: string[];
  initiatorUsername?: string | null;
}

export interface RankedChallengeMember extends ChallengeRankingRow {
  rank: number;
  tied: boolean;
}

export interface ChallengeHistoryItem {
  groupId: number;
  groupName: string;
  challenge: Challenge;
  ranking: RankedChallengeMember[];
  myRow: RankedChallengeMember | null;
}

export interface WeeklyMenuHistoryItem {
  groupId: number;
  groupName: string;
  entry: WeeklyMenuEntry;
  isCompleted: boolean;
  myAcceptedProposal: boolean;
}

function computeSharedRanking(rows: ChallengeRankingRow[]): RankedChallengeMember[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    if (b.completedDays !== a.completedDays) return b.completedDays - a.completedDays;
    return a.username.localeCompare(b.username);
  });

  const ranks: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      ranks.push(1);
    } else {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const sameScore =
        curr.percentage === prev.percentage && curr.completedDays === prev.completedDays;
      ranks.push(sameScore ? ranks[i - 1] : i + 1);
    }
  }

  return sorted.map((row, i) => ({
    ...row,
    rank: ranks[i],
    tied: ranks.filter((r) => r === ranks[i]).length > 1,
  }));
}

export function useUserGroupActivity(profileId?: string) {
  const [loading, setLoading] = useState(true);
  const [votings, setVotings] = useState<VotingHistoryItem[]>([]);
  const [challenges, setChallenges] = useState<ChallengeHistoryItem[]>([]);
  const [menuEntries, setMenuEntries] = useState<WeeklyMenuHistoryItem[]>([]);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadAll = async () => {
      setLoading(true);
      try {
        const groupsRes = await fetch(`${API_BASE_URL}/groups/dashboard/${profileId}`);
        if (!groupsRes.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const groupsData = await groupsRes.json();
        const groups: DashboardGroup[] = Array.isArray(groupsData)
          ? groupsData
          : Array.isArray(groupsData?.groups)
          ? groupsData.groups
          : [];

        const todayYMD = formatArgentinaYMD();

        const perGroupResults = await Promise.all(
          groups.map(async (g) => {
            const [votingRes, challengesRes, menuRes] = await Promise.all([
              fetch(`${API_BASE_URL}/voting/history/groups/${g.GroupID}?limit=20&offset=0`).catch(
                () => null
              ),
              fetch(`${API_BASE_URL}/groups/${g.GroupID}/challenges`).catch(() => null),
              fetch(`${API_BASE_URL}/groups/${g.GroupID}/menu`).catch(() => null),
            ]);

            const groupVotings: VotingHistoryItem[] = [];
            if (votingRes?.ok) {
              const vJson = await votingRes.json().catch(() => ({}));
              const sessions = Array.isArray(vJson?.sessions) ? vJson.sessions : [];
              for (const s of sessions) {
                groupVotings.push({
                  groupId: g.GroupID,
                  groupName: g.name,
                  ...s,
                });
              }
            }

            const groupChallenges: ChallengeHistoryItem[] = [];
            if (challengesRes?.ok) {
              const cList: Challenge[] = await challengesRes.json().catch(() => []);
              if (Array.isArray(cList)) {
                const withRankings = await Promise.all(
                  cList.map(async (challenge) => {
                    try {
                      const rRes = await fetch(
                        `${API_BASE_URL}/challenges/${challenge.ChallengeID}/ranking/${profileId}`
                      );
                      const rawRanking: ChallengeRankingRow[] = rRes.ok
                        ? await rRes.json().catch(() => [])
                        : [];
                      const ranked = Array.isArray(rawRanking)
                        ? computeSharedRanking(rawRanking)
                        : [];
                      const myRow = ranked.find((r) => r.profileId === profileId) || null;
                      return {
                        groupId: g.GroupID,
                        groupName: g.name,
                        challenge,
                        ranking: ranked,
                        myRow,
                      };
                    } catch {
                      return {
                        groupId: g.GroupID,
                        groupName: g.name,
                        challenge,
                        ranking: [],
                        myRow: null,
                      };
                    }
                  })
                );
                groupChallenges.push(...withRankings);
              }
            }

            const groupMenus: WeeklyMenuHistoryItem[] = [];
            if (menuRes?.ok) {
              const mList: WeeklyMenuEntry[] = await menuRes.json().catch(() => []);
              if (Array.isArray(mList)) {
                for (const entry of mList) {
                  const entryYMD = entry.date ? entry.date.slice(0, 10) : '';
                  const isCompleted = Boolean(entryYMD && entryYMD < todayYMD);
                  const myAcceptedProposal = Boolean(
                    entry.proposals?.some(
                      (p) => p.status === 'accepted' && p.proposedBy?.id === profileId
                    )
                  );
                  groupMenus.push({
                    groupId: g.GroupID,
                    groupName: g.name,
                    entry,
                    isCompleted,
                    myAcceptedProposal,
                  });
                }
              }
            }

            return { groupVotings, groupChallenges, groupMenus };
          })
        );

        if (cancelled) return;

        const allVotings = perGroupResults
          .flatMap((r) => r.groupVotings)
          .sort(
            (a, b) =>
              new Date(b.completedAt || b.createdAt).getTime() -
              new Date(a.completedAt || a.createdAt).getTime()
          );

        const allChallenges = perGroupResults
          .flatMap((r) => r.groupChallenges)
          .sort(
            (a, b) =>
              new Date(b.challenge.endDate).getTime() - new Date(a.challenge.endDate).getTime()
          );

        const allMenus = perGroupResults
          .flatMap((r) => r.groupMenus)
          .sort(
            (a, b) =>
              new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime()
          );

        setVotings(allVotings);
        setChallenges(allChallenges);
        setMenuEntries(allMenus);
      } catch (err) {
        console.error('Error loading group activity history:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return { loading, votings, challenges, menuEntries };
}

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 w-full animate-pulse rounded-2xl border border-border bg-muted/40" />
      ))}
    </div>
  );
}

export function VotingsHistoryTab({
  votings,
  loading,
  profileId,
}: {
  votings: VotingHistoryItem[];
  loading: boolean;
  profileId?: string;
}) {
  if (loading) return <SectionSkeleton />;

  const myWins = votings.filter(
    (v) => profileId && v.winnerMeal?.proposedById === profileId
  ).length;
  const participated = votings.filter(
    (v) => profileId && v.participantIds?.includes(profileId)
  ).length;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{votings.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Completed group votings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{myWins}</div>
            <div className="mt-1 text-xs text-muted-foreground">Times your proposal won</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{participated}</div>
            <div className="mt-1 text-xs text-muted-foreground">Sessions you participated in</div>
          </CardContent>
        </Card>
      </div>

      {votings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Vote className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">No completed votings yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Finish a group voting game in Play or Groups to see winners here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {votings.map((v) => {
            const iWon = Boolean(profileId && v.winnerMeal?.proposedById === profileId);
            const iParticipated = Boolean(profileId && v.participantIds?.includes(profileId));
            return (
              <Card
                key={`${v.groupId}-${v.sessionId}`}
                className={iWon ? 'border-amber-500/40 bg-amber-500/5' : ''}
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {v.groupName}
                      </span>
                      {iWon && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          <Crown className="h-3 w-3" />
                          Your proposal won!
                        </span>
                      )}
                      {!iWon && iParticipated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          <CheckCircle2 className="h-3 w-3" />
                          You participated
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
                      <h3 className="truncate text-base font-bold text-foreground">
                        {v.winnerMeal?.name || 'Winning meal'}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {formatArgentinaDate(v.completedAt || v.createdAt, 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {v.winnerMeal?.proposedByUsername && (
                        <span>
                          Proposed by{' '}
                          <strong className="text-foreground">
                            {iWon ? 'You' : v.winnerMeal.proposedByUsername}
                          </strong>
                        </span>
                      )}
                      <span>
                        {v.winnerMeal?.voteCount || 0} winning votes ({v.totalVotes} total)
                      </span>
                      <span>{v.participantCount} participants</span>
                    </div>
                  </div>

                  <Link
                    href={`/protected/groups/${v.groupId}`}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:self-center"
                  >
                    Open group
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MedalPill({ rank, tied }: { rank: number; tied: boolean }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
        <Trophy className="h-3 w-3" />
        1st Place{tied ? ' (Shared podium)' : ''}
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-400/40 bg-slate-400/15 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
        <Medal className="h-3 w-3" />
        2nd Place{tied ? ' (Shared podium)' : ''}
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/15 px-2.5 py-0.5 text-xs font-bold text-orange-700 dark:text-orange-300">
        <Medal className="h-3 w-3" />
        3rd Place{tied ? ' (Shared podium)' : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
      #{rank}
    </span>
  );
}

export function ChallengesHistoryTab({
  challenges,
  loading,
  profileId,
}: {
  challenges: ChallengeHistoryItem[];
  loading: boolean;
  profileId?: string;
}) {
  if (loading) return <SectionSkeleton />;

  const goldCount = challenges.filter(
    (c) => c.myRow && c.myRow.rank === 1 && c.myRow.completedDays > 0
  ).length;
  const podiumCount = challenges.filter(
    (c) => c.myRow && c.myRow.rank <= 3 && c.myRow.completedDays > 0
  ).length;
  const badgesEarned = challenges.filter((c) => c.myRow?.badgeEarned || c.myRow?.goalReached).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {goldCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">1st place wins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{podiumCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">Top 3 podium finishes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {badgesEarned}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Challenge goals completed</div>
          </CardContent>
        </Card>
      </div>

      {challenges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Medal className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">No group challenges yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Join or create a challenge in any of your groups to track compliance and earn medals.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {challenges.map((item) => {
            const { challenge, myRow, ranking, groupId, groupName } = item;
            const status = myRow?.status || 'active';
            const topPodium = ranking.filter((r) => r.rank <= 3 && r.completedDays > 0);
            const isGold = Boolean(myRow && myRow.rank === 1 && myRow.completedDays > 0);

            return (
              <Card
                key={`${groupId}-${challenge.ChallengeID}`}
                className={isGold ? 'border-amber-500/40 bg-amber-500/5' : ''}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {groupName}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                            status === 'finished'
                              ? 'bg-muted text-muted-foreground'
                              : status === 'upcoming'
                              ? 'bg-secondary/15 text-secondary'
                              : 'bg-primary/15 text-primary'
                          }`}
                        >
                          {status}
                        </span>
                        {myRow && myRow.completedDays > 0 && (
                          <MedalPill rank={myRow.rank} tied={myRow.tied} />
                        )}
                        {(myRow?.badgeEarned || myRow?.goalReached) && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <Award className="h-3 w-3" />
                            Badge earned
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg">{challenge.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {formatArgentinaDate(challenge.startDate, 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        –{' '}
                        {formatArgentinaDate(challenge.endDate, 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        · Goal: {challenge.targetPercentage ?? 100}%
                      </p>
                    </div>

                    <Link
                      href={`/protected/groups/${groupId}/challenges`}
                      className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      View challenge
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {myRow && (
                    <div className="rounded-xl border border-border bg-background/70 p-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">Your progress</span>
                        <span className="font-bold tabular-nums text-primary">
                          {myRow.completedDays} / {myRow.totalDays} days ({myRow.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, myRow.percentage)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {topPodium.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground">Podium:</span>
                      {topPodium.map((member) => {
                        const isMe = member.profileId === profileId;
                        const medalColor =
                          member.rank === 1
                            ? 'text-amber-500'
                            : member.rank === 2
                            ? 'text-slate-400'
                            : 'text-orange-500';
                        return (
                          <span
                            key={member.profileId}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${
                              isMe
                                ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
                                : 'border-border bg-muted/40 text-foreground'
                            }`}
                          >
                            {member.rank === 1 ? (
                              <Trophy className={`h-3 w-3 ${medalColor}`} />
                            ) : (
                              <Medal className={`h-3 w-3 ${medalColor}`} />
                            )}
                            <span>{isMe ? 'You' : member.username}</span>
                            <span className="text-muted-foreground">
                              ({member.completedDays}/{member.totalDays}d · {member.percentage}%)
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const MOMENT_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snack: 'Snack',
  dinner: 'Dinner',
};

export function WeeklyMenusHistoryTab({
  menuEntries,
  loading,
}: {
  menuEntries: WeeklyMenuHistoryItem[];
  loading: boolean;
}) {
  const [filter, setFilter] = useState<'all' | 'completed' | 'upcoming'>('all');

  if (loading) return <SectionSkeleton />;

  const completedCount = menuEntries.filter((m) => m.isCompleted).length;
  const acceptedProposalsCount = menuEntries.filter((m) => m.myAcceptedProposal).length;

  const filtered = menuEntries.filter((m) => {
    if (filter === 'completed') return m.isCompleted;
    if (filter === 'upcoming') return !m.isCompleted;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{completedCount}</div>
            <div className="mt-1 text-xs text-muted-foreground">Completed menu meals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{menuEntries.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Total weekly menu entries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {acceptedProposalsCount}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Your accepted menu proposals</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'completed', 'upcoming'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === key
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">No weekly menu entries</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Planned and completed group weekly menus will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const { entry, groupId, groupName, isCompleted, myAcceptedProposal } = item;
            const mealName = entry.meal?.name || entry.customMeal || 'Planned meal';
            const totalKcal = entry.meal?.mealFoods?.reduce(
              (sum, mf) => sum + (mf.food?.kCal || 0) * mf.quantity,
              0
            );

            return (
              <Card
                key={`${groupId}-${entry.MenuEntryID}`}
                className={myAcceptedProposal ? 'border-emerald-500/40 bg-emerald-500/5' : ''}
              >
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {groupName}
                      </span>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {MOMENT_LABELS[entry.moment] || entry.moment}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isCompleted
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-secondary/15 text-secondary'
                        }`}
                      >
                        {isCompleted ? 'Completed' : 'Upcoming'}
                      </span>
                      {myAcceptedProposal && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          <Sparkles className="h-3 w-3" />
                          Your proposal won!
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <ChefHat className="h-4 w-4 shrink-0 text-primary" />
                      <h3 className="truncate text-base font-bold text-foreground">{mealName}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {formatArgentinaDate(entry.date, 'en-US', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {totalKcal !== undefined && totalKcal > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Flame className="h-3 w-3 text-secondary" />
                          {Math.round(totalKcal)} kcal
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href={`/protected/groups/${groupId}/menu`}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted sm:self-center"
                  >
                    Open menu
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
