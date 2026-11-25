export interface RestrictionTag {
  DietaryRestrictionID?: number;
  name?: string;
}

export interface RestrictionItem {
  DietaryRestrictionID: number;
  name: string;
}

interface FoodLike {
  name?: string;
  dietaryRestrictions?: Array<RestrictionTag | number>;
}

interface MealLike {
  name?: string;
  mealFoods?: Array<{
    food?: FoodLike;
  }>;
}

const PLANT_SAFE_EXCEPTIONS = [
  'soy milk',
  'almond milk',
  'oat milk',
  'coconut milk',
  'rice milk',
  'coconut cream',
  'leche de almendra',
  'leche de soja',
  'leche de avena',
  'leche de coco',
  'crema de coco',
  'peanut butter',
  'almond butter',
  'cocoa butter',
  'manteca de mani',
  'manteca de maní',
  'manteca de cacao',
  'eggplant',
  'berenjena',
  'butternut',
];

const GLUTEN_FREE_EXCEPTIONS = [
  'gluten free',
  'gluten-free',
  'sin tacc',
  'sin gluten',
  'rice flour',
  'harina de arroz',
  'corn flour',
  'harina de maiz',
  'harina de maíz',
  'almond flour',
  'harina de almendra',
  'chickpea flour',
  'harina de garbanzo',
  'rice noodle',
  'fideos de arroz',
  'buckwheat',
  'trigo sarraceno',
];

const MEAT_AND_SEAFOOD = [
  'beef', 'bife', 'carne', 'steak', 'asado', 'veal', 'ternera', 'vacuno',
  'pork', 'cerdo', 'bacon', 'panceta', 'ham', 'jamon', 'jamón', 'chorizo',
  'salami', 'salame', 'sausage', 'salchicha', 'prosciutto', 'pepperoni',
  'chicken', 'pollo', 'turkey', 'pavo', 'duck', 'pato', 'lamb', 'cordero',
  'meat', 'mince', 'picada', 'milanesa', 'burger', 'hamburguesa',
  'fish', 'pescado', 'salmon', 'salmón', 'tuna', 'atun', 'atún', 'cod',
  'merluza', 'trout', 'trucha', 'hake', 'sardine', 'sardina', 'anchovy', 'anchoa',
  'shrimp', 'camaron', 'camarón', 'prawn', 'langostino', 'crab', 'cangrejo',
  'lobster', 'squid', 'calamar', 'octopus', 'pulpo', 'mussel', 'mejillon',
  'clam', 'oyster', 'seafood', 'marisco', 'gelatin', 'gelatina', 'lard',
];

const DAIRY_TERMS = [
  'milk', 'leche', 'cheese', 'queso', 'mozzarella', 'parmesan', 'parmesano',
  'cheddar', 'ricotta', 'provolone', 'gouda', 'brie', 'camembert', 'feta',
  'mascarpone', 'roquefort', 'blue cheese', 'gruyere', 'butter', 'manteca',
  'mantequilla', 'cream', 'crema', 'yogurt', 'yoghurt', 'yogur', 'whey',
  'suero', 'ghee', 'ice cream', 'helado', 'dulce de leche', 'condensed milk',
];

const EGG_AND_HONEY_TERMS = [
  'egg', 'eggs', 'huevo', 'huevos', 'mayonnaise', 'mayonesa', 'meringue',
  'merengue', 'honey', 'miel',
];

const GLUTEN_TERMS = [
  'wheat', 'trigo', 'flour', 'harina', 'bread', 'pan', 'baguette', 'brioche',
  'croissant', 'toast', 'tostada', 'pasta', 'spaghetti', 'macaroni', 'penne',
  'fettuccine', 'tagliatelle', 'rigatoni', 'lasagna', 'lasaña', 'ravioli',
  'gnocchi', 'ñoqui', 'noodle', 'fideo', 'ramen', 'udon', 'couscous', 'cuscus',
  'bulgur', 'seitan', 'seitán', 'barley', 'cebada', 'rye', 'centeno', 'malt',
  'malta', 'breadcrumbs', 'pan rallado', 'rebozado', 'empanada', 'pizza',
  'soy sauce', 'salsa de soja', 'biscuit', 'cookie', 'galleta', 'galletita',
  'cake', 'torta', 'pastry', 'hojaldre', 'tortilla de trigo', 'beer', 'cerveza',
  'morcilla', 'chorizo',
];

