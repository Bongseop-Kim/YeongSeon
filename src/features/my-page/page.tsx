import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRightIcon } from "lucide-react";
import { ListItem } from "./components/list-item";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function MypagePage() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardHeader>
                <CardTitle>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => navigate("/my-page/my-info")}
                    aria-label="내 정보로 이동"
                  >
                    김봉섭{" "}
                    <ChevronRightIcon className="size-4" aria-hidden="true" />
                  </button>
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="space-y-2">
                <div>
                  <ListItem
                    label="주문 내역"
                    onClick={() => {
                      navigate("/order/order-list");
                    }}
                  />
                  <ListItem
                    label="취소 내역"
                    onClick={() => {
                      navigate("/order/claim-list");
                    }}
                  />
                  <ListItem
                    label="고객센터"
                    onClick={() => {
                      navigate("/customer-service");
                    }}
                  />
                  <ListItem
                    label="1:1 문의 내역"
                    onClick={() => {
                      navigate("/my-page/inquiry");
                    }}
                  />
                  <ListItem
                    label="공지사항"
                    onClick={() => {
                      navigate("/notice");
                    }}
                  />
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm">
                    로그아웃
                  </Button>
                </div>
              </CardContent>
            </Card>
          }
        />
      </MainContent>
    </MainLayout>
  );
}
