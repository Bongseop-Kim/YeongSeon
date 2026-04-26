import { useEffect, useRef } from "react";
import { useSearchStore, type SearchDateFilter } from "@/shared/store/search";

interface UseSearchOptions {
  placeholder: string;
  onSearch: (query: string, dateFilter: SearchDateFilter) => void;
  tabs?: {
    items: readonly string[];
    defaultTab: string;
    onTabChange: (tab: string) => void;
  };
}

export function useSearch({
  placeholder,
  onSearch,
  tabs,
}: UseSearchOptions): void {
  const setSearchEnabled = useSearchStore((state) => state.setSearchEnabled);
  const onSearchRef = useRef(onSearch);
  const tabItems = tabs?.items;
  const defaultTab = tabs?.defaultTab;
  const onTabChange = tabs?.onTabChange;

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    setSearchEnabled(true, {
      placeholder,
      onSearch: (query, dateFilter) => {
        onSearchRef.current(query, dateFilter);
      },
      ...(tabItems !== undefined &&
      defaultTab !== undefined &&
      onTabChange !== undefined
        ? {
            tabs: {
              items: [...tabItems],
              activeTab: defaultTab,
              onTabChange,
            },
          }
        : {}),
    });

    return () => setSearchEnabled(false);
  }, [placeholder, setSearchEnabled, defaultTab, tabItems, onTabChange]);
}
