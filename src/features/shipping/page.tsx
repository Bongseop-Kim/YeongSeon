import { PageTitle } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ShippingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full relative">
      <div className="bg-stone-100 px-2 pb-4">
        <PageTitle className="text-base">배송지 정보</PageTitle>
        <Input
          placeholder="배송지 이름, 주소, 연락처로 검색하세요."
          className="bg-white"
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      <div className="px-2 py-4 pb-20">
        <Button
          className="w-full"
          variant="outline"
          onClick={() => navigate("/shipping/form")}
        >
          배송지 추가하기
        </Button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-2 py-4 bg-white border-t">
        <Button className="w-full">변경하기</Button>
      </div>
    </div>
  );
};

export default ShippingPage;