const NUT_TERMS = [
  'peanut', 'mani', 'maní', 'almond', 'almendra', 'walnut', 'nuez', 'nueces',
  'cashew', 'caju', 'castaña', 'hazelnut', 'avellana', 'pistachio', 'pistacho',
  'pecan', 'macadamia', 'pine nut', 'piñon', 'piñón', 'praline', 'nutella',
];

const SUGAR_TERMS = [
  'sugar', 'azucar', 'azúcar', 'syrup', 'jarabe', 'honey', 'miel', 'caramel',
  'caramelo', 'dulce de leche', 'jam', 'mermelada', 'chocolate', 'candy',
];

const HIGH_CARB_TERMS = [
  ...SUGAR_TERMS,
  'bread', 'pan', 'pasta', 'spaghetti', 'rice', 'arroz', 'potato', 'papa',
  'patata', 'flour', 'harina', 'corn', 'choclo', 'maiz', 'maíz', 'oats', 'avena',
];

const HIGH_SODIUM_TERMS = [
  'salt', 'sal', 'soy sauce', 'salsa de soja', 'bacon', 'panceta', 'salami',
  'salame', 'ham', 'jamon', 'jamón', 'prosciutto', 'anchovy', 'anchoa', 'bouillon',
];

function containsTerm(text: string, terms: string[]): boolean {
  if (!text) return false;
  const lower = ` ${text.toLowerCase()} `;
  return terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-záéíóúñ])${escaped}(s|es)?([^a-záéíóúñ]|$)`, 'i');
    return re.test(lower);
  });
}

export function violatesRestrictionByName(textToCheck?: string, restrictionName?: string): boolean {
  if (!textToCheck || !restrictionName) return false;
  const lowerText = textToCheck.toLowerCase();
  const r = restrictionName.toLowerCase();

  const hasPlantException = PLANT_SAFE_EXCEPTIONS.some((ex) => lowerText.includes(ex));
  const hasGlutenFreeException = GLUTEN_FREE_EXCEPTIONS.some((ex) => lowerText.includes(ex));

  if (r.includes('vegan') || r.includes('vegano') || r.includes('plant')) {
    if (containsTerm(lowerText, MEAT_AND_SEAFOOD)) return true;
    if (!hasPlantException && containsTerm(lowerText, DAIRY_TERMS)) return true;
    if (!hasPlantException && containsTerm(lowerText, EGG_AND_HONEY_TERMS)) return true;
  }

  if (r.includes('vegetarian') || r.includes('vegetariano')) {
    if (containsTerm(lowerText, MEAT_AND_SEAFOOD)) return true;
  }

  if (r.includes('gluten') || r.includes('tacc') || r.includes('celiac') || r.includes('celíac')) {
    if (!hasGlutenFreeException && containsTerm(lowerText, GLUTEN_TERMS)) return true;
  }

  if (r.includes('lactos') || r.includes('dairy') || r.includes('lácteo') || r.includes('lacteo')) {
    if (!lowerText.includes('lactose free') && !lowerText.includes('sin lactosa') && !hasPlantException) {
      if (containsTerm(lowerText, DAIRY_TERMS)) return true;
    }
  }

  if (r.includes('nut') || r.includes('mani') || r.includes('maní') || r.includes('frutos secos')) {
    if (containsTerm(lowerText, NUT_TERMS)) return true;
  }

  if (r.includes('sugar') || r.includes('azucar') || r.includes('azúcar') || r.includes('diabet')) {
    if (!lowerText.includes('sugar free') && !lowerText.includes('sin azucar') && !lowerText.includes('sin azúcar')) {
      if (containsTerm(lowerText, SUGAR_TERMS)) return true;
    }
  }

  if (r.includes('keto') || r.includes('low carb') || r.includes('cetogen')) {
    if (containsTerm(lowerText, HIGH_CARB_TERMS)) return true;
  }

  if (r.includes('sodium') || r.includes('sodio') || r.includes('sin sal') || r.includes('hipertens')) {
    if (containsTerm(lowerText, HIGH_SODIUM_TERMS)) return true;
  }

  return false;
}

function normalizeRestrictionIds(raw: Array<RestrictionTag | number> | undefined): {
  isUniversal: boolean;
  ids: Set<number>;
} {
  if (!raw || raw.length === 0) {
    return { isUniversal: false, ids: new Set() };
  }

  let isUniversal = false;
  const ids = new Set<number>();

  for (const item of raw) {
    if (typeof item === 'number') {
      if (item === 0) isUniversal = true;
      else ids.add(item);
    } else if (item) {
      const id = item.DietaryRestrictionID;
      const name = item.name?.toLowerCase() || '';
      if (id === 0 || name.includes('everyone')) {
        isUniversal = true;
      } else if (typeof id === 'number') {
        ids.add(id);
      }
    }
  }

  return { isUniversal, ids };
}

type RequirementInput = number | RestrictionItem;

function normalizeRequirements(
  requiredInput: Iterable<RequirementInput>
): Array<{ id: number; name?: string }> {
  const map = new Map<number, { id: number; name?: string }>();
  for (const item of requiredInput) {
    if (typeof item === 'number') {
      if (item !== 0 && !map.has(item)) {
        map.set(item, { id: item });
      }
    } else if (item && item.DietaryRestrictionID !== 0) {
      if (!item.name?.toLowerCase().includes('everyone')) {
        map.set(item.DietaryRestrictionID, {
          id: item.DietaryRestrictionID,
          name: item.name,
        });
      }
    }
  }
  return Array.from(map.values());
}

/**
 * Checks whether a single food item is safe for ALL required dietary restrictions
 * (validating both explicit DB tags AND ingredient allergen names).
 */
export function isFoodCompatibleWithRestrictions(
  food: FoodLike | undefined,
  requiredInput: Iterable<RequirementInput>
): boolean {
  const required = normalizeRequirements(requiredInput);
  if (required.length === 0) return true;
  if (!food) return true;

  for (const req of required) {
    if (req.name && violatesRestrictionByName(food.name, req.name)) {
      return false;
    }
  }

  const { isUniversal, ids } = normalizeRestrictionIds(food.dietaryRestrictions);
  if (isUniversal) return true;

  return required.every((req) => ids.has(req.id));
}

/**
 * Checks whether EVERY ingredient (and the dish title) satisfies all required dietary restrictions.
 */
export function isMealCompatibleWithRestrictions(
  meal: MealLike | undefined | null,
  requiredInput: Iterable<RequirementInput>
): boolean {
  const required = normalizeRequirements(requiredInput);
  if (required.length === 0) return true;
  if (!meal) return true;

  for (const req of required) {
    if (req.name && violatesRestrictionByName(meal.name, req.name)) {
      return false;
    }
  }

  if (!meal.mealFoods || meal.mealFoods.length === 0) return true;

  const normalizedItems: RequirementInput[] = required.map((r) =>
    r.name ? { DietaryRestrictionID: r.id, name: r.name } : r.id
  );
  return meal.mealFoods.every((mf) => isFoodCompatibleWithRestrictions(mf.food, normalizedItems));
}

/**
 * Returns the list of group restrictions that a meal FAILS to satisfy (empty array = 100% Group Safe).
 */
export function getUnsatisfiedRestrictions(
  meal: MealLike | undefined | null,
  groupRestrictions: RestrictionItem[]
): RestrictionItem[] {
  const activeGroup = groupRestrictions.filter(
    (r) => r.DietaryRestrictionID !== 0 && !r.name.toLowerCase().includes('everyone')
  );
  if (activeGroup.length === 0 || !meal) return [];

  return activeGroup.filter(
    (restriction) => !isMealCompatibleWithRestrictions(meal, [restriction])
  );
}
