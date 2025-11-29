import React from "react";
import { Search } from "lucide-react";
import { useSearchStore } from "@/store/search";

export const SearchBar: React.FC = () => {
  const { config, openSheet } = useSearchStore();

  return (
    <button
      type="button"
      onClick={openSheet}
      className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-sm transition-colors w-full"
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {config.placeholder}
      </span>
    </button>
  );
};
