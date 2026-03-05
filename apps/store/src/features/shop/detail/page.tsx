import { useParams, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { Image } from "@imagekit/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";
import { useSelectedOptions } from "@/features/shop/detail/hooks/useSelectedOptions";
import { ProductActionButtons } from "@/features/shop/detail/components/product-action-buttons";
import { MobilePurchaseSheet } from "@/features/shop/detail/components/mobile-purchase-sheet";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { SelectedOptionItem } from "@/features/shop/detail/components/selected-option-item";
import { SelectedOptionsList } from "@/features/shop/detail/components/selected-options-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product } from "@yeongseon/shared/types/view/product";
import type { SelectedOption } from "@/features/shop/detail/types/selected-option";
import { Badge } from "@/components/ui/badge";
import {
  getCategoryLabel,
  getColorLabel,
  getMaterialLabel,
  getPatternLabel,
} from "@/features/shop/constants/PRODUCT_LABELS";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { HEIGHT_GUIDE } from "@/constants/HEIGHT_GUIDE";
import { ProductCard } from "@/features/shop/components/product-card";
import { useMemo } from "react";
import { useAddToCartItems } from "@/features/cart/hooks/useAddToCartItems";
import { useOrderStore } from "@/store/order";
import { useModalStore } from "@/store/modal";
import type { CartItem } from "@yeongseon/shared/types/view/cart";
import { generateItemId } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useProduct, useProducts } from "@/features/shop/api/products-query";
import { useToggleLike } from "@/features/shop/api/likes-query";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * 주문 처리 및 네비게이션을 수행하는 공통 헬퍼 함수
 * CartItem 변환, 옵션 검증, 주문 상태 설정, 네비게이션을 처리합니다.
 */
