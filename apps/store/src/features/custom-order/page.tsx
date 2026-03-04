import { MainLayout, MainContent } from "@/components/layout/main-layout";
import { CustomOrderContent } from "./components/custom-order-content";

const OrderPage = () => (
  <MainLayout>
    <MainContent className="overflow-visible">
      <CustomOrderContent />
    </MainContent>
  </MainLayout>
);

export default OrderPage;
