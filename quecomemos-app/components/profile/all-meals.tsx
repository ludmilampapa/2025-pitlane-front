'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChefHat, Search, SlidersHorizontal, X } from 'lucide-react';
import { MealModal } from '@/components/modals';
import { EditMealForm } from '@/components/modals';
import { useUser } from '@/lib/contexts/UserContext';
import { useMeals, Meal } from '@/lib/contexts/MealsContext';
import { MealCard } from '@/components/meal';
import { CalorieRangeSlider } from '@/components/common/sliders';

import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';

export function AllMeals() {
    const router = useRouter();
    const { userData } = useUser();
    const {
        meals,
        recommendedMeals,
        loadingMeals,
        loadingRecommended,
        error,
        recommendedError,
        fetchAllMeals,
        fetchRecommendedMeals,
        updateMeal
    } = useMeals();

    const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
    const [isMealModalOpen, setIsMealModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'calories_asc' | 'calories_desc' | 'name_asc'>('newest');
    const [minCalories, setMinCalories] = useState(0);
    const [maxCalories, setMaxCalories] = useState(3000);

    const profile = userData?.profile;
    const userPreferences = userData?.preferences;

    const getMealCalories = (meal: Meal) =>
        meal.mealFoods?.reduce((sum, mf) => sum + (mf.food?.kCal || 0) * mf.quantity, 0) || 0;

    const activeFilterCount =
        (sortBy !== 'newest' ? 1 : 0) + (minCalories > 0 || maxCalories < 3000 ? 1 : 0);

    const filteredCommunityMeals = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return [...meals]
            .filter((meal) => {
                if (q) {
                    const matchesName = meal.name.toLowerCase().includes(q);
                    const matchesDesc = meal.description?.toLowerCase().includes(q);
                    const matchesCreator = meal.profile?.username?.toLowerCase().includes(q);
                    const matchesFood = meal.mealFoods?.some((mf) =>
                        mf.food?.name?.toLowerCase().includes(q)
                    );
                    if (!matchesName && !matchesDesc && !matchesCreator && !matchesFood) {
                        return false;
                    }
                }
                const kcal = getMealCalories(meal);
                if (minCalories > 0 && kcal < minCalories) return false;
                if (maxCalories < 3000 && kcal > maxCalories) return false;
                return true;
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case 'oldest':
                        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    case 'calories_asc':
                        return getMealCalories(a) - getMealCalories(b);
                    case 'calories_desc':
                        return getMealCalories(b) - getMealCalories(a);
                    case 'name_asc':
                        return a.name.localeCompare(b.name);
                    case 'newest':
                    default:
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
            });
    }, [meals, searchQuery, minCalories, maxCalories, sortBy]);

    useEffect(() => {
        if (profile) {
            fetchAllMeals(profile.id);
            if (userPreferences && userPreferences.hasPreferences) {
                fetchRecommendedMeals(profile.id);
            }
        }
    }, [profile, userPreferences, fetchAllMeals, fetchRecommendedMeals]);

    const handleMealClick = (meal: Meal) => {
        setSelectedMeal(meal);
        setIsMealModalOpen(true);
    };

    const closeMealModal = () => {
        setIsMealModalOpen(false);
        setSelectedMeal(null);
    };

    const handleEditMeal = (meal: Meal) => {
        closeMealModal();
        setSelectedMeal(meal);
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedMeal(null);
    };

    const handleEditSuccess = () => {
        closeEditModal();
    };

    const handleMealUpdated = (updatedMealData: Partial<Meal>) => {
        if (selectedMeal) {
            updateMeal(selectedMeal.MealID, updatedMealData);
        }
    };



    if (loadingMeals) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground mb-3">Community Meals</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                            <div className="w-3/4 h-4 bg-muted rounded animate-pulse mb-2"></div>
                            <div className="w-full h-3 bg-muted rounded animate-pulse mb-2"></div>
                            <div className="w-1/2 h-3 bg-muted rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Community Meals</h2>
                <div className="text-destructive bg-card border border-destructive/40 p-4 rounded-xl">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div >
            {/* Recommended Meals Section */}
            {userPreferences && userPreferences.hasPreferences && (
                <div className="space-y-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <h2 className="text-2xl font-bold text-foreground">Recommended for You</h2>
                        <span className="text-sm text-muted-foreground">
                            Based on your preferences
                        </span>
                    </div>

                    {loadingRecommended ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse"></div>
                            ))}
                        </div>
                    ) : recommendedError ? (
                        <div className="rounded-xl border border-destructive/40 bg-card py-8 text-center shadow-sm">
                            <p className="text-sm text-destructive">{recommendedError}</p>
                        </div>
                    ) : recommendedMeals.length === 0 ? (
                        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center shadow-sm">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                                <ChefHat className="h-7 w-7 text-primary" />
                            </div>
                            <p className="text-base font-semibold text-foreground">No recommended meals yet</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Explore meals or update your preferences to get suggestions.
                            </p>
                            <div className="mt-5 flex flex-wrap justify-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/protected/meals')}
                                    className="border-primary bg-card text-primary hover:bg-primary/15 hover:text-foreground"
                                >
                                    Explore meals
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recommendedMeals.slice(0, 6).map((meal) => (
                                <MealCard
                                    key={meal.MealID}
                                    meal={meal}
                                    onClick={handleMealClick}
                                    showExtendedInfo={true}
                                    maxFoodsToShow={3}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Community Meals Section */}
            <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground mb-1">Community Meals</h2>
                    <span className="text-sm text-muted-foreground">
                        {filteredCommunityMeals.length} of {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                    </span>
                </div>

                {/* Single Search Bar + Filters Toggle */}
                <div className="p-4 bg-card rounded-xl border border-border shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search community meals, foods, or creators..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-9 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear search"
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <Button
                            type="button"
                            variant={showFilters || activeFilterCount > 0 ? 'default' : 'outline'}
                            onClick={() => setShowFilters((prev) => !prev)}
                            className={`font-medium px-4 rounded-lg whitespace-nowrap ${showFilters || activeFilterCount > 0
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'border-border bg-background text-foreground hover:bg-muted'
                                }`}
                        >
                            <SlidersHorizontal className="w-4 h-4 mr-2" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs font-bold">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border">
                            <div>
                                <CalorieRangeSlider
                                    minValue={minCalories}
                                    maxValue={maxCalories}
                                    onRangeChange={(min, max) => {
                                        setMinCalories(min);
                                        setMaxCalories(max);
                                    }}
                                />
                            </div>
                            <div className="flex flex-col justify-between gap-3">
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="community-meals-sort"
                                        className="block text-sm font-medium text-foreground"
                                    >
                                        Sort By
                                    </label>
                                    <select
                                        id="community-meals-sort"
                                        value={sortBy}
                                        onChange={(e) =>
                                            setSortBy(
                                                e.target.value as
                                                | 'newest'
                                                | 'oldest'
                                                | 'calories_asc'
                                                | 'calories_desc'
                                                | 'name_asc'
                                            )
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="calories_asc">Lowest Calories</option>
                                        <option value="calories_desc">Highest Calories</option>
                                        <option value="name_asc">Name (A–Z)</option>
                                    </select>
                                </div>

                                {(activeFilterCount > 0 || searchQuery) && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setMinCalories(0);
                                            setMaxCalories(3000);
                                            setSortBy('newest');
                                        }}
                                        className="self-start text-xs"
                                    >
                                        <X className="w-3.5 h-3.5 mr-1" />
                                        Reset filters
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {filteredCommunityMeals.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-xl border-2 border-dashed border-border">
                        <ChefHat className="mx-auto h-12 w-12 text-secondary mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {meals.length === 0 ? 'No meals shared by other users' : 'No matching community meals'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {meals.length === 0
                                ? 'Check back later to discover meals from the community!'
                                : 'Try adjusting your search or filter settings.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredCommunityMeals
                                .slice(0, 18)
                                .map((meal) => (
                                    <MealCard
                                        key={meal.MealID}
                                        meal={meal}
                                        onClick={handleMealClick}
                                        showExtendedInfo={false}
                                        maxFoodsToShow={3}
                                    />
                                ))
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* Meal Details Modal */}
            <MealModal
                meal={selectedMeal}
                isOpen={isMealModalOpen}
                onClose={closeMealModal}
                onEdit={handleEditMeal}
            />



            {/* Edit Meal Modal */}
            {isEditModalOpen && selectedMeal && (
                <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm z-[85]"
                        onClick={closeEditModal}
                    />
                    {/* Content */}
                    <div
                        className="relative z-[86] w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <h3 className="text-foreground font-semibold">Edit Meal</h3>
                            <button
                                onClick={closeEditModal}
                                className="px-2 py-1 text-muted-foreground hover:text-foreground"
                                aria-label="Close modal"
                            >
                                ✖
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 max-h-[80vh] overflow-y-auto">
                            <EditMealForm
                                meal={selectedMeal}
                                onSuccess={handleEditSuccess}
                                onMealUpdated={handleMealUpdated}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}