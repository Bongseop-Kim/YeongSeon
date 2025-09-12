import DesignPage from "@/features/design/page";
import HomePage from "@/features/home/page";
import OrderPage from "@/features/order/page";
import ReformPage from "@/features/reform/page";
import { Route, Routes } from "react-router-dom";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/design" element={<DesignPage />} />
      <Route path="/order" element={<OrderPage />} />
      <Route path="/reform" element={<ReformPage />} />
    </Routes>
  );
}
