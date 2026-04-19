import { useSearchStore, type SearchDateFilter } from "@/shared/store/search";
import { useSearch } from "@/shared/hooks/use-search";

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
  const setTabsActiveTab = useSearchStore((state) => state.setTabsActiveTab);
  const activeTab = useSearchStore(
    (state) => (state.config.tabs?.activeTab as T | undefined) ?? defaultTab,
  );

  useSearch({
    placeholder,
    onSearch,
    tabs: {
      items: tabs,
      defaultTab,
      onTabChange: setTabsActiveTab,
    },
  });

  return activeTab;
}
