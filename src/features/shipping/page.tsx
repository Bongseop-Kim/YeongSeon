import { PopupLayout } from "@/components/layout/popup-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ShippingPage = () => {
  const navigate = useNavigate();

  return (
    <PopupLayout
      title="배송지 정보"
      onClose={() => window.close()}
      headerContent={
        <Input
          placeholder="배송지 이름, 주소, 연락처로 검색하세요."
          className="bg-white"
          icon={<Search className="w-4 h-4" />}
        />
      }
      footer={<Button className="w-full">변경하기</Button>}
    >
      <Button
        className="w-full"
        variant="outline"
        onClick={() => navigate("/shipping/form")}
      >
        배송지 추가하기
      </Button>
    </PopupLayout>
  );
};

export default ShippingPage;
