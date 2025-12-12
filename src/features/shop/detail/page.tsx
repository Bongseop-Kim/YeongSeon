import { useParams, useNavigate } from "react-router-dom";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { PRODUCTS_DATA } from "../constants/PRODUCTS_DATA";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
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
import { ProductActionButtons } from "./components/product-action-buttons";
import { MobilePurchaseSheet } from "./components/mobile-purchase-sheet";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { SelectedOptionItem } from "./components/selected-option-item";
import { SelectedOptionsList } from "./components/selected-options-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductOption, Product } from "../types/product";
import { Badge } from "@/components/ui/badge";
import {
  getCategoryLabel,
  getColorLabel,
  getMaterialLabel,
  getPatternLabel,
} from "../constants/PRODUCT_LABELS";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { HEIGHT_GUIDE } from "@/features/reform/constants/DETAIL";
import { ProductCard } from "../components/product-card";
import { useMemo } from "react";
import { useCartStore } from "@/store/cart";
import { useModalStore } from "@/store/modal";
import { useOrderStore } from "@/store/order";
import type { CartItem } from "@/types/cart";
import { generateItemId } from "@/lib/utils";

interface SelectedOption {
  option: ProductOption;
  quantity: number;
}

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
  navigate: (path: string) => void,
  alert: (message: string) => void
): void {
  if (hasOptions) {
    // 옵션이 있는 경우: 선택된 옵션이 있는지 확인
    if (selectedOptions.length === 0) {
      alert("옵션을 선택해주세요.");
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

  navigate(`/order/order-form`);
}

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const { addToCart } = useCartStore();
  const { alert } = useModalStore();
  const { setOrderItems } = useOrderStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isPurchaseSheetOpen, setIsPurchaseSheetOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [baseQuantity, setBaseQuantity] = useState(1);

  const product = PRODUCTS_DATA.find((p) => p.id === Number(id));

  const hasOptions = !!(product?.options && product.options.length > 0);

  // 유사한 상품 찾기 (같은 카테고리, 색상, 패턴, 재질 중 하나 이상 일치)
  const similarProducts = useMemo(() => {
    if (!product) return [];

    return PRODUCTS_DATA.filter((p) => {
      if (p.id === product.id) return false; // 현재 상품 제외

      // 하나 이상의 속성이 일치하면 유사 상품으로 간주
      return (
        p.category === product.category ||
        p.color === product.color ||
        p.pattern === product.pattern ||
        p.material === product.material
      );
    }).slice(0, isMobile ? 3 : 4); // 최대 4개만 표시
  }, [product]);

  const handleSelectOption = (option: ProductOption) => {
    const exists = selectedOptions.find((s) => s.option.id === option.id);
    if (!exists) {
      setSelectedOptions([...selectedOptions, { option, quantity: 1 }]);
    }
  };

  const handleRemoveOption = (optionId: string) => {
    setSelectedOptions(selectedOptions.filter((s) => s.option.id !== optionId));
  };

  const handleUpdateQuantity = (optionId: string, delta: number) => {
    setSelectedOptions(
      selectedOptions.map((s) =>
        s.option.id === optionId
          ? { ...s, quantity: Math.max(1, s.quantity + delta) }
          : s
      )
    );
  };

  const handleUpdateBaseQuantity = (delta: number) => {
    setBaseQuantity(Math.max(1, baseQuantity + delta));
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (hasOptions) {
      // 옵션이 있는 경우: 선택된 옵션이 있는지 확인
      if (selectedOptions.length === 0) {
        alert("옵션을 선택해주세요.");
        return;
      }

      // 선택된 각 옵션을 장바구니에 추가
      selectedOptions.forEach((selectedOption) => {
        addToCart(product, {
          option: selectedOption.option,
          quantity: selectedOption.quantity,
        });
      });

      // 옵션 초기화
      setSelectedOptions([]);
    } else {
      // 옵션이 없는 경우: baseQuantity로 추가
      addToCart(product, { quantity: baseQuantity });

      // 수량 초기화
      setBaseQuantity(1);
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
      hasOptions,
      selectedOptions,
      baseQuantity,
      setOrderItems,
      navigate,
      alert
    );
  };

  if (!product) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-zinc-500 mb-4">상품을 찾을 수 없습니다.</p>
            <Button onClick={() => navigate("/shop")}>쇼핑 계속하기</Button>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent className="overflow-visible">
        <TwoPanelLayout
          leftPanel={
            <div>
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          }
          detail={
            <div>
              {/* 유사한 상품 섹션 */}
              {similarProducts.length > 0 && (
                <Card className="bg-zinc-100">
                  <CardHeader>
                    <CardTitle>유사한 상품</CardTitle>
                    <CardDescription>
                      이 상품과 비슷한 다른 상품들을 확인해보세요
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div
                      className={`grid ${
                        isMobile ? "grid-cols-3" : "grid-cols-4"
                      }`}
                    >
                      {similarProducts.map((similarProduct) => (
                        <ProductCard
                          key={similarProduct.id}
                          product={similarProduct}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <img
                src={product.image}
                alt={`${product.name} 상세 이미지 1`}
                className="w-full h-auto object-contain"
              />

              <img
                src={product.image}
                alt={`${product.name} 상세 이미지 2`}
                className="w-full h-auto object-contain"
              />
            </div>
          }
          rightPanel={
            <Card>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.code}</CardDescription>

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
                      const option = product.options!.find(
                        (o) => o.id === value
                      );
                      if (option) {
                        handleSelectOption(option);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="길이를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {product
                        .options!.filter(
                          (option) =>
                            !selectedOptions.some(
                              (s) => s.option.id === option.id
                            )
                        )
                        .map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                            {option.additionalPrice > 0 &&
                              ` (+${option.additionalPrice.toLocaleString()}원)`}
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
                    onRemove={() => {}}
                    onUpdateQuantity={(delta) =>
                      handleUpdateBaseQuantity(delta)
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
          button={
            <ProductActionButtons
              likes={product.likes}
              isLiked={isLiked}
              onLikeToggle={() => setIsLiked(!isLiked)}
              onAddToCart={handleAddToCart}
              onOrder={handleOrder}
            />
          }
        />
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
              navigate,
              alert
            )
          }
        />
      </MainContent>
    </MainLayout>
  );
}
