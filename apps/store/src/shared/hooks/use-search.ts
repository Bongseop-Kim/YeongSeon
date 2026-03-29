import { useEffect, useRef } from "react";
import { useSearchStore, type SearchDateFilter } from "@/shared/store/search";

interface UseSearchOptions {
  placeholder: string;
  onSearch: (query: string, dateFilter: SearchDateFilter) => void;
}

export function useSearch({ placeholder, onSearch }: UseSearchOptions): void {
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
    });

    return () => setSearchEnabled(false);
  }, [placeholder, setSearchEnabled]);
}
