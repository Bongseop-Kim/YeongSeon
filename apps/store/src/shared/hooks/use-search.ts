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
    const tabsProp =
      items !== undefined && defaultTab !== undefined
        ? {
            tabs: {
              items,
              activeTab: defaultTab,
              onTabChange: (tab: string) => {
                onTabChangeRef.current?.(tab);
              },
            },
          }
        : {};

    setSearchEnabled(true, {
      placeholder,
      onSearch: (query, dateFilter) => {
        onSearchRef.current(query, dateFilter);
      },
      ...tabsProp,
    });

    return () => setSearchEnabled(false);
    // tabItems is intentionally omitted; itemsKey is the stable change marker
    // while onSearchRef and onTabChangeRef keep the handlers current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholder, setSearchEnabled, defaultTab, itemsKey]);
}
