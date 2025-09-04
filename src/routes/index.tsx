import HomePage from "@/features/home/pages/HomePage";
import OrderPage from "@/features/order/pages/OrderPage";
import ReformPage from "@/features/reform/pages/ReformPage";
import { Route, Routes } from "react-router-dom";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/design" element={<HomePage />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="/reform" element={<ReformPage />} />
    </Routes>
  );
}
