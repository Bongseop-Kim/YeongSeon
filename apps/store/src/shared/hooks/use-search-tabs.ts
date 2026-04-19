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
  const isAllowedTab = (value: string): value is T =>
    tabs.some((tab) => tab === value);
  const activeTab = useSearchStore((state) => {
    const value = state.config.tabs?.activeTab;
    return typeof value === "string" && isAllowedTab(value)
      ? value
      : defaultTab;
  });

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
