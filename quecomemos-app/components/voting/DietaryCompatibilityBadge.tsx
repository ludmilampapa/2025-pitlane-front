import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Leaf } from 'lucide-react';

interface DietaryRestriction {
  DietaryRestrictionID: number;
  name: string;
}

interface DietaryCompatibilityBadgeProps {
  mealRestrictions: Array<{ DietaryRestrictionID: number; name: string }>;
  groupRestrictions: DietaryRestriction[];
}

export function DietaryCompatibilityBadge({ mealRestrictions, groupRestrictions }: DietaryCompatibilityBadgeProps) {
  const clashes = mealRestrictions.filter((restriction) =>
    groupRestrictions.some((groupRestriction) =>
      groupRestriction.DietaryRestrictionID === restriction.DietaryRestrictionID
    )
  );

  if (clashes.length === 0) {
    return (
      <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        <Leaf className="mr-1 h-3 w-3" />100% Apto Grupo
      </Badge>
    );
  }

  return (
    <Badge className="border border-[#E7B3A0] bg-[#FFF3EE] text-[#A84526] hover:bg-[#FFF3EE]">
      <AlertTriangle className="mr-1 h-3 w-3" />Restricción detectada: {clashes.map((item) => item.name).join(', ')}
    </Badge>
  );
}
