import { Search } from "lucide-react";
import SearchSheet from "@/components/composite/search-sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { useSearchStore } from "@/store/search";

export default function SearchSection() {
  const { config, openSheet } = useSearchStore();
  const { isMobile } = useBreakpoint();

  if (!config.enabled) return null;

  const hasQuery = config.query.length > 0;
  const hasDateFilter = config.dateFilter.preset !== "5years";
  const isFiltered = hasQuery || hasDateFilter;

  return (
    <div
      className={`bg-zinc-900 mx-auto ${
        isMobile ? "px-4" : "px-8"
      } max-w-7xl flex flex-col`}
    >
      <div className="flex pb-4">
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
              {[hasQuery && "검색", hasDateFilter && "기간"]
                .filter(Boolean)
                .join("+")}
            </span>
          )}
        </button>
        <SearchSheet />
      </div>
      {config.tabs && (
        <Tabs
          value={config.tabs.activeTab}
          onValueChange={config.tabs.onTabChange}
        >
          <TabsList className="w-full justify-start overflow-x-auto scrollbar-hidden bg-transparent">
            {config.tabs.items.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-none bg-transparent text-zinc-400 border-b-2 border-transparent data-[state=active]:text-white data-[state=active]:border-white data-[state=active]:font-semibold"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
