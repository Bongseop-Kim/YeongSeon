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
  const onTabChangeRef = useRef(tabs?.onTabChange);
  const tabItems = tabs?.items;
  const defaultTab = tabs?.defaultTab;
  const itemsKey = tabItems?.join("\u0000");

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    onTabChangeRef.current = tabs?.onTabChange;
  }, [tabs?.onTabChange]);

  useEffect(() => {
    const items = tabItems ? [...tabItems] : undefined;
    setSearchEnabled(true, {
      placeholder,
      onSearch: (query, dateFilter) => {
        onSearchRef.current(query, dateFilter);
      },
      ...(items !== undefined &&
      defaultTab !== undefined &&
      onTabChangeRef.current !== undefined
        ? {
            tabs: {
              items,
              activeTab: defaultTab,
              onTabChange: (tab) => {
                onTabChangeRef.current?.(tab);
              },
            },
          }
        : {}),
    });

    return () => setSearchEnabled(false);
  }, [placeholder, setSearchEnabled, defaultTab, itemsKey]);
}
