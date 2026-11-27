'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Target, CalendarDays, Plus, X, HeartHandshake, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AddFoodForm } from '@/components/food/forms/add-food-form';
import { ChallengeCheckInStatus } from '@/components/challenges/ChallengeCheckInStatus';
import { isAutoTrackedChallenge } from '@/lib/utils/challengeRules';
import { GroupChallengesService } from '@/lib/services/GroupChallengesService';
import { API_BASE_URL } from '@/lib/config/api';
import { formatLocalYMD } from '@/lib/hooks/useWeeklyMenu';
import { formatYMDDisplay, isValidYMD } from '@/lib/utils/timezone';
import { useUser } from '@/lib/contexts/UserContext';
import { useCalorieProgressRefresh } from '@/lib/contexts/CalorieProgressContext';
import type { Challenge, ChallengeProgress, ChallengeRankingRow, ChallengeTargetPercentage, GroupData } from '@/lib/types/groupChallenges';

const TARGET_GOAL_OPTIONS: Array<{ value: ChallengeTargetPercentage; label: string; hint: string }> = [
  { value: 50, label: '50%', hint: 'At least half' },
  { value: 75, label: '75%', hint: 'Most of the challenge' },
  { value: 100, label: '100%', hint: 'Full challenge' },
];

function getFallbackStatus(challenge: Challenge, todayYmd: string): 'upcoming' | 'active' | 'finished' {
  const start = challenge.startDate.slice(0, 10);
  const end = challenge.endDate.slice(0, 10);
  if (todayYmd < start) return 'upcoming';
  if (todayYmd > end) return 'finished';
  return 'active';
}

