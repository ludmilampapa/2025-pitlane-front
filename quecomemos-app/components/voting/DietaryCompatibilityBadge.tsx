import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Leaf } from 'lucide-react';
import {
  getUnsatisfiedRestrictions,
  type RestrictionItem,
  type RestrictionTag,
} from '@/lib/utils/dietaryCompatibility';

interface MealLike {
  mealFoods?: Array<{
    food?: {
      dietaryRestrictions?: Array<RestrictionTag | number>;
    };
  }>;
}

interface DietaryCompatibilityBadgeProps {
  meal?: MealLike;
  mealRestrictions?: RestrictionItem[];
  groupRestrictions: RestrictionItem[];
}

export function DietaryCompatibilityBadge({
  meal,
  mealRestrictions = [],
  groupRestrictions,
}: DietaryCompatibilityBadgeProps) {
  const activeGroupRestrictions = groupRestrictions.filter(
    (r) => r.DietaryRestrictionID !== 0 && !r.name.toLowerCase().includes('everyone')
  );

  // Evaluate per-ingredient compatibility when meal is provided; fallback to tag list otherwise
  const missing = meal
    ? getUnsatisfiedRestrictions(meal, activeGroupRestrictions)
    : activeGroupRestrictions.filter(
        (req) =>
          mealRestrictions.length > 0 &&
          !mealRestrictions.some(
            (m) =>
              m.DietaryRestrictionID === 0 ||
              m.name.toLowerCase().includes('everyone') ||
              m.DietaryRestrictionID === req.DietaryRestrictionID
          )
      );

  if (missing.length === 0) {
    return (
      <Badge className="border border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300">
        <Leaf className="mr-1 h-3 w-3" />
        {activeGroupRestrictions.length > 0
          ? `Safe (${activeGroupRestrictions.map((r) => r.name).join(', ')})`
          : 'Group Safe'}
      </Badge>
    );
  }

  return (
    <Badge className="border border-destructive/35 bg-destructive/10 font-medium text-destructive hover:bg-destructive/15">
      <AlertTriangle className="mr-1 h-3 w-3" />
      Not {missing.map((item) => item.name).join(', ')}
    </Badge>
  );
}
