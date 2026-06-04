import { useMemo, useReducer } from "react";

import { PRICE_RANGE_OPTIONS } from "@/features/shop/constants/FILTER_OPTIONS";
import type { FilterTab } from "@/features/shop/types/filter";
import type {
  ProductCategory,
  ProductColor,
  ProductMaterial,
  ProductPattern,
} from "@yeongseon/shared/types/view/product";

type FilterState = {
  selectedCategories: ProductCategory[];
  selectedColors: ProductColor[];
  selectedPatterns: ProductPattern[];
  selectedMaterials: ProductMaterial[];
  selectedPriceRange: string;
};

type ShopFiltersState = {
  applied: FilterState;
  draft: FilterState;
  activeTab: FilterTab;
  isDialogOpen: boolean;
};

type ShopFiltersAction =
  | { type: "open"; tab: FilterTab }
  | { type: "close" }
  | { type: "apply" }
  | { type: "resetApplied" }
  | { type: "resetDraft" }
  | { type: "toggleCategory"; category: ProductCategory }
  | { type: "toggleColor"; color: ProductColor }
  | { type: "togglePattern"; pattern: ProductPattern }
  | { type: "toggleMaterial"; material: ProductMaterial }
  | { type: "setDraftPriceRange"; range: string };

const EMPTY_FILTERS: FilterState = {
  selectedCategories: [],
  selectedColors: [],
  selectedPatterns: [],
  selectedMaterials: [],
  selectedPriceRange: "all",
};

const INITIAL_STATE: ShopFiltersState = {
  applied: EMPTY_FILTERS,
  draft: EMPTY_FILTERS,
  activeTab: "category",
  isDialogOpen: false,
};

function toggleFilterValue<T>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function shopFiltersReducer(
  state: ShopFiltersState,
  action: ShopFiltersAction,
): ShopFiltersState {
  switch (action.type) {
    case "open":
      return {
        ...state,
        activeTab: action.tab,
        draft: state.applied,
        isDialogOpen: true,
      };
    case "close":
      return { ...state, isDialogOpen: false };
    case "apply":
      return { ...state, applied: state.draft, isDialogOpen: false };
    case "resetApplied":
      return { ...state, applied: EMPTY_FILTERS };
    case "resetDraft":
      return { ...state, draft: EMPTY_FILTERS };
    case "toggleCategory":
      return {
        ...state,
        draft: {
          ...state.draft,
          selectedCategories: toggleFilterValue(
            state.draft.selectedCategories,
            action.category,
          ),
        },
      };
    case "toggleColor":
      return {
        ...state,
        draft: {
          ...state.draft,
          selectedColors: toggleFilterValue(
            state.draft.selectedColors,
            action.color,
          ),
        },
      };
    case "togglePattern":
      return {
        ...state,
        draft: {
          ...state.draft,
          selectedPatterns: toggleFilterValue(
            state.draft.selectedPatterns,
            action.pattern,
          ),
        },
      };
    case "toggleMaterial":
      return {
        ...state,
        draft: {
          ...state.draft,
          selectedMaterials: toggleFilterValue(
            state.draft.selectedMaterials,
            action.material,
          ),
        },
      };
    case "setDraftPriceRange":
      return {
        ...state,
        draft: { ...state.draft, selectedPriceRange: action.range },
      };
  }
}

export function useShopFilters() {
  const [state, dispatch] = useReducer(shopFiltersReducer, INITIAL_STATE);
  const { applied, draft, activeTab, isDialogOpen } = state;

  const selectedPriceOption = useMemo(
    () =>
      PRICE_RANGE_OPTIONS.find(
        (opt) => opt.value === applied.selectedPriceRange,
      ) ?? PRICE_RANGE_OPTIONS[0],
    [applied.selectedPriceRange],
  );

  const activeCounts = {
    category: applied.selectedCategories.length,
    price: applied.selectedPriceRange !== "all" ? 1 : 0,
    color: applied.selectedColors.length,
    pattern: applied.selectedPatterns.length,
    material: applied.selectedMaterials.length,
  } satisfies Partial<Record<FilterTab, number>>;

  const priceMin =
    selectedPriceOption.value === "all" ? null : selectedPriceOption.min;
  const priceMax = Number.isFinite(selectedPriceOption.max)
    ? selectedPriceOption.max
    : null;

  return {
    applied,
    draft,
    activeTab,
    activeCounts,
    isDialogOpen,
    priceMin,
    priceMax,
    openDialog: (tab: FilterTab) => dispatch({ type: "open", tab }),
    closeDialog: () => dispatch({ type: "close" }),
    applyDraft: () => dispatch({ type: "apply" }),
    resetApplied: () => dispatch({ type: "resetApplied" }),
    resetDraft: () => dispatch({ type: "resetDraft" }),
    toggleDraftCategory: (category: ProductCategory) =>
      dispatch({ type: "toggleCategory", category }),
    toggleDraftColor: (color: ProductColor) =>
      dispatch({ type: "toggleColor", color }),
    toggleDraftPattern: (pattern: ProductPattern) =>
      dispatch({ type: "togglePattern", pattern }),
    toggleDraftMaterial: (material: ProductMaterial) =>
      dispatch({ type: "toggleMaterial", material }),
    setDraftPriceRange: (range: string) =>
      dispatch({ type: "setDraftPriceRange", range }),
  };
}
