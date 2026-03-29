import { useParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/ROUTES";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { Button } from "@/shared/ui-extended/button";
import { PageLayout } from "@/shared/layout/page-layout";
import { Image } from "@imagekit/react";
import { useState } from "react";
import {
  useSelectedOptions,
  MobilePurchaseSheet,
  SelectedOptionItem,
  SelectedOptionsList,
  processOrderAndNavigate,
} from "@/features/shop";
import { ShopActionBar } from "@/shared/composite/shop-action-bar";
import { useBreakpoint } from "@/shared/lib/breakpoint-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui-extended/select";
import { Badge } from "@/shared/ui/badge";
import {
  getCategoryLabel,
  getColorLabel,
  getMaterialLabel,
  getPatternLabel,
} from "@/shared/lib/product/product-labels";
import { TieLengthGuideAccordion } from "@/shared/composite/tie-length-guide-accordion";
import { ProductCard } from "@/shared/composite/product-card";
import { useMemo } from "react";
import { useAddToCartItems } from "@/features/cart";
import { useOrderStore } from "@/shared/store/order";
import { useModalStore } from "@/shared/store/modal";
import { toast } from "@/shared/lib/toast";
import { useProduct, useProducts, useToggleLike } from "@/entities/shop";
import { Skeleton } from "@/shared/ui/skeleton";
import { ChevronRightIcon } from "lucide-react";
import { UtilityPageSection } from "@/shared/composite/utility-page";

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { addItemsToCart } = useAddToCartItems();
  const { openModal } = useModalStore();
  const { setOrderItems } = useOrderStore();
  const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const {
    selectedOptions,
    baseQuantity,
    handleSelectOption,
    handleRemoveOption,
    handleUpdateQuantity,
    handleUpdateBaseQuantity,
    resetOptions,
  } = useSelectedOptions();

  const productId = Number(id);
  const { data: product, isLoading: isProductLoading } = useProduct(productId);

  // 좋아요 상태 및 수는 상품 상세 응답에서 사용
  const isLiked = product?.isLiked ?? false;
  const likeCount = product?.likes ?? 0;
  const toggleLikeMutation = useToggleLike(productId);
  const SIMILAR_LIMIT = isMobile ? 3 : 4;

  const { data: categoryProducts = [], isLoading: isCategoryLoading } =
    useProducts(
      {
        categories: product ? [product.category] : [],
        limit: SIMILAR_LIMIT + 1,
      },
      { enabled: !!product },
    );

  const filteredSimilar = useMemo(
    () =>
      categoryProducts
        .filter((p) => p.id !== product?.id)
        .slice(0, SIMILAR_LIMIT),
    [categoryProducts, product?.id, SIMILAR_LIMIT],
  );
  const needsFallback = !isCategoryLoading && filteredSimilar.length === 0;
  const { data: fallbackProducts = [], isLoading: isFallbackLoading } =
    useProducts(
      { sortOption: "latest", limit: SIMILAR_LIMIT },
      { enabled: !!product && needsFallback },
    );
  const similarProducts =
    filteredSimilar.length > 0
      ? filteredSimilar
      : fallbackProducts.filter((p) => p.id !== product?.id);
  const isSimilarLoading =
    isCategoryLoading || (needsFallback && isFallbackLoading);
  const showSimilarSection = isSimilarLoading || similarProducts.length > 0;

  // 로딩 중이거나 제품이 없을 때 처리
  if (isProductLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-zinc-500">로딩 중...</p>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-zinc-500 mb-4">상품을 찾을 수 없습니다.</p>
            <Button onClick={() => navigate(ROUTES.SHOP)}>쇼핑 계속하기</Button>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  const productOptions = product.options ?? [];
  const hasOptions = productOptions.length > 0;
  const isProductSoldOut = hasOptions
    ? productOptions.every((o) => o.stock === 0)
    : product.stock === 0;

  // 좋아요 토글 핸들러
  const handleLikeToggle = async () => {
    try {
      await toggleLikeMutation.mutateAsync(isLiked);
    } catch {
      toast.error("좋아요 처리 중 오류가 발생했습니다.");
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (isAddingToCart) return;

    if (hasOptions && selectedOptions.length === 0) {
      toast.warning("옵션을 선택해주세요.");
      return;
    }

    setIsAddingToCart(true);
    try {
      const { succeeded, failed, total } = await addItemsToCart(product, {
        selectedOptions,
        baseQuantity,
        hasOptions,
      });

      if (failed === total) {
        toast.error("장바구니 추가 중 오류가 발생했습니다.");
        return;
      }

      if (failed > 0) {
        toast.warning(
          `일부 옵션을 장바구니에 추가하지 못했습니다. (${succeeded}/${total}개 추가됨)`,
        );
        return;
      }

      openModal({
        title: "장바구니",
        description: "장바구니에 추가되었습니다.",
        confirmText: "장바구니 보기",
        cancelText: "닫기",
        onConfirm: () => {
          window.location.href = ROUTES.CART;
        },
      });
      resetOptions();
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleOrder = () => {
    if (!product) return;

    if (isMobile) {
      setIsPurchaseSheetOpen(true);
      return;
    }

    processOrderAndNavigate(
      product,
      selectedOptions,
      baseQuantity,
      setOrderItems,
      navigate,
    );
  };

  const handleInquiry = () => {
    if (!product) return;
    const params = new URLSearchParams({
      category: "상품",
      productId: String(product.id),
      productName: product.name,
    });
    navigate(`${ROUTES.MY_PAGE_INQUIRY}?${params.toString()}`);
  };

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <PageLayout
          detail={
            <div className="space-y-10 pt-8">
              {showSimilarSection && (
                <UtilityPageSection
                  title="유사한 상품"
                  description="같은 결의 소재와 무드를 가진 제품을 더 둘러볼 수 있습니다."
                >
                  <div className="border-t border-stone-200 pt-5">
                    <div
                      className={`grid gap-2 ${
                        isMobile ? "grid-cols-3" : "grid-cols-4"
                      }`}
                    >
                      {isSimilarLoading
                        ? Array.from({ length: SIMILAR_LIMIT }).map(
                            (_, index) => (
                              <Skeleton
                                key={`similar-skeleton-${index}`}
                                className="aspect-square w-full"
                              />
                            ),
                          )
                        : similarProducts.map((similarProduct) => (
                            <ProductCard
                              key={similarProduct.id}
                              product={similarProduct}
                            />
                          ))}
                    </div>
                  </div>
                </UtilityPageSection>
              )}

              <UtilityPageSection
                title="상품 정보"
                description="실제 결을 확인할 수 있는 상세 이미지와 가이드를 제공합니다."
              >
                <div className="border-t border-stone-200 pt-5">
                  {product.detailImages && product.detailImages.length > 0 ? (
                    product.detailImages.map((detailImage, index) => (
                      <Image
                        key={detailImage}
                        src={detailImage}
                        alt={`${product.name} 상세 이미지 ${index + 1}`}
                        className="w-full h-auto object-contain"
                        transformation={[
                          {
                            width: 1200,
                            quality: 90,
                          },
                        ]}
                      />
                    ))
                  ) : (
                    <Image
                      src={product.image}
                      alt={`${product.name} 상세 이미지`}
                      className="w-full h-auto object-contain"
                      transformation={[
                        {
                          width: 1200,
                          quality: 90,
                        },
                      ]}
                    />
                  )}
                </div>
              </UtilityPageSection>
            </div>
          }
          sidebar={
            <div className="space-y-4">
              <div className="border-b border-stone-200 pb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  {product.code}
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
                  {product.name}
                </h1>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950">
                  {product.price.toLocaleString()}원
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {isProductSoldOut ? (
                    <Badge variant="destructive">품절</Badge>
                  ) : null}
                  {!hasOptions &&
                  product.stock != null &&
                  product.stock > 0 &&
                  product.stock <= 5 ? (
                    <Badge variant="secondary">{product.stock}개 남음</Badge>
                  ) : null}
                  <Badge variant="outline" className="gap-1">
                    #{getCategoryLabel(product.category)}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    #{getColorLabel(product.color)}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    #{getPatternLabel(product.pattern)}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    #{getMaterialLabel(product.material)}
                  </Badge>
                </div>
                <p className="mt-5 whitespace-pre-line text-sm leading-6 text-zinc-600">
                  {product.info}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-950">
                  구매 옵션
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  옵션과 수량을 정한 뒤 장바구니 또는 주문으로 이어집니다.
                </p>
                <div className="mt-3 space-y-4">
                  {hasOptions && (
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const option = productOptions.find(
                          (o) => o.id === value,
                        );
                        if (option) {
                          handleSelectOption(option);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            product.optionLabel
                              ? `${product.optionLabel}을(를) 선택하세요`
                              : "옵션을 선택하세요"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {productOptions
                          .filter(
                            (option) =>
                              !selectedOptions.some(
                                (s) => s.option.id === option.id,
                              ),
                          )
                          .map((option) => (
                            <SelectItem
                              key={option.id}
                              value={option.id}
                              disabled={option.stock === 0}
                            >
                              {option.name}
                              {option.additionalPrice > 0 &&
                                ` (+${option.additionalPrice.toLocaleString()}원)`}
                              {option.stock === 0 && " (품절)"}
                              {option.stock != null &&
                                option.stock > 0 &&
                                option.stock <= 5 &&
                                ` (${option.stock}개 남음)`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  {hasOptions ? (
                    <SelectedOptionsList
                      selectedOptions={selectedOptions}
                      product={product}
                      onRemoveOption={handleRemoveOption}
                      onUpdateQuantity={handleUpdateQuantity}
                    />
                  ) : (
                    <SelectedOptionItem
                      item={{
                        option: {
                          id: "base",
                          name: product.name,
                          additionalPrice: 0,
                        },
                        quantity: baseQuantity,
                      }}
                      product={product}
                      onRemove={() => {}}
                      onUpdateQuantity={(delta) =>
                        handleUpdateBaseQuantity(delta, product.stock)
                      }
                      showCloseButton={false}
                    />
                  )}
                </div>
              </div>

              <div className="border-t border-stone-200 pt-2">
                <TieLengthGuideAccordion
                  notices={[
                    "• 제주/도서산간 지역 배송 시 추가 배송비 3,000원이 부과됩니다.",
                    "• 예상 수선 기간은 넥타이 확인 후 영업일 기준 10일입니다.",
                    "• 넥타이 확인 후 수선 진행 상태에서는 취소 및 환불이 불가능합니다.",
                    "• 수선 진행 전 취소 시, 택배비 3,000원을 제외한 금액을 환불해드립니다.",
                  ]}
                />

                <button
                  type="button"
                  onClick={handleInquiry}
                  className="focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-start justify-between gap-4 border-b py-4 text-left text-sm font-medium outline-none transition-all focus-visible:ring-[3px] hover:underline"
                >
                  문의하기
                  <ChevronRightIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5" />
                </button>
              </div>
            </div>
          }
          actionBar={
            <ShopActionBar
              like={{ count: likeCount, isLiked, onToggle: handleLikeToggle }}
              onAddToCart={handleAddToCart}
              onOrder={handleOrder}
              disabled={isProductSoldOut}
              orderLabel="구매하기"
              disabledLabel="품절"
              data-testid="product-order-now"
              data-cart-testid="product-add-to-cart"
            />
          }
        >
          <div className={isMobile ? "-mx-4" : undefined}>
            <Image
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              transformation={[
                {
                  width: 800,
                  height: 800,
                  quality: 85,
                },
              ]}
            />
          </div>
        </PageLayout>
        <MobilePurchaseSheet
          product={product}
          open={isPurchaseSheetOpen}
          onOpenChange={setIsPurchaseSheetOpen}
          selectedOptions={selectedOptions}
          baseQuantity={baseQuantity}
          handleSelectOption={handleSelectOption}
          handleRemoveOption={handleRemoveOption}
          handleUpdateQuantity={handleUpdateQuantity}
          handleUpdateBaseQuantity={handleUpdateBaseQuantity}
          resetOptions={resetOptions}
          isAddingToCart={isAddingToCart}
          onAddToCart={handleAddToCart}
          onOrder={handleOrder}
        />
      </MainContent>
    </MainLayout>
  );
}
