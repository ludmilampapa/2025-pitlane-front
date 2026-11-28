'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity, ChefHat, Calendar, Search, Filter, History, Plus, Trophy, Pencil, Trash2, X, Vote, Medal, CalendarDays } from 'lucide-react';
import { useUser } from '@/lib/contexts/UserContext';
import { API_BASE_URL } from '@/lib/config/api';
import {
  argentinaDateTimeToISO,
  formatArgentinaDate,
  formatArgentinaHHMM,
  formatArgentinaTime,
  formatArgentinaYMD,
  isValidHHMM,
  isValidYMD,
} from '@/lib/utils/timezone';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RegisterMealModal } from '@/components/modals';
import { useGlobalNotification } from '@/lib/contexts/NotificationContext';
import { useMeals } from '@/lib/contexts/MealsContext';
import { useCalorieProgressContext } from '@/lib/contexts/CalorieProgressContext';
import { MealService, type RegisterMealData } from '@/lib/services/MealService';
import { UserBadges } from '@/components/profile/UserBadges';
import { useUserBadges } from '@/lib/hooks/useUserBadges';
import { PrimaryBadgeDisplay } from '@/components/profile/PrimaryBadgeDisplay';
import { BadgeSelectionModal } from '@/components/profile/BadgeSelectionModal';
import {
  useUserGroupActivity,
  VotingsHistoryTab,
  ChallengesHistoryTab,
  WeeklyMenusHistoryTab,
} from '@/components/history/GroupActivityHistory';

interface Consumption {
  ConsumptionID: number;
  name: string;
  description?: string;
  consumedAt: string;
  profileId?: string;
  totalKcal?: number;
  consumptionMeals?: Array<{
    ConsumptionMealID: number;
    mealId: number;
    quantity: number;
    meal: {
      MealID: number;
      name: string;
      description?: string;
    };
    mealPortion?: {
      MealPortionID: number;
      portionFraction: number;
      foodPortions: Array<{
        FoodPortionID: number;
        foodId: number;
        portionFraction: number;
        quantityConsumed: number;
        food: {
          FoodID: number;
          name: string;
          kCal: number;
        };
      }>;
    };
  }>;
}

