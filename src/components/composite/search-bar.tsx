import React from "react";
import { Search } from "lucide-react";
import { useSearchStore } from "@/store/search";

export const SearchBar: React.FC = () => {
  const { config, openSheet } = useSearchStore();

  const hasQuery = config.query.length > 0;
  const hasDateFilter = config.dateFilter.preset !== "5years";
  const isFiltered = hasQuery || hasDateFilter;

  return (
    <button
      type="button"
      onClick={openSheet}
      className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-sm transition-colors w-full"
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      {isFiltered ? (
        <span className="text-sm text-zinc-900 truncate flex-1 text-left">
          {hasQuery ? config.query : "기간 필터 적용됨"}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">
          {config.placeholder}
        </span>
      )}
      {isFiltered && (
        <span className="text-xs bg-zinc-900 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
          {[hasQuery && "검색", hasDateFilter && "기간"].filter(Boolean).join("+")}
        </span>
      )}
    </button>
  );
};
