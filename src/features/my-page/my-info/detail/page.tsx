import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

export default function MyInfoDetailPage() {
  const navigate = useNavigate();

  const data = {
    name: "김봉섭",
    birth: "1990-01-01",
    phone: "010-1234-5678",
    email: "kim@example.com",
  };

  return (
    <MainLayout>
      <MainContent className="bg-stone-100">
        <TwoPanelLayout
          leftPanel={
            <Card>
              <CardHeader />
              <CardContent className="space-y-4">
                <Item label="이름" value={data.name} />
                <Item label="생년월일" value={data.birth} />
                <Item label="휴대폰번호" value={data.phone} />
                <Item label="이메일" value={data.email} />
              </CardContent>

              <div className="flex gap-2 mt-4 px-4">
                <Button variant="outline" className="flex-1">
                  회원정보 변경
                </Button>

                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigate("/my-page/my-info/email");
                  }}
                >
                  이메일 변경
                </Button>
              </div>
            </Card>
          }
        />
      </MainContent>
    </MainLayout>
  );
}

const Item = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex gap-2">
      <Label className="w-20 font-bold">{label}</Label>
      <Label>{value}</Label>
    </div>
  );
};
