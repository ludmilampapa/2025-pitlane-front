// Common CSS classes and styles used across meal components
export const COMMON_STYLES = {
  INPUT_CLASS: "w-full p-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
  DISABLED_INPUT_CLASS: "w-full p-3 rounded-lg border border-border bg-muted/60 text-muted-foreground cursor-not-allowed",
  MODAL_BACKDROP: "fixed inset-0 bg-black/70 backdrop-blur-sm",
  MODAL_CONTAINER: "fixed inset-0 z-[95] flex items-center justify-center p-4",
  CARD_BASE: "bg-card border border-border rounded-xl shadow-sm",
  BUTTON_PRIMARY: "bg-primary hover:bg-primary/90 text-primary-foreground",
  BUTTON_SECONDARY: "bg-muted/60 hover:bg-muted border border-border text-foreground",
  TEXT_AMBER_PRIMARY: "text-foreground",
  TEXT_AMBER_SECONDARY: "text-foreground/90",
  TEXT_AMBER_MUTED: "text-muted-foreground",
} as const;

// Common Z-index values for layered components
export const Z_INDEX = {
  MODAL_BACKDROP: 90,
  MODAL_CONTAINER: 95,
  MODAL_CONTENT: 96,
} as const;

// Default values for various form inputs
export const DEFAULTS = {
  QUANTITY: 1,
  KCAL_PER_UNIT: 1,
  MAX_FOODS_TO_SHOW: 3,
  SEARCH_DEBOUNCE_MS: 250,
  MAX_SEARCH_RESULTS: 12,
} as const;