'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Target, CalendarDays, Check, Plus, X, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/lib/config/api';
import { formatLocalYMD } from '@/lib/hooks/useWeeklyMenu';
import { formatYMDDisplay, isValidYMD } from '@/lib/utils/timezone';
import { useUser } from '@/lib/contexts/UserContext';
import type { Challenge, ChallengeProgress, ChallengeRankingRow, GroupData } from '@/lib/types/groupChallenges';

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
    ruleText: '',
    startDate: '',
    endDate: '',
    pausedFoods: [] as string[],
  });
  const [pausedInput, setPausedInput] = useState('');
  const [catalogFoods, setCatalogFoods] = useState<Array<{ FoodID: number; name: string }>>([]);

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

  useEffect(() => {
    if (!showForm || catalogFoods.length > 0) return;
    fetch(`${API_BASE_URL}/foods`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setCatalogFoods(data.slice(0, 24).map((f: { FoodID: number; name: string }) => ({ FoodID: f.FoodID, name: f.name })));
        }
      })
      .catch(() => {});
  }, [showForm, catalogFoods.length]);

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

  const createChallenge = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileId) return;
    setError(null);

    const trimmedName = form.name.trim();
    const trimmedRule = form.ruleText.trim();
    if (!trimmedName || !trimmedRule) {
      setError('Challenge name and rule are required.');
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

    try {
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          name: trimmedName,
          ruleText: trimmedRule,
          description: form.description.trim(),
          profileId,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to create challenge');
      setForm({ name: '', description: '', ruleText: '', startDate: '', endDate: '', pausedFoods: [] });
      setPausedInput('');
      setShowForm(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const toggleToday = async (challenge: Challenge) => {
    if (!profileId || progress[challenge.ChallengeID]?.todayCompleted) return;
    const today = formatLocalYMD(new Date());
    // The server stores a date-specific completion; this simple toggle is a daily action.
    try {
      const response = await fetch(`${API_BASE_URL}/challenges/${challenge.ChallengeID}/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, date: today, completed: true }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to mark completion');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (loading) return <div className="container mx-auto p-6">Loading challenges...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2"><Trophy className="w-7 h-7 text-secondary" /> Group Challenges</h1>
          <p className="text-muted-foreground">Shared goals and daily progress for {group?.name}</p>
        </div>
        {isAdmin && <Button onClick={() => setShowForm((value) => !value)} className="bg-primary text-primary-foreground hover:bg-primary/90">Create challenge</Button>}
      </div>

      {error && <Card><CardContent className="p-4 text-destructive">{error}</CardContent></Card>}

      {showForm && isAdmin && (
        <Card>
          <CardHeader><CardTitle>New challenge</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createChallenge} className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Challenge name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input placeholder="Rule, example: no soft drinks" value={form.ruleText} onChange={(e) => setForm({ ...form, ruleText: e.target.value })} required />
              <Textarea className="md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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
                    placeholder="Type a food or keyword (e.g. Soda, Fried, Candy)..."
                    value={pausedInput}
                    onChange={(e) => setPausedInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPausedFood(pausedInput);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addPausedFood(pausedInput)}
                    disabled={!pausedInput.trim()}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add
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

                {catalogFoods.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Quick-pick from foods
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {catalogFoods.slice(0, 12).map((food) => {
                        const isSelected = form.pausedFoods.some(
                          (item) => item.toLowerCase() === food.name.toLowerCase()
                        );
                        return (
                          <button
                            key={food.FoodID}
                            type="button"
                            onClick={() => (isSelected ? removePausedFood(food.name) : addPausedFood(food.name))}
                            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                              isSelected
                                ? 'border-amber-500/40 bg-amber-500/15 font-medium text-amber-800 dark:text-amber-200'
                                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {food.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="md:col-span-2 flex justify-end"><Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Create</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {challenges.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><Target className="w-10 h-10 mx-auto mb-3" />No challenges yet</CardContent></Card>
      ) : challenges.map((challenge) => {
        const userProgress = progress[challenge.ChallengeID];
        const rows = ranking[challenge.ChallengeID] || [];
        return (
          <Card key={challenge.ChallengeID}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between"><span>{challenge.name}</span><span className="text-sm text-primary">{userProgress?.percentage || 0}%</span></CardTitle>
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
              <div className="flex items-center gap-2 text-sm"><CalendarDays className="w-4 h-4" /> {formatYMDDisplay(challenge.startDate.slice(0, 10))} – {formatYMDDisplay(challenge.endDate.slice(0, 10))}</div>
              <div className="h-3 bg-[#EFE7DB] rounded overflow-hidden"><div className="h-full bg-primary" style={{ width: `${userProgress?.percentage || 0}%` }} /></div>
              <p className="text-sm">You completed <strong>{userProgress?.completedDays || 0}</strong> of <strong>{userProgress?.totalDays || 0}</strong> days.</p>
              {userProgress?.todayCompleted ? (
                <Button disabled className="bg-primary/15 text-primary hover:bg-primary/15">
                  <Check className="w-4 h-4 mr-2" />
                  Completed today
                </Button>
              ) : (
                <Button onClick={() => toggleToday(challenge)} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  <Check className="w-4 h-4 mr-2" />
                  Mark today
                </Button>
              )}

              <div>
                <h3 className="font-semibold mb-2">Ranking</h3>
                <div className="space-y-2">
                  {rows.map((row, index) => (
                    <div key={row.profileId} className="flex items-center justify-between border-b pb-2">
                      <span>{index + 1}. {row.username || 'User'}</span>
                      <span className="text-sm text-primary">{row.completedDays}/{row.totalDays} ({row.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
