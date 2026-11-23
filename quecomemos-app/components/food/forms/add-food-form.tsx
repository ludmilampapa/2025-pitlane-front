"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CustomCheckbox } from "@/components/forms";
import { DropdownWrapper } from "@/components/forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconSelect } from "@/components/forms";
import { API_BASE_URL } from "@/lib/config/api";
import { useState } from "react";
import { useFoods } from "@/lib/contexts/FoodsContext";
import { useGlobalNotification } from "@/lib/contexts/NotificationContext";
import { useUser } from "@/lib/contexts/UserContext";
import { Plus, Hexagon, Loader2 } from "lucide-react";
import { useKorvenCheck } from "@/components/meal/hooks/useKorvenCheck";

interface AddFoodFormProps {
  onSuccess?: () => void
  className?: string;
}

export function AddFoodForm({ className, onSuccess, ...props }: AddFoodFormProps & React.ComponentPropsWithoutRef<"div">) {
  const { addFood } = useFoods();
  const { showSuccess, showError } = useGlobalNotification();
  const { userData } = useUser();
  const [foodName, setFoodName] = useState("");
  const [kCal, setKCal] = useState<number>(0);
  const [preferences, setPreferences] = useState<number[]>([]);
  const [restrictions, setRestrictions] = useState<number[]>([]);
  const [icon, setIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRestrictions, setHasRestrictions] = useState<boolean | null>(null);

  // Korven inspiration state
  const { korvenProducts, isLoadingKorven } = useKorvenCheck();
  const [showKorvenOptions, setShowKorvenOptions] = useState(false);
  const [selectedKorvenProduct, setSelectedKorvenProduct] = useState<string | null>(null);
  const [isKorvenInspired, setIsKorvenInspired] = useState(false);
  const [isLookingUpKcal, setIsLookingUpKcal] = useState(false);
  const [kcalHint, setKcalHint] = useState<string | null>(null);

  const lookupCalories = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsLookingUpKcal(true);
    setKcalHint(null);
    try {
      const res = await fetch(`/api/nutrition-lookup?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) return;
      const data = (await res.json()) as { kcal: number | null; productName?: string; source?: string };
      if (typeof data.kcal === 'number' && data.kcal > 0) {
        setKCal(data.kcal);
        setKcalHint(`Auto-filled from ${data.source || 'Open Food Facts'} (${data.kcal} kcal / 100g)`);
      } else {
        setKcalHint('No calorie data found — enter kcal manually.');
      }
    } catch {
      setKcalHint('Could not reach Open Food Facts.');
    } finally {
      setIsLookingUpKcal(false);
    }
  };

  // Filter products without connectors for foods
  const hasConnectors = (name: string) => {
    const connectors = ['con', 'y', 'de', 'al', 'en', 'para', 'sin', 'a', 'el', 'la', 'los', 'las'];
    const words = name.toLowerCase().split(' ');
    return words.some(word => connectors.includes(word));
  };

  const filteredKorvenProducts = (korvenProducts || []).filter(product =>
    product.type ? product.type === 'food' : !hasConnectors(product.name)
  );

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate that user is logged in and has a profile
      if (!userData?.profile?.id) {
        throw new Error('You must be logged in to add foods');
      }

      // Determine if this food has no restrictions (should get "For Everyone")
      const hasNoRestrictions = hasRestrictions === false;
      
      const response = await fetch(`${API_BASE_URL}/foods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: foodName,
          kCal: kCal,
          svgLink: icon ?? "",
          preferences,
          dietaryRestrictions: hasNoRestrictions ? [] : restrictions,
          hasNoRestrictions: hasNoRestrictions,
          profileId: userData.profile.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add food");
      }

      const newFood = await response.json();
      
      // Agregar la comida al contexto inmediatamente
      addFood(newFood);
      
      // Limpiar el formulario
      setFoodName("");
      setKCal(0);
      setPreferences([]);
      setRestrictions([]);
      setIcon(null);
      setHasRestrictions(null);
      setSelectedKorvenProduct(null);
      setIsKorvenInspired(false);
      setShowKorvenOptions(false);

      console.log('About to show success notification for:', foodName);
      showSuccess(
        "Food Added Successfully!",
        `"${foodName}" has been added to your food list with all selected preferences and restrictions.`,
        <Plus className="w-8 h-8" />
      );
      console.log('Success notification called');

      // Delay onSuccess to allow notification to show
      if (onSuccess) {
        setTimeout(() => {
          console.log('Calling onSuccess after delay');
          onSuccess();
        }, 1000);
      }
    } catch (err: unknown) {
      showError(
        "Failed to Add Food",
        err instanceof Error ? err.message : "An unexpected error occurred while adding the food item."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("max-w-md mx-auto", className)} {...props}>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Add Food</CardTitle>
          <CardDescription className="text-muted-foreground">Add a new food item to the list</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddFood}>
            <div className="grid gap-4">
              {/* Korven Inspiration Section */}
              <div className="bg-gradient-to-r from-card to-yellow-900/30 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Hexagon className="w-5 h-5 text-primary fill-amber-400/20" />
                    <Label className="text-foreground text-sm font-semibold">
                      TheMealDB Suggestions
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKorvenOptions(!showKorvenOptions)}
                    className="text-xs text-primary hover:text-foreground underline"
                  >
                    {showKorvenOptions ? 'Hide' : 'Show'} options
                  </button>
                </div>

                {showKorvenOptions && (
                  <div className="space-y-2">
                    {isLoadingKorven ? (
                      <div className="flex items-center justify-center gap-2 text-primary py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading suggestions...</span>
                      </div>
                    ) : filteredKorvenProducts.length > 0 ? (
                      <div className="max-h-52 overflow-y-auto space-y-1.5">
                        {filteredKorvenProducts.map((product, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setFoodName(product.name);
                              setSelectedKorvenProduct(product.name);
                              setIsKorvenInspired(true);
                              void lookupCalories(product.name);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2.5 ${
                              selectedKorvenProduct === product.name
                                ? 'bg-primary text-primary-foreground border border-border'
                                : 'bg-muted text-foreground hover:bg-accent border border-border'
                            }`}
                          >
                            {product.thumb && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.thumb}
                                alt={product.name}
                                loading="lazy"
                                className="w-8 h-8 rounded object-contain shrink-0 bg-card p-0.5"
                              />
                            )}
                            <span className="truncate">{product.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No suggested foods available.
                      </p>
                    )}

                    {selectedKorvenProduct && (
                      <div className="text-xs text-primary bg-muted border border-border rounded p-2 flex items-center gap-2">
                        <Hexagon className="w-3 h-3 fill-amber-400/20" />
                        <span>Using Korven inspired name: <strong>{selectedKorvenProduct}</strong></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="food-name" className="text-foreground text-sm mb-2 block flex items-center gap-2">
                  Food Name
                  {isKorvenInspired && (
                    <span className="text-xs bg-muted text-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Hexagon className="w-3 h-3 fill-amber-400/30" />
                      Korven
                    </span>
                  )}
                </Label>
                <Input
                  id="food-name"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  required
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-amber-600/20"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Label htmlFor="kcal" className="text-foreground">Calories (kCal)</Label>
                  <button
                    type="button"
                    disabled={!foodName.trim() || isLookingUpKcal}
                    onClick={() => void lookupCalories(foodName)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLookingUpKcal && <Loader2 className="h-3 w-3 animate-spin" />}
                    {isLookingUpKcal ? 'Looking up...' : 'Auto-fill kcal'}
                  </button>
                </div>
                <Input
                  id="kcal"
                  type="number"
                  min="0"
                  value={kCal}
                  onChange={(e) => {
                    setKCal(Math.max(0, parseInt(e.target.value) || 0));
                    setKcalHint(null);
                  }}
                  required
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-border focus:ring-ring"
                  placeholder="Enter calories"
                />
                {kcalHint && (
                  <p className="mt-1 text-xs text-muted-foreground">{kcalHint}</p>
                )}
              </div>

              <DropdownWrapper label="Preferences">
                <CustomCheckbox
                  initialOptions={preferences.length > 0 ? preferences : []}
                  endpoint="preferences"
                  onSelectionChange={setPreferences}
                />
              </DropdownWrapper>

              <div>
                <Label className="text-foreground mb-3 block">Does this food have dietary restrictions?</Label>
                <div className="flex gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setHasRestrictions(false)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      hasRestrictions === false
                        ? 'bg-primary border-border text-primary-foreground'
                        : 'bg-muted border-border text-foreground hover:border-border'
                    }`}
                  >
                    No restrictions (For Everyone)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasRestrictions(true)}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      hasRestrictions === true
                        ? 'bg-primary border-border text-primary-foreground'
                        : 'bg-muted border-border text-foreground hover:border-border'
                    }`}
                  >
                    Has restrictions
                  </button>
                </div>
                
                {hasRestrictions === true && (
                  <DropdownWrapper label="Select Dietary Restrictions">
                    <CustomCheckbox
                      initialOptions={restrictions.length > 0 ? restrictions : []}
                      endpoint="dietary-restrictions/excluding-for-everyone"
                      onSelectionChange={setRestrictions}
                    />
                  </DropdownWrapper>
                )}
              </div>

              <IconSelect onSelectionChange={setIcon} />
            </div>

            <div className="flex justify-center pt-4">
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-6 rounded-lg transition-colors shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Adding Food...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Food
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