function getOutcomeBadge(outcome: string | undefined, status: 'upcoming' | 'active' | 'finished') {
  if (outcome === 'completed') {
    return { label: 'Completed', className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  }
  if (outcome === 'not_completed') {
    return { label: 'Not completed', className: 'border-border bg-muted text-muted-foreground' };
  }
  if (outcome === 'goal_reached') {
    return { label: 'Goal reached', className: 'border-primary/40 bg-primary/15 text-primary' };
  }
  if (status === 'upcoming' || outcome === 'upcoming') {
    return { label: 'Upcoming', className: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300' };
  }
  return { label: 'In progress', className: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200' };
}

export default function GroupChallengesPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const { userData } = useUser();
  const profileId = userData?.profile?.id;

  const [group, setGroup] = useState<GroupData | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [ranking, setRanking] = useState<Record<number, ChallengeRankingRow[]>>({});
  const [progress, setProgress] = useState<Record<number, ChallengeProgress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    pausedFoods: [] as string[],
    targetPercentage: 75 as ChallengeTargetPercentage,
  });
  const [pausedInput, setPausedInput] = useState('');
  const [catalogFoods, setCatalogFoods] = useState<Array<{ FoodID: number; name: string }>>([]);
  const [showCreateFoodModal, setShowCreateFoodModal] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<number | null>(null);
  const [submittingChallenge, setSubmittingChallenge] = useState(false);
  const [markingChallengeId, setMarkingChallengeId] = useState<number | null>(null);
  const [deletingChallengeId, setDeletingChallengeId] = useState<number | null>(null);

  const isAdmin = Boolean(group && profileId && (
    group.createdBy === profileId ||
    group.members?.some((member) => member.profile.id === profileId && member.role === 'admin')
  ));

  const fetchData = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError(null);
    try {
      const [groupRes, challengesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/groups/${groupId}`),
        fetch(`${API_BASE_URL}/groups/${groupId}/challenges`),
      ]);
      if (!groupRes.ok || !challengesRes.ok) throw new Error('Failed to load challenges');
      const groupData = await groupRes.json();
      const challengeData = await challengesRes.json();
      setGroup(groupData);
      setChallenges(challengeData);

      const todayLocal = formatLocalYMD(new Date());
      for (const challenge of challengeData as Challenge[]) {
        const [progressRes, rankingRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/challenges/${challenge.ChallengeID}/progress/${profileId}?date=${encodeURIComponent(todayLocal)}`,
            { cache: 'no-store' }
          ),
          fetch(`${API_BASE_URL}/challenges/${challenge.ChallengeID}/ranking/${profileId}`, {
            cache: 'no-store',
          }),
        ]);
        if (progressRes.ok) {
          const data = await progressRes.json();
          setProgress((current) => ({ ...current, [challenge.ChallengeID]: data }));
        }
        if (rankingRes.ok) {
          const data = await rankingRes.json();
          setRanking((current) => ({ ...current, [challenge.ChallengeID]: data }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [groupId, profileId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMealRefresh = useCallback(() => {
    void fetchData();
  }, [fetchData]);
  useCalorieProgressRefresh(handleMealRefresh);

  const loadCatalogFoods = useCallback(async (autoSelectNew = false) => {
    try {
      const res = await fetch(`${API_BASE_URL}/foods`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      const mapped = data.map((f: { FoodID: number; name: string }) => ({ FoodID: f.FoodID, name: f.name }));
      setCatalogFoods((prev) => {
        if (autoSelectNew && prev.length > 0) {
          const prevIds = new Set(prev.map((p) => p.FoodID));
          const newest = mapped.filter((m) => !prevIds.has(m.FoodID));
          if (newest.length > 0) {
            setForm((current) => {
              const next = [...current.pausedFoods];
              for (const item of newest) {
                if (!next.some((x) => x.toLowerCase() === item.name.toLowerCase()) && next.length < 20) {
                  next.push(item.name);
                }
              }
              return { ...current, pausedFoods: next };
            });
          }
        }
        return mapped;
      });
    } catch {
      // ignore catalog load failure
    }
  }, []);

  useEffect(() => {
    if (!showForm || catalogFoods.length > 0) return;
    void loadCatalogFoods(false);
  }, [showForm, catalogFoods.length, loadCatalogFoods]);

  const addPausedFood = (raw: string) => {
    const item = raw.trim();
    if (!item || item.length > 60) return;
    setForm((prev) => {
      if (prev.pausedFoods.some((existing) => existing.toLowerCase() === item.toLowerCase())) return prev;
      if (prev.pausedFoods.length >= 20) return prev;
      return { ...prev, pausedFoods: [...prev.pausedFoods, item] };
    });
    setPausedInput('');
  };

  const removePausedFood = (itemToRemove: string) => {
    setForm((prev) => ({
      ...prev,
      pausedFoods: prev.pausedFoods.filter((item) => item !== itemToRemove),
    }));
  };

  const resetChallengeForm = () => {
    setForm({ name: '', description: '', startDate: '', endDate: '', pausedFoods: [], targetPercentage: 75 });
    setPausedInput('');
    setEditingChallengeId(null);
    setShowForm(false);
  };

  const startEditChallenge = (challenge: Challenge) => {
    setError(null);
    setEditingChallengeId(challenge.ChallengeID);
    const currentTarget = challenge.targetPercentage === 50 || challenge.targetPercentage === 75 || challenge.targetPercentage === 100
      ? challenge.targetPercentage
      : 100;
    setForm({
      name: challenge.name,
      description: challenge.description || '',
      startDate: challenge.startDate.slice(0, 10),
      endDate: challenge.endDate.slice(0, 10),
      pausedFoods: challenge.pausedFoods ? [...challenge.pausedFoods] : [],
      targetPercentage: currentTarget,
    });
    setPausedInput('');
    setShowForm(true);
  };

  const handleDeleteChallenge = async (challenge: Challenge) => {
    if (deletingChallengeId !== null) return;
    setError(null);
    setDeletingChallengeId(challenge.ChallengeID);
    try {
      await GroupChallengesService.deleteChallenge(challenge.ChallengeID);
      if (editingChallengeId === challenge.ChallengeID) {
        resetChallengeForm();
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDeletingChallengeId(null);
    }
  };

  const createChallenge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileId) return;
    setError(null);

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Challenge name is required.');
      return;
    }
    if (!isValidYMD(form.startDate) || !isValidYMD(form.endDate)) {
      setError('Please enter valid From and To calendar dates.');
      return;
    }
    if (form.endDate < form.startDate) {
      setError('The To date must be on or after the From date.');
      return;
    }

    if (submittingChallenge) return;
    setSubmittingChallenge(true);
    try {
      if (editingChallengeId !== null) {
        await GroupChallengesService.updateChallenge(editingChallengeId, {
          name: trimmedName,
          description: form.description.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          pausedFoods: form.pausedFoods,
          targetPercentage: form.targetPercentage,
        });
      } else {
        await GroupChallengesService.createChallenge(groupId, {
          name: trimmedName,
          description: form.description.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          pausedFoods: form.pausedFoods,
          targetPercentage: form.targetPercentage,
          profileId,
        });
      }
      resetChallengeForm();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmittingChallenge(false);
    }
  };

  const toggleToday = async (challenge: Challenge) => {
    if (!profileId || progress[challenge.ChallengeID]?.todayCompleted || markingChallengeId !== null) return;
    const today = formatLocalYMD(new Date());
    setMarkingChallengeId(challenge.ChallengeID);
    try {
      await GroupChallengesService.markCompletion(challenge.ChallengeID, profileId, today, true);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setMarkingChallengeId(null);
    }
  };

  if (loading) return <div className="container mx-auto p-6">Loading challenges...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/protected/groups/${groupId}`)} aria-label="Back to group"><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2"><Trophy className="w-7 h-7 text-secondary" /> Group Challenges</h1>
          <p className="text-muted-foreground">Shared goals and daily progress for {group?.name}</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setError(null);
              setEditingChallengeId(null);
              setForm({ name: '', description: '', startDate: '', endDate: '', pausedFoods: [], targetPercentage: 75 });
              setPausedInput('');
              setShowForm(true);
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create challenge
          </Button>
        )}
      </div>

      {error && <Card><CardContent className="p-4 text-destructive">{error}</CardContent></Card>}

      {showForm && isAdmin && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={resetChallengeForm}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold text-foreground">
                {editingChallengeId !== null ? 'Edit challenge' : 'New challenge'}
              </h2>
              <button
                type="button"
                onClick={resetChallengeForm}
                aria-label="Close challenge modal"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={createChallenge} className="grid gap-4 md:grid-cols-2">
                <Input className="md:col-span-2" placeholder="Challenge name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Textarea className="md:col-span-2" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="space-y-1.5">
                <label htmlFor="challenge-start-date" className="text-sm font-medium text-foreground">
                  From
                </label>
                <Input
                  id="challenge-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="challenge-end-date" className="text-sm font-medium text-foreground">
                  To
                </label>
                <Input
                  id="challenge-end-date"
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <span className="text-sm font-medium text-foreground">Completion goal</span>
                <p className="text-xs text-muted-foreground">
                  Minimum percentage of the challenge period required to complete this goal.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TARGET_GOAL_OPTIONS.map((option) => {
                    const selected = form.targetPercentage === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm({ ...form, targetPercentage: option.value })}
                        className={`flex flex-col items-center rounded-xl border px-3 py-2.5 text-center transition-colors ${selected
                            ? 'border-primary bg-primary/10 text-primary shadow-xs'
                            : 'border-border bg-card text-foreground hover:border-primary/40'
                          }`}
                      >
                        <span className="text-base font-bold">{option.label}</span>
                        <span className="text-[11px] text-muted-foreground">{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="md:col-span-2 space-y-2.5 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-2">
                  <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <label htmlFor="challenge-paused-food" className="text-sm font-medium text-foreground">
                      Foods to take a break from (optional)
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Linked to meal logging as a gentle mindful reminder — never blocks or shames members.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    id="challenge-paused-food"
                    placeholder="Filter foods from catalog..."
                    value={pausedInput}
                    onChange={(e) => setPausedInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateFoodModal(true)}
                    className="shrink-0"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Create food
                  </Button>
                </div>

                {form.pausedFoods.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.pausedFoods.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => removePausedFood(item)}
                          className="rounded-full p-0.5 hover:bg-amber-500/20"
                          aria-label={`Remove ${item}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Choose from catalog foods
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {catalogFoods
                      .filter((food) =>
                        !pausedInput.trim() ||
                        food.name.toLowerCase().includes(pausedInput.trim().toLowerCase())
                      )
                      .slice(0, 18)
                      .map((food) => {
                        const isSelected = form.pausedFoods.some(
                          (item) => item.toLowerCase() === food.name.toLowerCase()
                        );
                        return (
                          <button
                            key={food.FoodID}
                            type="button"
                            onClick={() => (isSelected ? removePausedFood(food.name) : addPausedFood(food.name))}
                            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${isSelected
                                ? 'border-amber-500/40 bg-amber-500/15 font-medium text-amber-800 dark:text-amber-200'
                                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                              }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {food.name}
                          </button>
                        );
                      })}
                    <button
                      type="button"
                      onClick={() => setShowCreateFoodModal(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/50 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                    >
                      <Plus className="h-3 w-3" />
                      Create food
                    </button>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetChallengeForm} disabled={submittingChallenge}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingChallenge} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {submittingChallenge
                    ? editingChallengeId !== null ? 'Saving...' : 'Creating...'
                    : editingChallengeId !== null ? 'Save changes' : 'Create'}
                </Button>
              </div>
            </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {challenges.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><Target className="w-10 h-10 mx-auto mb-3" />No challenges yet</CardContent></Card>
      ) : (() => {
        const todayYmd = formatLocalYMD(new Date());
        const renderChallengeCard = (challenge: Challenge) => {
          const userProgress = progress[challenge.ChallengeID];
          const rows = ranking[challenge.ChallengeID] || [];
          const targetPct = userProgress?.targetPercentage ?? challenge.targetPercentage ?? 100;
          const pct = userProgress?.percentage ?? 0;
          const status = userProgress?.status ?? getFallbackStatus(challenge, todayYmd);
          const goalReached = userProgress?.goalReached ?? pct >= targetPct;
          const badge = getOutcomeBadge(userProgress?.outcome, status);

          return (
            <Card key={challenge.ChallengeID} className={status === 'finished' ? 'opacity-90' : ''}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{challenge.name}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Goal: {targetPct}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{pct}%</span>
                    {isAdmin && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEditChallenge(challenge)}
                          disabled={deletingChallengeId !== null}
                          className="h-8 px-2.5 text-xs"
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDeleteChallenge(challenge)}
                          disabled={deletingChallengeId !== null}
                          className="h-8 border-destructive/40 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {deletingChallengeId === challenge.ChallengeID ? 'Deleting...' : 'Delete'}
                        </Button>
                      </>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">{challenge.description || challenge.ruleText}</p>
                {challenge.pausedFoods && challenge.pausedFoods.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                      <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                      Taking a break from:
                    </span>
                    {challenge.pausedFoods.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-800 dark:text-amber-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="w-4 h-4" />
                  <span>
                    {formatYMDDisplay(challenge.startDate.slice(0, 10))} – {formatYMDDisplay(challenge.endDate.slice(0, 10))}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="relative h-3 rounded bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${goalReached ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                    {targetPct < 100 && (
                      <div
                        title={`Target goal: ${targetPct}%`}
                        className="absolute top-0 bottom-0 w-0.5 bg-foreground/60"
                        style={{ left: `${targetPct}%` }}
                      />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {status === 'upcoming' ? (
                      <>Starts on <strong className="text-foreground">{formatYMDDisplay(challenge.startDate.slice(0, 10))}</strong> · Complete {targetPct < 100 ? 'at least ' : ''}<strong className="text-foreground">{targetPct}%</strong> to succeed.</>
                    ) : status === 'finished' ? (
                      goalReached ? (
                        <>Challenge completed! You achieved <strong className="text-foreground">{pct}%</strong> (goal: {targetPct}%).</>
                      ) : (
                        <>Challenge ended at <strong className="text-foreground">{pct}%</strong> (goal was {targetPct}%).</>
                      )
                    ) : goalReached ? (
                      <>Goal reached! <strong className="text-foreground">{pct}%</strong> achieved (target: {targetPct}%).</>
                    ) : (
                      <>Current progress: <strong className="text-foreground">{pct}%</strong> · Goal: {targetPct < 100 ? 'at least ' : ''}<strong className="text-foreground">{targetPct}%</strong> within the challenge dates.</>
                    )}
                  </p>
                </div>

                {status === 'active' ? (
                  <ChallengeCheckInStatus
                    isAutoTracked={isAutoTrackedChallenge(challenge)}
                    todayCompleted={Boolean(userProgress?.todayCompleted)}
                    onCheckIn={() => toggleToday(challenge)}
                    loading={markingChallengeId === challenge.ChallengeID}
                    actionLabel="Log progress today"
                    autoHint="Auto-tracked · Log a meal without paused foods"
                  />
                ) : status === 'upcoming' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    Starts on {formatYMDDisplay(challenge.startDate.slice(0, 10))}
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${badge.className}`}>
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {goalReached ? 'Final result: Completed' : 'Final result: Not completed'}
                  </span>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Group results</h3>
                  <div className="space-y-2">
                    {rows.map((row, index) => {
                      const rowBadge = getOutcomeBadge(row.outcome, status);
                      return (
                        <div key={row.profileId} className="flex items-center justify-between gap-2 border-b pb-2">
                          <span>{index + 1}. {row.username || 'User'}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">{row.percentage}%</span>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${rowBadge.className}`}>
                              {rowBadge.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        };

        const activeOrUpcoming = challenges.filter((c) => (progress[c.ChallengeID]?.status ?? getFallbackStatus(c, todayYmd)) !== 'finished');
        const finishedChallenges = challenges.filter((c) => (progress[c.ChallengeID]?.status ?? getFallbackStatus(c, todayYmd)) === 'finished');

        return (
          <div className="space-y-6">
            {activeOrUpcoming.map(renderChallengeCard)}
            {finishedChallenges.length > 0 && (
              <div className="space-y-4 pt-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Finished challenges
                </h2>
                {finishedChallenges.map(renderChallengeCard)}
              </div>
            )}
          </div>
        );
      })()}

      {showCreateFoodModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowCreateFoodModal(false)}
          >
            <div
              className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowCreateFoodModal(false)}
                aria-label="Close create food modal"
                className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <AddFoodForm
                onSuccess={() => {
                  setShowCreateFoodModal(false);
                  void loadCatalogFoods(true);
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
