import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import DesignPage from "@/pages/design";
import HomePage from "@/pages/home";
import OrderFormPage from "@/pages/order/order-form";
import OrderPage from "@/pages/custom-order";
import SampleOrderPage from "@/pages/sample-order";
import ReformPage from "@/pages/reform";
import { ShopPage } from "@/features/shop";
import ShopDetailPage from "@/pages/shop/detail";
import ShippingFormPage from "@/pages/shipping/form";
import { ShippingPage } from "@/features/shipping";
import MypagePage from "@/pages/my-page";
import MyInfoPage from "@/pages/my-page/my-info";
import MyInfoDetailPage from "@/pages/my-page/my-info/detail";
import MyInfoEmailPage from "@/pages/my-page/my-info/email";
import MyInfoNoticePage from "@/pages/my-page/my-info/notice";
import MyInfoLeavePage from "@/pages/my-page/my-info/leave";
import OrderListPage from "@/pages/order/order-list";
import OrderDetailPage from "@/pages/order/detail";
import RepairShippingPage from "@/pages/order/repair-shipping";
import { OrderCheckoutPage as CustomPaymentPage } from "@/widgets/checkout";
import { SampleOrderCheckoutPage as SamplePaymentPage } from "@/widgets/checkout";
import ClaimListPage from "@/pages/claim/list";
import ClaimFormPage from "@/pages/claim/form";
import ClaimDetailPage from "@/pages/claim/detail";
import PaymentSuccessPage from "@/pages/payment/success";
import PaymentFailPage from "@/pages/payment/fail";
import TokenPurchasePage from "@/pages/token-purchase";
import { TokenPaymentWidget as TokenPurchasePaymentPage } from "@/widgets/token-payment";
import TokenPurchaseSuccessPage from "@/pages/token-purchase/success";
import TokenPurchaseFailPage from "@/pages/token-purchase/fail";
import { CartCheckoutPage as CartPage } from "@/widgets/cart-checkout";
import { FaqPage } from "@/features/faq";
import InquiryPage from "@/pages/my-page/inquiry";
import TokenHistoryPage from "@/pages/my-page/token-history";
import NoticePage from "@/pages/notice";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import RefundPolicyPage from "@/pages/refund-policy";
import LoginPage from "@/pages/auth/login";
import AuthCallbackPage from "@/pages/auth/callback";
import { ProtectedRoute } from "@/app/router/protected-route";

const QuoteRequestListPage = lazy(
  () => import("@/pages/my-page/quote-request"),
);
const QuoteRequestDetailPage = lazy(
  () => import("@/pages/my-page/quote-request/detail"),
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
      <Route path="/sample-order" element={<SampleOrderPage />} />
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
        path="/order/custom-payment"
        element={
          <ProtectedRoute>
            <CustomPaymentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/order/sample-payment"
        element={
          <ProtectedRoute>
            <SamplePaymentPage />
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
        path="/order/repair-shipping/:orderId"
        element={
          <ProtectedRoute>
            <RepairShippingPage />
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
        path="/order/claim-detail/:claimId"
        element={
          <ProtectedRoute>
            <ClaimDetailPage />
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
        path="/token/purchase/payment"
        element={
          <ProtectedRoute>
            <TokenPurchasePaymentPage />
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
