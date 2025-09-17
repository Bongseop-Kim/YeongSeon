import DesignPage from "@/features/design/page";
import HomePage from "@/features/home/page";
import OrderFormPage from "@/features/order-form/page";
import OrderPage from "@/features/custom-order/page";
import ReformPage from "@/features/reform/page";
import ShippingFormPage from "@/features/shipping/form/page";
import ShippingPage from "@/features/shipping/page";
import { Route, Routes } from "react-router-dom";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/design" element={<DesignPage />} />
      <Route path="/custom-order" element={<OrderPage />} />
      <Route path="/reform" element={<ReformPage />} />
      <Route path="/order-form" element={<OrderFormPage />} />
      <Route path="/shipping" element={<ShippingPage />} />
      <Route path="/shipping/form" element={<ShippingFormPage />} />
    </Routes>
  );
}
