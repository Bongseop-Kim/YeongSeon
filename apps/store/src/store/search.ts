import { create } from "zustand";

export type DateFilterPreset = "5years" | "1month" | "2months" | "3months";

interface DateRange {
  from?: Date;
  to?: Date;
}

export interface SearchDateFilter {
  preset?: DateFilterPreset;
  customRange?: DateRange;
}

export interface TabsConfig {
  items: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface SearchConfig {
  enabled: boolean;
  placeholder?: string;
  query: string;
  dateFilter: SearchDateFilter;
  onSearch?: (query: string, dateFilter: SearchDateFilter) => void;
  tabs?: TabsConfig;
}

interface SearchStore {
  config: SearchConfig;
  isSheetOpen: boolean;
  setSearchEnabled: (
    enabled: boolean,
    options?: {
      placeholder?: string;
      onSearch?: SearchConfig["onSearch"];
      tabs?: TabsConfig;
    },
  ) => void;
  setQuery: (query: string) => void;
  setDatePreset: (preset: DateFilterPreset) => void;
  setCustomDateFrom: (from: string) => void;
  setCustomDateTo: (to: string) => void;
  setTabsActiveTab: (tab: string) => void;
  openSheet: () => void;
  closeSheet: () => void;
  clearSearch: () => void;
  executeSearch: () => void;
}

function getDateRangeForPreset(preset: DateFilterPreset): DateRange {
  const to = new Date();
  const from = new Date();

  switch (preset) {
    case "5years":
      from.setFullYear(from.getFullYear() - 5);
      break;
    case "1month":
      from.setMonth(from.getMonth() - 1);
      break;
    case "2months":
      from.setMonth(from.getMonth() - 2);
      break;
    case "3months":
      from.setMonth(from.getMonth() - 3);
      break;
  }

  return { from, to };
}

function createDefaultDateFilter(): SearchDateFilter {
  return {
    preset: "5years",
    customRange: getDateRangeForPreset("5years"),
  };
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  config: {
    enabled: false,
    placeholder: "검색...",
    query: "",
    dateFilter: createDefaultDateFilter(),
  },
  isSheetOpen: false,

  setSearchEnabled: (enabled, options) => {
    set((state) => ({
      isSheetOpen: enabled ? state.isSheetOpen : false,
      config: {
        ...state.config,
        enabled,
        placeholder: options?.placeholder || "검색...",
        onSearch: options?.onSearch,
        tabs: enabled ? options?.tabs : undefined,
        query: enabled ? state.config.query : "",
        dateFilter: enabled
          ? state.config.dateFilter
          : createDefaultDateFilter(),
      },
    }));
  },

  setQuery: (query) => {
    set((state) => ({
      config: {
        ...state.config,
        query,
      },
    }));
  },

  setDatePreset: (preset) => {
    set((state) => ({
      config: {
        ...state.config,
        dateFilter: {
          preset,
          customRange: getDateRangeForPreset(preset),
        },
      },
    }));
  },

  setCustomDateFrom: (from) => {
    const date = from ? new Date(from) : undefined;
    set((state) => ({
      config: {
        ...state.config,
        dateFilter: {
          preset: undefined,
          customRange: {
            ...state.config.dateFilter.customRange,
            from: date,
          },
        },
      },
    }));
  },

  setCustomDateTo: (to) => {
    const date = to ? new Date(to) : undefined;
    set((state) => ({
      config: {
        ...state.config,
        dateFilter: {
          preset: undefined,
          customRange: {
            ...state.config.dateFilter.customRange,
            to: date,
          },
        },
      },
    }));
  },

  setTabsActiveTab: (tab) => {
    set((state) => {
      if (!state.config.tabs || state.config.tabs.activeTab === tab)
        return state;
      return {
        config: {
          ...state.config,
          tabs: { ...state.config.tabs, activeTab: tab },
        },
      };
    });
  },

  openSheet: () => set({ isSheetOpen: true }),
  closeSheet: () => set({ isSheetOpen: false }),

  clearSearch: () => {
    set((state) => ({
      config: {
        ...state.config,
        query: "",
        dateFilter: createDefaultDateFilter(),
      },
    }));
  },

  executeSearch: () => {
    const { config } = get();
    config.onSearch?.(config.query, config.dateFilter);
    get().closeSheet();
  },
}));