function processOrderAndNavigate(
  product: Product,
  hasOptions: boolean,
  selectedOptions: SelectedOption[],
  baseQuantity: number,
  setOrderItems: (items: CartItem[]) => void,
  navigate: (path: string) => void
): void {
  if (hasOptions) {
    // 옵션이 있는 경우: 선택된 옵션이 있는지 확인
    if (selectedOptions.length === 0) {
      toast.warning("옵션을 선택해주세요.");
      return;
    }

    // SelectedOption[]을 CartItem[]로 변환
    const orderItems: CartItem[] = selectedOptions.map((selectedOption) => ({
      id: generateItemId(product.id, selectedOption.option.id),
      type: "product",
      product,
      selectedOption: selectedOption.option,
      quantity: selectedOption.quantity,
    }));

    setOrderItems(orderItems);
  } else {
    // 옵션이 없는 경우
    const orderItems: CartItem[] = [
      {
        id: generateItemId(product.id, "base"),
        type: "product",
        product,
        selectedOption: undefined,
        quantity: baseQuantity,
      },
    ];

    setOrderItems(orderItems);
  }

  navigate(ROUTES.ORDER_FORM);
}

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { addItemsToCart } = useAddToCartItems();
  const { openModal } = useModalStore();
  const { setOrderItems } = useOrderStore();
  const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);
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

  const { data: categoryProducts = [], isLoading: isCategoryLoading } = useProducts(
    {
      categories: product ? [product.category] : [],
      limit: SIMILAR_LIMIT + 1,
    },
    { enabled: !!product }
  );

  const filteredSimilar = useMemo(
    () =>
      categoryProducts
        .filter((p) => p.id !== product?.id)
        .slice(0, SIMILAR_LIMIT),
    [categoryProducts, product?.id, SIMILAR_LIMIT]
  );
  const needsFallback = !isCategoryLoading && filteredSimilar.length === 0;
  const { data: fallbackProducts = [], isLoading: isFallbackLoading } = useProducts(
    { sortOption: "latest", limit: SIMILAR_LIMIT },
    { enabled: !!product && needsFallback }
  );
  const similarProducts = filteredSimilar.length > 0 ? filteredSimilar : fallbackProducts;
  const isSimilarLoading = isCategoryLoading || (needsFallback && isFallbackLoading);
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

    if (hasOptions && selectedOptions.length === 0) {
      toast.warning("옵션을 선택해주세요.");
      return;
    }

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
      toast.warning(`일부 옵션을 장바구니에 추가하지 못했습니다. (${succeeded}/${total}개 추가됨)`);
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
  };

  const handleOrder = () => {
    if (!product) return;

    if (isMobile) {
      setIsPurchaseSheetOpen(true);
      return;
    }

    processOrderAndNavigate(
      product,
      hasOptions,
      selectedOptions,
      baseQuantity,
      setOrderItems,
      navigate
    );
  };

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <PageLayout
          detail={
            <div>
              {/* 유사한 상품 섹션 */}
              {showSimilarSection && (
                <Card className="bg-zinc-100">
                  <CardHeader>
                    <CardTitle>유사한 상품</CardTitle>
                    <CardDescription>
                      이 상품과 비슷한 다른 상품들을 확인해보세요
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div
                      className={`grid ${isMobile ? "grid-cols-3" : "grid-cols-4"
                        }`}
                    >
                      {isSimilarLoading
                        ? Array.from({ length: SIMILAR_LIMIT }).map((_, index) => (
                          <Skeleton key={`similar-skeleton-${index}`} className="aspect-square w-full" />
                        ))
                        : similarProducts.map((similarProduct) => (
                          <ProductCard
                            key={similarProduct.id}
                            product={similarProduct}
                          />
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 상세 이미지들 */}
              {product.detailImages && product.detailImages.length > 0 ? (
                product.detailImages.map((detailImage, index) => (
                  <Image
                    key={index}
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
                // detailImages가 없을 경우 기본 이미지 표시 (하위 호환성)
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
          }
          sidebar={
            <Card>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.code}</CardDescription>
                {isProductSoldOut && (
                  <Badge variant="destructive">품절</Badge>
                )}
                {!hasOptions && product.stock != null && product.stock > 0 && product.stock <= 5 && (
                  <Badge variant="secondary">{product.stock}개 남음</Badge>
                )}

                <div className="flex items-center gap-2">
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
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 옵션 선택 */}
                {hasOptions && (
                  <Select
                    value=""
                    onValueChange={(value) => {
                      const option = productOptions.find((o) => o.id === value);
                      if (option) {
                        handleSelectOption(option);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="길이를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions
                        .filter(
                          (option) =>
                            !selectedOptions.some((s) => s.option.id === option.id)
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
                            {option.stock != null && option.stock > 0 && option.stock <= 5 &&
                              ` (${option.stock}개 남음)`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}

                {/* 선택된 옵션 목록 (옵션이 있을 때) */}
                {hasOptions && (
                  <SelectedOptionsList
                    selectedOptions={selectedOptions}
                    product={product}
                    onRemoveOption={handleRemoveOption}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                )}

                {/* 수량 선택 (옵션이 없을 때) */}
                {!hasOptions && (
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
                    onRemove={() => { }}
                    onUpdateQuantity={(delta) =>
                      handleUpdateBaseQuantity(delta, product.stock)
                    }
                    showCloseButton={false}
                  />
                )}

                <Separator />
                <CardDescription className="whitespace-pre-line">
                  {product.info}
                </CardDescription>
                <Separator />

                <div>
                  <Accordion type="single" collapsible>
                    <AccordionItem value="item-1">
                      <AccordionTrigger>내게 맞는 넥타이 길이</AccordionTrigger>
                      <AccordionContent className="text-zinc-600">
                        <DataTable
                          headers={["키", "권장 길이"]}
                          data={HEIGHT_GUIDE.map((guide) => ({
                            키: guide.height,
                            "권장 길이": guide.length,
                          }))}
                          size="sm"
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Accordion type="single" collapsible>
                    <AccordionItem value="item-1">
                      <AccordionTrigger>유의사항</AccordionTrigger>
                      <AccordionContent className="text-zinc-600">
                        <p>
                          • 제주/도서산간 지역 배송 시 추가 배송비 3,000원이
                          부과됩니다.
                        </p>
                        <p>
                          • 예상 수선 기간은 넥타이 확인 후 영업일 기준
                          10일입니다.
                        </p>
                        <p>
                          • 넥타이 확인 후 수선 진행 상태에서는 취소 및 환불이
                          불가능합니다.
                        </p>
                        <p>
                          • 수선 진행 전 취소 시, 택배비 3,000원을 제외한 금액을
                          환불해드립니다.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            </Card>
          }
          actionBar={
            <ProductActionButtons
              likes={likeCount}
              isLiked={isLiked}
              onLikeToggle={handleLikeToggle}
              onAddToCart={handleAddToCart}
              onOrder={handleOrder}
              disabled={isProductSoldOut}
            />
          }
        >
            <div>
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
          onProcessOrder={(selectedOptions, baseQuantity) =>
            processOrderAndNavigate(
              product,
              hasOptions,
              selectedOptions,
              baseQuantity,
              setOrderItems,
              navigate
            )
          }
          selectedOptions={selectedOptions}
          baseQuantity={baseQuantity}
          handleSelectOption={handleSelectOption}
          handleRemoveOption={handleRemoveOption}
          handleUpdateQuantity={handleUpdateQuantity}
          handleUpdateBaseQuantity={handleUpdateBaseQuantity}
          resetOptions={resetOptions}
        />
      </MainContent>
    </MainLayout>
  );
}
