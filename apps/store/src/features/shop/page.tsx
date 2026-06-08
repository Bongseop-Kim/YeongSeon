import { useState, useEffect, useRef } from "react";
import { PageSeo } from "@/shared/ui/page-seo";
import { FilterButtons } from "./components/filter-buttons";
import { FilterContent } from "./components/filter-content";
import { ProductGrid } from "./components/product-grid";
import { SortSelect } from "./components/sort-select";
import { useProducts } from "@/entities/shop";
import { analytics } from "@/shared/lib/analytics";
import type { SortOption } from "@yeongseon/shared/types/view/product";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import { Dialog } from "@/shared/ui-extended/dialog";
import { ResponsiveDialogScaffold } from "@/shared/ui-extended/responsive-dialog-scaffold";
import { useShopFilters } from "@/features/shop/hooks/use-shop-filters";

export default function ShopPage() {
  const [sortOption, setSortOption] = useState<SortOption>("latest");
  const { isMobile } = useBreakpoint();
  const {
    applied,
    draft,
    activeTab,
    activeCounts,
    isDialogOpen,
    priceMin,
    priceMax,
    openDialog,
    closeDialog,
    applyDraft,
    resetApplied,
    resetDraft,
    toggleDraftCategory,
    toggleDraftColor,
    toggleDraftPattern,
    toggleDraftMaterial,
    setDraftPriceRange,
  } = useShopFilters();

  const { data: products = [], isLoading } = useProducts({
    categories: applied.selectedCategories,
    colors: applied.selectedColors,
    patterns: applied.selectedPatterns,
    materials: applied.selectedMaterials,
    priceMin,
    priceMax,
    sortOption,
  });

  const firedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && products.length > 0 && !firedRef.current) {
      firedRef.current = true;
      analytics.track("view_item_list", {
        item_list_id: "shop",
        item_list_name: "상품 목록",
      });
    }
  }, [isLoading, products.length]);

  return (
    <>
      <PageSeo
        title="넥타이 쇼핑"
        description="ESSE SION의 다양한 넥타이 컬렉션. 비즈니스·웨딩·선물용 넥타이를 엄선된 소재로 제공합니다."
        ogUrl="https://essesion.shop/shop"
        siteName="ESSE SION"
      />
      <MainLayout>
        <MainContent>
          <PageLayout>
            <div className="pb-16">
              <section className="sticky top-0 z-30 bg-background/92 backdrop-blur">
                <div className="rounded-lg bg-white py-3">
                  <div className="min-w-0">
                    <FilterButtons
                      onFilterClick={openDialog}
                      onMainButtonClick={
                        isMobile ? undefined : () => openDialog("category")
                      }
                      activeCounts={activeCounts}
                      onReset={resetApplied}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-200 pt-3">
                    <div className="text-sm font-medium text-zinc-700">
                      {isLoading
                        ? "상품을 찾는 중"
                        : `총 ${products.length}개 상품`}
                    </div>
                    <SortSelect value={sortOption} onChange={setSortOption} />
                  </div>
                </div>
              </section>

              <ProductGrid products={products} isLoading={isLoading} />
            </div>
          </PageLayout>
        </MainContent>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => !open && closeDialog()}
        >
          <ResponsiveDialogScaffold
            title="필터"
            confirmLabel="적용하기"
            bodyClassName="py-3 sm:p-5"
            onCancel={closeDialog}
            onConfirm={applyDraft}
          >
            <FilterContent
              key={activeTab}
              selectedCategories={draft.selectedCategories}
              selectedColors={draft.selectedColors}
              selectedPatterns={draft.selectedPatterns}
              selectedMaterials={draft.selectedMaterials}
              selectedPriceRange={draft.selectedPriceRange}
              onCategoryChange={toggleDraftCategory}
              onColorChange={toggleDraftColor}
              onPatternChange={toggleDraftPattern}
              onMaterialChange={toggleDraftMaterial}
              onPriceRangeChange={setDraftPriceRange}
              onReset={resetDraft}
              initialTab={activeTab}
            />
          </ResponsiveDialogScaffold>
        </Dialog>
      </MainLayout>
    </>
  );
}
