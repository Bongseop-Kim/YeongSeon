import { useEffect, useRef } from "react";
import { useSearchStore, type SearchDateFilter } from "@/store/search";

interface UseSearchTabsOptions<T extends string> {
  tabs: readonly T[];
  defaultTab: T;
  placeholder: string;
  onSearch: (query: string, dateFilter: SearchDateFilter) => void;
}

export function useSearchTabs<T extends string>({
  tabs,
  defaultTab,
  placeholder,
  onSearch,
}: UseSearchTabsOptions<T>): T {
  const { setSearchEnabled, setTabsActiveTab, config } = useSearchStore();
  const onSearchRef = useRef(onSearch);
  const activeTab = (config.tabs?.activeTab as T | undefined) ?? defaultTab;

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    setSearchEnabled(true, {
      placeholder,
      onSearch: (query, dateFilter) => {
        onSearchRef.current(query, dateFilter);
      },
      tabs: {
        items: [...tabs],
        activeTab: defaultTab,
        onTabChange: setTabsActiveTab,
      },
    });

    return () => setSearchEnabled(false);
  }, [defaultTab, placeholder, setSearchEnabled, setTabsActiveTab, tabs]);

  return activeTab;
}
