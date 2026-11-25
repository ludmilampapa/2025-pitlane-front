'use client';
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/config/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/contexts/UserContext";
import { useMealNameSuggestion } from "./hooks/useMealNameSuggestion";
import { useGlobalNotification } from "@/lib/contexts/NotificationContext";
import { AddMealFormProps, FoodItem } from "./types";
import { COMMON_STYLES } from "./constants";
import { processDietaryRestrictions } from "./utils";
import { violatesRestrictionByName, type RestrictionItem } from "@/lib/utils/dietaryCompatibility";
import { useFoodsList } from "./hooks/useFoodsList";
import { useFormSubmission, useDietaryRestrictions } from "./hooks/useFormHelpers";
import FoodsList from "./FoodsList";
import MealExtras from "./MealExtras";
import FoodModal from "./FoodModal";
import { Hexagon, Loader2 } from "lucide-react";

interface KorvenProduct {
  name: string;
  type?: 'meal' | 'food';
  category?: string;
  area?: string;
  thumb?: string;
  ingredients?: string[];
}

type Props = AddMealFormProps & { onClose?: () => void };

export default function AddMealForm({ onFoodAdded, onClose, initialMealName }: Props) {
  const { userData } = useUser();
  const { showSuccess, showError } = useGlobalNotification();
  
  // Basic meal info
  const [mealName, setMealName] = useState(initialMealName || "");
  const [description, setDescription] = useState("");
  const [isMealKorvenInspired, setIsMealKorvenInspired] = useState(false);
  
  // Korven API states for meal names
  const [korvenMealProducts, setKorvenMealProducts] = useState<KorvenProduct[]>([]);
  const [isLoadingKorvenMeals, setIsLoadingKorvenMeals] = useState(false);
  const [showKorvenMealOptions, setShowKorvenMealOptions] = useState(false);
  const [selectedKorvenMealProduct, setSelectedKorvenMealProduct] = useState<string | null>(null);
  const [isImportingIngredients, setIsImportingIngredients] = useState(false);
  
  // Foods management with custom hook
  const { foods, addFood, updateFood, removeFood, totalKcal, clearFoods } = useFoodsList();
  
  // Form submission state
  const { isSubmitting, withSubmission } = useFormSubmission();

  // Meal preferences and restrictions
  const [showMealExtras] = useState(false);
  const [mealPreferences, setMealPreferences] = useState<number[]>([]);
  const {
    restrictions: mealRestrictions,
    setRestrictions: setMealRestrictions,
    hasRestrictions: mealHasRestrictions,
    setHasRestrictions: setMealHasRestrictions
  } = useDietaryRestrictions();

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<'search' | 'create' | 'edit'>('search');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [initialFoodName, setInitialFoodName] = useState<string>("");

  const suggestedMealName = useMealNameSuggestion(foods);

  // Function to check if a name contains connectors (for meal names)
  const hasConnectors = (name: string): boolean => {
    const connectors = ['con', 'y', 'de', 'al', 'en', 'para', 'sin', 'a', 'el', 'la', 'los', 'las'];
    const words = name.toLowerCase().split(/\s+/);
    return words.some(word => connectors.includes(word));
  };

  const fetchKorvenMealProducts = async () => {
    setIsLoadingKorvenMeals(true);
    try {
      const response = await fetch('/api/korven-products', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        const products = await response.json() as KorvenProduct[];
        const filtered = products.filter(product =>
          product.type ? product.type === 'meal' : hasConnectors(product.name)
        );
        setKorvenMealProducts(filtered);
      } else {
        console.error('TheMealDB API proxy returned status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching suggested meals:', error);
    } finally {
      setIsLoadingKorvenMeals(false);
    }
  };

  const handleSelectSuggestedMeal = async (product: KorvenProduct) => {
    setMealName(product.name);
    setSelectedKorvenMealProduct(product.name);
    setIsMealKorvenInspired(true);

    if (!description.trim() && (product.category || product.area)) {
      setDescription([product.category, product.area].filter(Boolean).join(' · '));
    }

    const ingredientNames =
      product.ingredients && product.ingredients.length > 0
        ? product.ingredients
        : [product.name];

    setIsImportingIngredients(true);
    try {
      clearFoods();

      // Load real DietaryRestriction rows from PostgreSQL so each TheMealDB ingredient
      // is linked to the exact restrictions it genuinely satisfies.
      let dbRestrictions: RestrictionItem[] = [];
      try {
        const restRes = await fetch(`${API_BASE_URL}/dietary-restrictions`);
        if (restRes.ok) {
          const raw = (await restRes.json()) as RestrictionItem[];
          dbRestrictions = raw.filter(
            (r) => r.DietaryRestrictionID !== 0 && !r.name.toLowerCase().includes('everyone')
          );
        }
      } catch {
        // Fallback to runtime allergen guard if catalog fetch fails
      }

      const resolved = await Promise.all(
        ingredientNames.map(async (ingName) => {
          let kcal = 120;
          try {
            const res = await fetch(`/api/nutrition-lookup?q=${encodeURIComponent(ingName)}`);
            if (res.ok) {
              const data = (await res.json()) as { kcal?: number | null };
              if (typeof data.kcal === 'number' && data.kcal > 0) {
                kcal = data.kcal;
              }
            }
          } catch {
            // Keep default 120 kcal fallback
          }

          // Check which DB dietary restrictions this ingredient satisfies vs violates
          const contextText = `${ingName} ${product.category || ''}`;
          const violatedAny = dbRestrictions.some((r) =>
            violatesRestrictionByName(contextText, r.name)
          );
          const compatibleIds = dbRestrictions
            .filter((r) => !violatesRestrictionByName(contextText, r.name))
            .map((r) => r.DietaryRestrictionID);

          // Note: in FoodItem / processDietaryRestrictions:
          // - hasNoRestrictions === true  -> "For Everyone" ([0]) when it violates 0 restrictions
          // - hasNoRestrictions === false -> specific compatible restriction IDs in DB
          return {
            name: ingName,
            kCal: kcal,
            kcalPerUnit: kcal,
            quantity: 1,
            svgLink: `https://www.themealdb.com/images/ingredients/${encodeURIComponent(ingName)}-small.png`,
            preferences: [],
            dietaryRestrictions: violatedAny ? compatibleIds : [],
            hasNoRestrictions: !violatedAny,
          };
        })
      );

      for (const foodItem of resolved) {
        addFood(foodItem);
      }
    } finally {
      setIsImportingIngredients(false);
    }
  };

  useEffect(() => {
    fetchKorvenMealProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddFoodModal = (index: number | null = null) => {
    setEditingIndex(index);
  
    if (index !== null) {
      // Editing existing food - determine if it's a temporary food or an existing one
      const item = foods[index];
      if (item.id) {
        // Existing food with ID - only allow quantity editing
        setModalMode('edit');
      } else {
        // Temporary food without ID - allow full editing in create mode
        setModalMode('create');
      }
      setOpenModal(true);
    } else {
      // Adding new food - open search modal directly
      setModalMode('search');
      setOpenModal(true);
    }
  };


  

  
  const closeModal = () => {
    setOpenModal(false);
    setEditingIndex(null);
    setInitialFoodName(""); // Clear initial name when closing
  };

  const handleSwitchToCreate = (initialName?: string) => {
    // Switch from search mode to create mode
    setModalMode('create');
    // Store the initial name to pass to the modal
    setInitialFoodName(initialName || "");
    // Modal stays open, just switches mode - the modal will handle initialName internally
  };

  const handleConfirmFood = (payload: FoodItem) => {
    if (editingIndex !== null) {
      // Editing existing food
      updateFood(editingIndex, payload);
      return;
    }
    
    // Adding new food
    addFood(payload);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName || foods.length === 0) {
      showError(
        "Incomplete Meal Information",
        "Please provide a meal name and add at least one food item."
      );
      return;
    }

    if (!userData?.profile?.id) {
      showError(
        "Authentication Required",
        "You must be logged in to create meals."
      );
      return;
    }

    await withSubmission(async () => {
      // First, fetch existing foods ONCE if any new foods need name lookup
      const needsLookup = foods.some((f) => !f.id);
      const existingByName = new Map<string, number>();
      if (needsLookup) {
        const existingFoodsResponse = await fetch(`${API_BASE_URL}/foods`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!existingFoodsResponse.ok) {
          throw new Error('Failed to check existing foods');
        }
        const existingFoods = (await existingFoodsResponse.json()) as Array<{ name: string; FoodID: number }>;
        for (const f of existingFoods) {
          existingByName.set(f.name.toLowerCase(), f.FoodID);
        }
      }

      const mealFoods: { foodId: number; quantity: number }[] = [];

      for (const food of foods) {
        let foodId: number;

        if (food.id) {
          foodId = food.id;
        } else {
          const existingId = existingByName.get(food.name.toLowerCase());
          if (existingId) {
            foodId = existingId;
          } else {
            const processed = processDietaryRestrictions(food.hasNoRestrictions ?? null, food.dietaryRestrictions || []);
            const foodResponse = await fetch(`${API_BASE_URL}/foods`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: food.name,
                kCal: food.kcalPerUnit || (food.kCal / food.quantity),
                svgLink: food.svgLink || "",
                preferences: food.preferences || [],
                dietaryRestrictions: processed.dietaryRestrictions,
                hasNoRestrictions: processed.hasNoRestrictions,
                profileId: userData.profile!.id,
              }),
            });

            if (!foodResponse.ok) {
              const errorData = await foodResponse.json().catch(() => ({}));
              throw new Error(`Failed to create food: ${food.name} - ${errorData.error || 'Unknown error'}`);
            }

            const createdFood = await foodResponse.json();
            foodId = createdFood.FoodID;
            existingByName.set(food.name.toLowerCase(), foodId);
          }
        }

        mealFoods.push({
          foodId: foodId,
          quantity: food.quantity,
        });
      }

      console.log('=== FRONTEND MEAL CREATION DEBUG ===');
      console.log('Sending meal with mealFoods:', mealFoods);

      // Now create the meal with the food IDs and quantities
      const mealResponse = await fetch(`${API_BASE_URL}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mealName,
          description,
          profileId: userData.profile!.id,
          mealFoods: mealFoods,
        }),
      });

      if (!mealResponse.ok) {
        const errorData = await mealResponse.json().catch(() => ({}));
        throw new Error(`Failed to create meal: ${errorData.error || 'Unknown error'}`);
      }

      const createdMeal = await mealResponse.json();

      showSuccess(
        "Meal Created Successfully!",
        `"${mealName}" has been saved with ${foods.length} food${foods.length !== 1 ? 's' : ''}.`
      );
      if (onFoodAdded) onFoodAdded(createdMeal);
      if (onClose) onClose();

      // Reset form
      setMealName(""); 
      setDescription(""); 
      clearFoods();
    });
  };

  return (
    <Card className={`${COMMON_STYLES.CARD_BASE} p-6`}>
      <div className="flex items-center justify-between mb-2">
        <div />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`${COMMON_STYLES.TEXT_AMBER_MUTED} hover:text-foreground text-sm underline transition-colors`}
          >
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* TheMealDB Meal Name Inspiration */}
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Hexagon className="w-5 h-5 text-primary fill-primary/15" />
              <span className="text-foreground text-sm font-semibold">
                TheMealDB Suggestions
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !showKorvenMealOptions;
                setShowKorvenMealOptions(next);
                if (next && korvenMealProducts.length === 0 && !isLoadingKorvenMeals) {
                  fetchKorvenMealProducts();
                }
              }}
              className="text-xs text-primary hover:text-foreground underline"
            >
              {showKorvenMealOptions ? 'Hide' : 'Show'} options
            </button>
          </div>
          
          {showKorvenMealOptions && (
            <div className="space-y-2">
              {isLoadingKorvenMeals ? (
                <div className="flex items-center justify-center gap-2 text-primary py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading suggestions...</span>
                </div>
              ) : korvenMealProducts.length > 0 ? (
                <div className="max-h-56 overflow-y-auto space-y-1.5">
                  {korvenMealProducts.map((product, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => void handleSelectSuggestedMeal(product)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-sm transition-colors flex items-center gap-3 ${
                        selectedKorvenMealProduct === product.name
                          ? 'bg-primary text-primary-foreground border border-border'
                          : 'bg-card text-foreground hover:bg-accent border border-border'
                      }`}
                    >
                      {product.thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.thumb}
                          alt={product.name}
                          loading="lazy"
                          className="w-10 h-10 rounded-md object-cover shrink-0 bg-muted"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{product.name}</div>
                        {(product.category || product.area) && (
                          <div className={`text-xs truncate ${
                            selectedKorvenMealProduct === product.name
                              ? 'text-primary-foreground/80'
                              : 'text-muted-foreground'
                          }`}>
                            {[product.category, product.area].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-3">
                  No suggested meals available.
                </p>
              )}
              {isImportingIngredients && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-xs text-primary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Importing ingredients &amp; calories from TheMealDB + Open Food Facts...
                </div>
              )}
              {selectedKorvenMealProduct && !isImportingIngredients && (
                <div className="text-xs text-primary bg-card border border-border rounded p-2 flex items-center gap-2">
                  <Hexagon className="w-3 h-3 fill-primary/15" />
                  <span>
                    Selected suggestion: <strong>{selectedKorvenMealProduct}</strong> — ingredients auto-filled below!
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* nombre + sugerencia */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-foreground text-sm">Meal Name</label>
            {isMealKorvenInspired && (
              <span className="text-xs bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Hexagon className="w-3 h-3 fill-primary/20" />
                TheMealDB
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="Meal Name"
            value={mealName}
            onChange={(e) => {
              setMealName(e.target.value);
              // Clear Korven inspired flag if user manually changes the name
              if (selectedKorvenMealProduct && e.target.value !== selectedKorvenMealProduct) {
                setIsMealKorvenInspired(false);
                setSelectedKorvenMealProduct(null);
              }
            }}
            className={COMMON_STYLES.INPUT_CLASS}
          />
          {!mealName && suggestedMealName && (
            <div className={`mt-1 text-sm ${COMMON_STYLES.TEXT_AMBER_MUTED} flex items-center gap-2`}>
              <span className="opacity-80">Suggestion:</span>
              <span className="px-2 py-0.5 rounded bg-card border border-border text-foreground">
                {suggestedMealName}
              </span>
              <button
                type="button"
                onClick={() => setMealName(suggestedMealName)}
                className={`text-xs px-2 py-0.5 rounded ${COMMON_STYLES.BUTTON_PRIMARY}`}
              >
                Use
              </button>
            </div>
          )}
        </div>

        {showMealExtras && (
          <MealExtras
            inputClass={COMMON_STYLES.INPUT_CLASS}
            description={description}
            setDescription={setDescription}
            mealPreferences={mealPreferences}
            setMealPreferences={setMealPreferences}
            mealHasRestrictions={mealHasRestrictions || false}
            setMealHasRestrictions={(value: boolean) => setMealHasRestrictions(value)}
            mealRestrictions={mealRestrictions}
            setMealRestrictions={setMealRestrictions}
            MealIconSlot={<div></div>}
          />
        )}

        {/* Foods */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className={`${COMMON_STYLES.TEXT_AMBER_PRIMARY} font-semibold`}>
              Foods ({foods.length})
            </h3>
            <Button
              type="button"
              onClick={() => openAddFoodModal(null)}
              className={COMMON_STYLES.BUTTON_PRIMARY}
            >
              + Add food
            </Button>
          </div>

          <FoodsList
            foods={foods}
            onEdit={(i) => openAddFoodModal(i)}
            onRemove={removeFood}
          />
        </div>

        {/* total + guardar */}
        <div className="flex items-center justify-between bg-primary p-3 rounded-lg text-foreground font-semibold">
          <span>Total kcal</span><span>{totalKcal}</span>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || foods.length === 0 || !mealName}
          className={`w-full ${COMMON_STYLES.CARD_BASE} border border-border disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-opacity`}
        >
          {isSubmitting ? "Saving..." : "Save Meal"}
        </button>
      </form>

      {/* Food Modal */}
      <FoodModal
        apiBase={API_BASE_URL}
        open={openModal}
        onClose={closeModal}
        mode={modalMode}
        initialName={initialFoodName}
        editingItem={editingIndex !== null ? foods[editingIndex] : null}
        onConfirm={handleConfirmFood}
        onSwitchToCreate={modalMode === 'search' ? handleSwitchToCreate : undefined}
        forMeal={false}
      />
    </Card>
  );
}