function HistorySkeleton() {
  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
          <div className="w-48 h-8 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="w-96 h-4 bg-muted/70 rounded animate-pulse"></div>
      </div>

      {/* Controls skeleton */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 h-10 bg-muted rounded animate-pulse"></div>
          <div className="w-32 h-10 bg-muted rounded animate-pulse"></div>
          <div className="w-24 h-10 bg-muted rounded animate-pulse"></div>
        </div>
      </div>

      {/* History cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 bg-muted rounded animate-pulse"></div>
                <div className="w-20 h-4 bg-muted/70 rounded animate-pulse"></div>
              </div>
              <div className="w-3/4 h-6 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="w-full h-4 bg-muted/70 rounded animate-pulse"></div>
              <div className="w-2/3 h-4 bg-muted/70 rounded animate-pulse"></div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-muted/70 rounded animate-pulse"></div>
                <div className="w-32 h-4 bg-muted/70 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function UserHistoryPage() {
  const router = useRouter();
  const [consumptions, setConsumptions] = useState<Consumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState('history');
  const [isRegisterMealModalOpen, setIsRegisterMealModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [editingConsumption, setEditingConsumption] = useState<Consumption | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', date: '', time: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Context hooks
  const { userData } = useUser();
  const profile = userData.profile;
  const { allMeals, loadingMeals, fetchAllMeals } = useMeals();
  const { showNotification, showSuccess } = useGlobalNotification();
  const { triggerRefresh } = useCalorieProgressContext();
  const { badges, stats, loading: loadingBadges } = useUserBadges(profile?.id);
  const {
    loading: loadingGroupActivity,
    votings,
    challenges,
    menuEntries,
  } = useUserGroupActivity(profile?.id);

  const fetchUserHistory = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/consumptions/user/${profile.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConsumptions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchUserHistory();
  }, [fetchUserHistory]);

  // Fetch meals for the register meal functionality
  useEffect(() => {
    if (profile?.id) {
      fetchAllMeals(profile.id);
    }
  }, [profile?.id, fetchAllMeals]);



  const formatShortDate = (d?: string) =>
    d ? formatArgentinaDate(d, 'en-US', { day: 'numeric', month: 'short' }) : '';

  // Filter and sort consumptions
  const filteredAndSortedConsumptions = consumptions
    .filter((consumption) => 
      consumption.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (consumption.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (consumption.consumptionMeals?.[0]?.meal?.name && consumption.consumptionMeals[0].meal.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const dateA = new Date(a.consumedAt).getTime();
      const dateB = new Date(b.consumedAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  // Group consumptions by date
  const groupedConsumptions = filteredAndSortedConsumptions.reduce((acc, consumption) => {
    const date = new Date(consumption.consumedAt).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(consumption);
    return acc;
  }, {} as Record<string, Consumption[]>);

  if (loading) {
    return <HistorySkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">Error</h1>
        </div>
        <Card>
          <CardContent>
            <p className="text-destructive">{error}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>
              <Button onClick={fetchUserHistory}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openRegisterMealModal = () => {
    setIsRegisterMealModalOpen(true);
  };

  const startEditConsumption = (consumption: Consumption) => {
    const dt = new Date(consumption.consumedAt);
    setEditError(null);
    setEditingConsumption(consumption);
    setEditForm({
      name: consumption.name || '',
      description: consumption.description || '',
      date: formatArgentinaYMD(dt),
      time: formatArgentinaHHMM(dt),
    });
  };

  const handleSaveEditConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConsumption || !profile?.id || savingEdit) return;
    setEditError(null);

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditError('Name is required.');
      return;
    }
    if (!isValidYMD(editForm.date) || !isValidHHMM(editForm.time)) {
      setEditError('Please enter a valid date and time.');
      return;
    }
    const iso = argentinaDateTimeToISO(editForm.date, editForm.time);
    if (new Date(iso).getTime() > Date.now() + 60_000) {
      setEditError('Consumption date cannot be in the future.');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE_URL}/consumptions/${editingConsumption.ConsumptionID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          name: trimmedName,
          description: editForm.description.trim() || null,
          consumedAt: iso,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to update consumption');
      }
      setEditingConsumption(null);
      showSuccess('Meal log updated', 'Your consumption record has been saved.');
      await fetchUserHistory();
      triggerRefresh();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update consumption');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteConsumption = async (consumption: Consumption) => {
    if (!profile?.id || deletingId !== null) return;
    setDeletingId(consumption.ConsumptionID);
    try {
      const res = await fetch(`${API_BASE_URL}/consumptions/${consumption.ConsumptionID}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'Failed to delete consumption');
      }
      showSuccess('Meal log deleted', `"${consumption.name}" was removed from your history.`);
      await fetchUserHistory();
      triggerRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete consumption');
    } finally {
      setDeletingId(null);
    }
  };

  const closeRegisterMealModal = () => {
    setIsRegisterMealModalOpen(false);
  };

  const handleRegisterMeal = async (mealData: { mealId: number; date: string; portions?: { portionFraction: number; foodPortions: Array<{ foodId: number; portionFraction: number; absoluteQuantity?: number; }>; } }) => {
    const meal = allMeals.find(m => m.MealID === mealData.mealId);
    if (!meal) {
      console.error('Meal not found in allMeals array:', mealData.mealId);
      showNotification('error', 'Meal not found', 'Please try refreshing the page.');
      return;
    }

    if (!profile?.id) {
      showNotification('error', 'Profile not found', 'User profile is required to register meals.');
      return;
    }

    const registerMealData: RegisterMealData = {
      mealId: mealData.mealId,
      date: mealData.date,
      portions: mealData.portions
    };

    const result = await MealService.registerIndividualMeal(
      registerMealData,
      profile.id,
      meal.name,
      triggerRefresh // This will trigger calorie progress refresh
    );

    if (result.success) {
      showNotification('success', 'Meal registered successfully', `${meal.name} has been added to your consumption history.`);
      
      // Refresh the history to show the new consumption
      await fetchUserHistory();
      
      closeRegisterMealModal();
    } else {
      showNotification(
        'error',
        'Failed to register meal',
        result.error || 'An unexpected error occurred.'
      );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">My Activity History</h1>
            {profile?.id && (
              <div className="flex items-center gap-2">
                <PrimaryBadgeDisplay 
                  profileId={profile.id} 
                  size="lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBadgeModalOpen(true)}
                  className="border-border text-primary hover:bg-accent dark:border-border dark:text-foreground dark:hover:bg-accent"
                  title="Customize your primary badge"
                >
                  <Trophy className="w-4 h-4" />
                  Customize Badge
                </Button>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Meals consumed, earned badges, group votings, challenges, and weekly menus
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Register Meal Button */}
          <Button 
            onClick={openRegisterMealModal}
            disabled={loadingMeals}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            title={loadingMeals ? "Loading meals..." : "Register a meal"}
          >
            <Plus className="w-4 h-4" />
            Register Meal
            {loadingMeals && <span className="text-xs ml-1">(Loading...)</span>}
          </Button>
        </div>
      </div>

      {/* Tabs for All History Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-5">
          <TabsTrigger value="history" className="flex items-center gap-1.5 py-2">
            <History className="h-4 w-4 shrink-0" />
            <span>Meals</span>
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-1.5 py-2">
            <Trophy className="h-4 w-4 shrink-0" />
            <span>Badges {stats ? `(${stats.earnedBadges}/${stats.totalBadges})` : ''}</span>
          </TabsTrigger>
          <TabsTrigger value="votings" className="flex items-center gap-1.5 py-2">
            <Vote className="h-4 w-4 shrink-0" />
            <span>Votings ({votings.length})</span>
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-1.5 py-2">
            <Medal className="h-4 w-4 shrink-0" />
            <span>Challenges ({challenges.length})</span>
          </TabsTrigger>
          <TabsTrigger value="menus" className="flex items-center gap-1.5 py-2">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>Weekly Menus ({menuEntries.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Consumption History */}
        <TabsContent value="history" className="mt-6">
          {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search meals or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredAndSortedConsumptions.length} of {consumptions.length} meals
              {searchTerm && ` matching "${searchTerm}"`}
            </span>
            {consumptions.length > 0 && (
              <span>
                From {formatShortDate(consumptions[consumptions.length - 1]?.consumedAt)} to {formatShortDate(consumptions[0]?.consumedAt)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Content */}
      {filteredAndSortedConsumptions.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedConsumptions).map(([date, dayConsumptions]) => (
            <Card key={date}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Calendar className="w-5 h-5 mr-2" />
                  {formatArgentinaDate(date, 'en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  <span className="ml-auto text-sm font-normal text-muted-foreground">
                    {dayConsumptions.length} meal{dayConsumptions.length !== 1 ? 's' : ''}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dayConsumptions.map((consumption) => {
                    const consumptionMeal = consumption.consumptionMeals?.[0];
                    const mealPortion = consumptionMeal?.mealPortion;
                    const hasFoodPortions = mealPortion && mealPortion.foodPortions && mealPortion.foodPortions.length > 0;
                    
                    return (
                      <div 
                        key={consumption.ConsumptionID} 
                        className="border-l-4 border-primary pl-4 py-3 bg-muted/30 rounded-r-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <ChefHat className="w-4 h-4 text-primary" />
                              <p className="font-medium">{consumption.name}</p>
                              {mealPortion && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-primary border border-border">
                                  {(mealPortion.portionFraction * 100).toFixed(0)}% of meal
                                </span>
                              )}
                            </div>
                            {consumption.description && (
                              <p className="text-sm text-muted-foreground mt-1 ml-6">
                                {consumption.description}
                              </p>
                            )}
                            {consumptionMeal && consumptionMeal.meal.name !== consumption.name && (
                              <p className="text-sm text-primary mt-1 ml-6">
                                From meal: {consumptionMeal.meal.name}
                              </p>
                            )}
                            {hasFoodPortions && (
                              <div className="mt-2 ml-6 p-2 bg-muted/50 rounded border border-muted">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Food Portions Consumed:</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {mealPortion.foodPortions.map((fp) => (
                                    <div key={fp.FoodPortionID} className="text-xs flex items-center gap-1">
                                      <span className="text-primary font-medium">
                                        {fp.quantityConsumed.toFixed(2)}u
                                      </span>
                                      <span className="text-muted-foreground">{fp.food.name}</span>
                                      <span className="text-muted-foreground/70">
                                        ({(fp.portionFraction * 100).toFixed(0)}%)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {consumption.totalKcal !== undefined && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">
                                {consumption.totalKcal} kcal
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-muted-foreground">
                              <span>
                                {formatArgentinaTime(consumption.consumedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => startEditConsumption(consumption)}
                              disabled={deletingId !== null}
                              aria-label={`Edit ${consumption.name}`}
                              className="h-8 px-2.5 text-xs"
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void handleDeleteConsumption(consumption)}
                              disabled={deletingId !== null}
                              aria-label={`Delete ${consumption.name}`}
                              className="h-8 border-destructive/40 px-2.5 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {deletingId === consumption.ConsumptionID ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'No matching meals found' : 'No individual consumption history'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? `No meals match "${searchTerm}". Try adjusting your search terms.`
                  : 'You haven\'t recorded any individual meal consumption yet. Start by registering some meals!'
                }
              </p>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        {/* Tab: Badges */}
        <TabsContent value="badges" className="space-y-6 mt-6">
          {/* Badge Statistics */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Achievement Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-yellow-500/5 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600">
                      {stats.earnedBadges}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Badges earned
                    </div>
                  </div>
                  <div className="text-center p-4 bg-blue-500/5 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {stats.totalBadges}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Total available
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-500/5 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {stats.completionPercentage}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Completion rate
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{stats.earnedBadges} of {stats.totalBadges} badges</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${stats.completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Badges */}
          <UserBadges
            badges={badges}
            totalBadges={stats?.totalBadges}
            loading={loadingBadges}
          />
        </TabsContent>

        {/* Tab: Votings */}
        <TabsContent value="votings" className="mt-6">
          <VotingsHistoryTab
            votings={votings}
            loading={loadingGroupActivity}
            profileId={profile?.id}
          />
        </TabsContent>

        {/* Tab: Challenges */}
        <TabsContent value="challenges" className="mt-6">
          <ChallengesHistoryTab
            challenges={challenges}
            loading={loadingGroupActivity}
            profileId={profile?.id}
          />
        </TabsContent>

        {/* Tab: Weekly Menus */}
        <TabsContent value="menus" className="mt-6">
          <WeeklyMenusHistoryTab
            menuEntries={menuEntries}
            loading={loadingGroupActivity}
          />
        </TabsContent>
      </Tabs>

      {/* Register Meal Modal */}
      <RegisterMealModal
        isOpen={isRegisterMealModalOpen}
        onClose={closeRegisterMealModal}
        onSubmit={handleRegisterMeal}
      />

      {/* Edit Consumption Modal */}
      {editingConsumption && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setEditingConsumption(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-bold text-foreground">Edit Meal Log</h2>
              <button
                type="button"
                onClick={() => setEditingConsumption(null)}
                aria-label="Close edit modal"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditConsumption} className="space-y-4 p-5">
              {editError && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  {editError}
                </div>
              )}
              <div className="space-y-1.5">
                <label htmlFor="edit-consumption-name" className="text-xs font-medium text-foreground">
                  Name
                </label>
                <input
                  id="edit-consumption-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-consumption-desc" className="text-xs font-medium text-foreground">
                  Description (optional)
                </label>
                <textarea
                  id="edit-consumption-desc"
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="edit-consumption-date" className="text-xs font-medium text-foreground">
                    Date
                  </label>
                  <input
                    id="edit-consumption-date"
                    type="date"
                    value={editForm.date}
                    max={formatArgentinaYMD()}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-consumption-time" className="text-xs font-medium text-foreground">
                    Time
                  </label>
                  <input
                    id="edit-consumption-time"
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, time: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingConsumption(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEdit} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {savingEdit ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Badge Selection Modal */}
      {profile?.id && (
        <BadgeSelectionModal
          profileId={profile.id}
          isOpen={isBadgeModalOpen}
          onClose={() => setIsBadgeModalOpen(false)}
          onSuccess={() => {
            showSuccess(
              'Badge Updated!',
              'Your primary badge has been successfully updated and will now appear on your profile.',
              <Trophy className="w-8 h-8" />
            );
          }}
        />
      )}
    </div>
  );
}