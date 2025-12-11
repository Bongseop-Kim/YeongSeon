import { Route, Routes } from "react-router-dom";
import DesignPage from "@/features/design/page";
import HomePage from "@/features/home/page";
import OrderFormPage from "@/features/order/order-form/page";
import OrderPage from "@/features/custom-order/page";
import ReformPage from "@/features/reform/page";
import ShopPage from "@/features/shop/page";
import ShopDetailPage from "@/features/shop/detail/page";
import ShippingFormPage from "@/features/shipping/form/page";
import ShippingPage from "@/features/shipping/page";
import MypagePage from "@/features/my-page/page";
import MyInfoPage from "@/features/my-page/my-info/page";
import MyInfoDetailPage from "@/features/my-page/my-info/detail/page";
import MyInfoEmailPage from "@/features/my-page/my-info/email/page";
import MyInfoNoticePage from "@/features/my-page/my-info/notice/page";
import MyInfoLeavePage from "@/features/my-page/my-info/leave/page";
import OrderListPage from "@/features/order/order-list/page";
import OrderDetailPage from "@/features/order/order-detail/[id]/page";
import ClaimListPage from "@/features/order/claim-list/page";
import ClaimFormPage from "@/features/order/claim/[type]/[orderId]/[itemId]/page";
import CartPage from "@/features/cart/page";
import FaqPage from "@/features/faq/page";
import InquiryPage from "@/features/my-page/inquiry/page";
import NoticePage from "@/features/notice/page";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/shop/:id" element={<ShopDetailPage />} />
      <Route path="/design" element={<DesignPage />} />
      <Route path="/custom-order" element={<OrderPage />} />
      <Route path="/reform" element={<ReformPage />} />

      <Route path="/cart" element={<CartPage />} />

      <Route path="/order/order-form" element={<OrderFormPage />} />
      <Route path="/order/order-list" element={<OrderListPage />} />
      <Route path="/order/order-detail/:id" element={<OrderDetailPage />} />
      <Route path="/order/claim-list" element={<ClaimListPage />} />
      <Route
        path="/order/claim/:type/:orderId/:itemId"
        element={<ClaimFormPage />}
      />

      <Route path="/shipping" element={<ShippingPage />} />
      <Route path="/shipping/form" element={<ShippingFormPage />} />
      <Route path="/my-page" element={<MypagePage />} />
      <Route path="/my-page/my-info" element={<MyInfoPage />} />
      <Route path="/my-page/my-info/detail" element={<MyInfoDetailPage />} />
      <Route path="/my-page/my-info/email" element={<MyInfoEmailPage />} />
      <Route path="/my-page/my-info/notice" element={<MyInfoNoticePage />} />
      <Route path="/my-page/my-info/leave" element={<MyInfoLeavePage />} />
      <Route path="/my-page/inquiry" element={<InquiryPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/notice" element={<NoticePage />} />
    </Routes>
  );
}
