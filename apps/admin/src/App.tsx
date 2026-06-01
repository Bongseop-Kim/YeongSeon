import { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import { AdminHeader } from "@/components/AdminHeader";
import { AdminSider } from "@/components/AdminSider";
import { checkAdminAuth } from "@/providers/auth-provider";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import OrderList from "@/pages/orders/list";
import OrderShow from "@/pages/orders/show";
import ProductList from "@/pages/products/list";
import ProductCreate from "@/pages/products/create";
import ProductEdit from "@/pages/products/edit";
import CouponList from "@/pages/coupons/list";
import CouponCreate from "@/pages/coupons/create";
import CouponEdit from "@/pages/coupons/edit";
import ClaimList from "@/pages/claims/list";
import ClaimShow from "@/pages/claims/show";
import CustomerList from "@/pages/customers/list";
import CustomerShow from "@/pages/customers/show";
import InquiryList from "@/pages/inquiries/list";
import InquiryShow from "@/pages/inquiries/show";
import QuoteRequestList from "@/pages/quote-requests/list";
import QuoteRequestShow from "@/pages/quote-requests/show";
import SettingsPage from "@/pages/settings";
import PricingPage from "@/pages/pricing";
import GenerationLogList from "@/pages/generation-logs/list";
import GenerationLogDetailPage from "@/pages/generation-logs/detail";

function useAdminAuthCheck() {
  const [state, setState] = useState<{
    authenticated: boolean;
    loading: boolean;
  }>({
    authenticated: false,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    void checkAdminAuth()
      .then((authenticated) => {
        if (active) setState({ authenticated, loading: false });
      })
      .catch(() => {
        if (active) setState({ authenticated: false, loading: false });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}

function AuthLoading() {
  return <div className="adminAuthLoading">권한을 확인하는 중…</div>;
}

function ProtectedRoute() {
  const { authenticated, loading } = useAdminAuthCheck();

  if (loading) return <AuthLoading />;
  if (!authenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}

function LoginRoute() {
  const { authenticated, loading } = useAdminAuthCheck();

  if (loading) return <AuthLoading />;
  if (authenticated) return <Navigate to="/" replace />;

  return <LoginPage />;
}

function AppLayout() {
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [mobileSiderOpen, setMobileSiderOpen] = useState(false);

  return (
    <div className="adminLayout">
      <AdminSider
        collapsed={siderCollapsed}
        mobileOpen={mobileSiderOpen}
        onCollapsedChange={setSiderCollapsed}
        onMobileOpenChange={setMobileSiderOpen}
      />
      <div className="adminMainArea">
        <AdminHeader onMenuOpen={() => setMobileSiderOpen(true)} />
        <Outlet />
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/show/:id" element={<OrderShow />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/create" element={<ProductCreate />} />
          <Route path="/products/edit/:id" element={<ProductEdit />} />
          <Route path="/coupons" element={<CouponList />} />
          <Route path="/coupons/create" element={<CouponCreate />} />
          <Route path="/coupons/edit/:id" element={<CouponEdit />} />
          <Route path="/quote-requests" element={<QuoteRequestList />} />
          <Route
            path="/quote-requests/show/:id"
            element={<QuoteRequestShow />}
          />
          <Route path="/claims" element={<ClaimList />} />
          <Route path="/claims/show/:id" element={<ClaimShow />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/show/:id" element={<CustomerShow />} />
          <Route path="/inquiries" element={<InquiryList />} />
          <Route path="/inquiries/show/:id" element={<InquiryShow />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/generation-logs" element={<GenerationLogList />} />
          <Route
            path="/generation-logs/:id"
            element={<GenerationLogDetailPage />}
          />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="/login" element={<LoginRoute />} />
    </Routes>
  );
}

export default function App() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
