import { create } from "zustand";

export type DateFilterPreset = "5years" | "1month" | "2months" | "3months";

interface DateRange {
  from?: Date;
  to?: Date;
}

interface SearchConfig {
  enabled: boolean;
  placeholder?: string;
  query: string;
  dateFilter: {
    preset?: DateFilterPreset;
    customRange?: DateRange;
  };
  onSearch?: (query: string, dateFilter: SearchConfig["dateFilter"]) => void;
}

interface SearchStore {
  config: SearchConfig;
  isSheetOpen: boolean;
  setSearchEnabled: (
    enabled: boolean,
    options?: {
      placeholder?: string;
      onSearch?: SearchConfig["onSearch"];
    }
  ) => void;
  setQuery: (query: string) => void;
  setDatePreset: (preset: DateFilterPreset) => void;
  setCustomDateFrom: (from: string) => void;
  setCustomDateTo: (to: string) => void;
  openSheet: () => void;
  closeSheet: () => void;
  clearSearch: () => void;
  executeSearch: () => void;
}

const getDefaultDateRange = (): DateRange => {
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 5); // 기본 5년
  return { from, to };
};

export const useSearchStore = create<SearchStore>((set, get) => ({
  config: {
    enabled: false,
    placeholder: "검색...",
    query: "",
    dateFilter: {
      preset: "5years",
      customRange: getDefaultDateRange(),
    },
  },
  isSheetOpen: false,

  setSearchEnabled: (enabled, options) => {
    set((state) => ({
      config: {
        ...state.config,
        enabled,
        placeholder: options?.placeholder || "검색...",
        onSearch: options?.onSearch,
        query: enabled ? state.config.query : "",
        dateFilter: enabled
          ? state.config.dateFilter
          : {
              preset: "5years",
              customRange: getDefaultDateRange(),
            },
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

    set((state) => ({
      config: {
        ...state.config,
        dateFilter: {
          preset,
          customRange: { from, to },
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

  openSheet: () => set({ isSheetOpen: true }),
  closeSheet: () => set({ isSheetOpen: false }),

  clearSearch: () => {
    set((state) => ({
      config: {
        ...state.config,
        query: "",
        dateFilter: {
          preset: "5years",
          customRange: getDefaultDateRange(),
        },
      },
    }));
  },

  executeSearch: () => {
    const { config } = get();
    config.onSearch?.(config.query, config.dateFilter);
    get().closeSheet();
  },
}));
