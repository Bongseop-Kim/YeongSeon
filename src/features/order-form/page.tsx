import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import type { TieItem } from "@/features/reform/types/reform";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface OrderData {
  ties: TieItem[];
  bulkApply: {
    tieLength?: number;
    wearerHeight?: number;
    measurementType?: "length" | "height";
  };
  timestamp: string;
  totalCost: number;
}

const OrderFormPage = () => {
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [_, setPopup] = useState<Window | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedOrderData = localStorage.getItem("reformOrderData");

    if (savedOrderData) {
      try {
        const data = JSON.parse(savedOrderData) as OrderData;
        setOrderData(data);
      } catch (error) {
        console.error("주문 데이터 파싱 실패:", error);
        navigate("/reform");
      }
    } else {
      navigate("/reform");
    }

    setLoading(false);
  }, [navigate]);

  const handleCompleteOrder = () => {
    localStorage.removeItem("reformOrderData");
    alert("주문이 완료되었습니다!");
    navigate("/");
  };

  const openPopup = () => {
    const popup = window.open(
      "shipping",
      "popup",
      "width=430,height=650,left=200,top=100,scrollbars=yes,resizable=no"
    );
    setPopup(popup);
  };

  if (loading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex items-center justify-center min-h-96">
            <div>로딩 중...</div>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  if (!orderData) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
            <div>주문 데이터를 찾을 수 없습니다.</div>
            <Button onClick={() => navigate("/reform")}>
              수선 페이지로 돌아가기
            </Button>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent className="bg-stone-100">
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardHeader className="flex justify-between items-center">
                <CardTitle>김봉섭</CardTitle>
                <Button variant="outline" size="sm" onClick={openPopup}>
                  배송지 변경
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm ">
                  <p>대전 동구 가양동 418-25 영선산업</p>
                  <p>042-462-0510</p>
                </div>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="배송지 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">문 앞에 놔주세요.</SelectItem>
                    <SelectItem value="2">경비실에 맡겨 주세요.</SelectItem>
                    <SelectItem value="3">택배함에 넣어 주세요.</SelectItem>
                    <SelectItem value="4">배송 전에 연락 주세요.</SelectItem>
                    <SelectItem value="5">직접입력</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="최대 50자까지 입력 가능합니다."
                  className="min-h-[100px] resize-none"
                  maxLength={50}
                />
              </CardContent>

              <CardContent>
                <Separator />
              </CardContent>

              <CardHeader>
                <CardTitle>주문 상품</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderData.ties.map((tie) => (
                  <div
                    key={tie.id}
                    className="flex justify-between items-start"
                  >
                    <div className="text-sm text-stone-600 space-y-1">
                      <p>
                        측정 방식:{" "}
                        {tie.measurementType === "length"
                          ? "넥타이 길이"
                          : "착용자 키"}
                      </p>
                      {tie.measurementType === "length" && tie.tieLength && (
                        <p>넥타이 길이: {tie.tieLength}cm</p>
                      )}
                      {tie.measurementType === "height" && tie.wearerHeight && (
                        <p>착용자 키: {tie.wearerHeight}cm</p>
                      )}
                      {tie.notes && <p>메모: {tie.notes}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          }
          rightPanel={
            <Card>
              <CardHeader>
                <CardTitle>결제 금액</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">
                    수선비 ({orderData.ties.length}개)
                  </span>
                  <span>{(orderData.totalCost - 3000).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">배송비</span>
                  <span>3,000원</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>총 결제 금액</span>
                  <span className="text-blue-600">
                    {orderData.totalCost.toLocaleString()}원
                  </span>
                </div>
              </CardContent>
            </Card>
          }
          button={
            <Button onClick={handleCompleteOrder} className="w-full" size="lg">
              결제하기
            </Button>
          }
        />
      </MainContent>
    </MainLayout>
  );
};

export default OrderFormPage;
