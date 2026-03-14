import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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
import OrderDetailPage from "@/features/order/detail/page";
import ClaimListPage from "@/features/claim/claim-list/page";
import ClaimFormPage from "@/features/claim/claim-form/page";
import PaymentSuccessPage from "@/features/payment/success/page";
import PaymentFailPage from "@/features/payment/fail/page";
import TokenPurchasePage from "@/features/token-purchase/page";
import TokenPurchaseSuccessPage from "@/features/token-purchase/success/page";
import TokenPurchaseFailPage from "@/features/token-purchase/fail/page";
import CartPage from "@/features/cart/page";
import FaqPage from "@/features/faq/page";
import InquiryPage from "@/features/my-page/inquiry/page";
import TokenHistoryPage from "@/features/my-page/token-history/page";
import NoticePage from "@/features/notice/page";
import PrivacyPolicyPage from "@/features/privacy-policy/page";
import TermsOfServicePage from "@/features/terms-of-service/page";
import RefundPolicyPage from "@/features/refund-policy/page";
import LoginPage from "@/features/auth/login/page";
import AuthCallbackPage from "@/features/auth/callback/page";
import { ProtectedRoute } from "@/components/composite/protected-route";

const QuoteRequestListPage = lazy(
  () => import("@/features/my-page/quote-request/page"),
);
const QuoteRequestDetailPage = lazy(
  () => import("@/features/my-page/quote-request/detail/page"),
);

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/shop/:id" element={<ShopDetailPage />} />
      <Route
        path="/design"
        element={
          <ProtectedRoute>
            <DesignPage />
          </ProtectedRoute>
        }
      />
      <Route path="/custom-order" element={<OrderPage />} />
      <Route path="/reform" element={<ReformPage />} />
      <Route path="/cart" element={<CartPage />} />

      <Route
        path="/order/order-form"
        element={
          <ProtectedRoute>
            <OrderFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/order-list"
        element={
          <ProtectedRoute>
            <OrderListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/:id"
        element={
          <ProtectedRoute>
            <OrderDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/claim-list"
        element={
          <ProtectedRoute>
            <ClaimListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/payment/success"
        element={
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/payment/fail"
        element={
          <ProtectedRoute>
            <PaymentFailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/claim/:type/:orderId/:itemId"
        element={
          <ProtectedRoute>
            <ClaimFormPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipping"
        element={
          <ProtectedRoute>
            <ShippingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/shipping/form"
        element={
          <ProtectedRoute>
            <ShippingFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page"
        element={
          <ProtectedRoute>
            <MypagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page/my-info"
        element={
          <ProtectedRoute>
            <MyInfoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page/my-info/detail"
        element={
          <ProtectedRoute>
            <MyInfoDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page/my-info/email"
        element={
          <ProtectedRoute>
            <MyInfoEmailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page/my-info/notice"
        element={
          <ProtectedRoute>
            <MyInfoNoticePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page/my-info/leave"
        element={
          <ProtectedRoute>
            <MyInfoLeavePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page/inquiry"
        element={
          <ProtectedRoute>
            <InquiryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page/token-history"
        element={
          <ProtectedRoute>
            <TokenHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page/quote-request"
        element={
          <ProtectedRoute>
            <Suspense fallback={null}>
              <QuoteRequestListPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-page/quote-request/:id"
        element={
          <ProtectedRoute>
            <Suspense fallback={null}>
              <QuoteRequestDetailPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/token/purchase"
        element={
          <ProtectedRoute>
            <TokenPurchasePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/token/purchase/success"
        element={
          <ProtectedRoute>
            <TokenPurchaseSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/token/purchase/fail"
        element={
          <ProtectedRoute>
            <TokenPurchaseFailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/notice" element={<NoticePage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/refund-policy" element={<RefundPolicyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
