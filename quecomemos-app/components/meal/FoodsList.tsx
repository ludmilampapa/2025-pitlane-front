'use client';
import { Button } from "@/components/ui/button";
import { Trash, Hexagon } from "lucide-react";
import { FoodItem } from "./types";
import { FoodIcon, KcalDisplay, FoodQuantityDisplay } from "./common/FoodDisplayComponents";
import { useKorvenCheck } from "./hooks/useKorvenCheck";

type Props = {
  foods: FoodItem[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
};

export default function FoodsList({ foods, onEdit, onRemove }: Props) {
  const { isKorvenInspiredFood } = useKorvenCheck();

  if (foods.length === 0) {
    return (
      <div className="text-muted-foreground text-sm bg-muted/40 border border-border rounded-lg p-3">
        You haven&apos;t added any food yet. Use the <b>Add Food</b> button.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {foods.map((food, i) => (
        <div
          key={`${food.name}-${i}`}
          className="bg-muted/35 border border-border rounded-xl p-4 flex items-center gap-4"
        >
          <FoodIcon food={food} />
          
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <h5 className="font-semibold text-foreground">
                  {food.name}
                </h5>
                {isKorvenInspiredFood(food.name) && (
                  <span className="text-xs bg-primary/10 text-primary border border-primary/25 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Hexagon className="w-2.5 h-2.5 fill-primary/20" />
                    TheMealDB
                  </span>
                )}
              </div>
              <KcalDisplay kcal={food.kCal} />
            </div>
            <FoodQuantityDisplay 
              quantity={food.quantity}
              kcalPerUnit={food.kcalPerUnit || (food.kCal / food.quantity)}
              totalKcal={food.kCal}
            />
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(i)}
              className="rounded-lg text-xs"
            >
              Edit
            </Button>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors"
              title="Remove"
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}