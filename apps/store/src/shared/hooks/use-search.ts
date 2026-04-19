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
  const { setSearchEnabled } = useSearchStore();
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    setSearchEnabled(true, {
      placeholder,
      onSearch: (query, dateFilter) => {
        onSearchRef.current(query, dateFilter);
      },
      ...(tabs
        ? {
            tabs: {
              items: [...tabs.items],
              activeTab: tabs.defaultTab,
              onTabChange: tabs.onTabChange,
            },
          }
        : {}),
    });

    return () => setSearchEnabled(false);
  }, [placeholder, setSearchEnabled, tabs]);
}
