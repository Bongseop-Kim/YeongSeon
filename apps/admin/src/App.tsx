import { Refine, Authenticated } from "@refinedev/core";
import { ThemedLayout, useNotificationProvider } from "@refinedev/antd";
import routerProvider from "@refinedev/react-router";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { App as AntdApp } from "antd";
import {
  ShoppingOutlined,
  SkinOutlined,
  TagOutlined,
  ExceptionOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  DashboardOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import { authProvider } from "@/providers/auth-provider";
import { dataProvider } from "@/providers/data-provider";

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
import SettingsPage from "@/pages/settings";

import "@refinedev/antd/dist/reset.css";

function AppLayout() {
  return (
    <ThemedLayout>
      <Outlet />
    </ThemedLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AntdApp>
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider}
          authProvider={authProvider}
          notificationProvider={useNotificationProvider}
          resources={[
            {
              name: "dashboard",
              list: "/",
              meta: { label: "대시보드", icon: <DashboardOutlined /> },
            },
            {
              name: "admin_order_list_view",
              list: "/orders",
              show: "/orders/show/:id",
              meta: { label: "주문 관리", icon: <ShoppingOutlined /> },
            },
            {
              name: "products",
              list: "/products",
              create: "/products/create",
              edit: "/products/edit/:id",
              meta: { label: "상품 관리", icon: <SkinOutlined /> },
            },
            {
              name: "coupons",
              list: "/coupons",
              create: "/coupons/create",
              edit: "/coupons/edit/:id",
              meta: { label: "쿠폰 관리", icon: <TagOutlined /> },
            },
            {
              name: "admin_claim_list_view",
              list: "/claims",
              show: "/claims/show/:id",
              meta: { label: "클레임 관리", icon: <ExceptionOutlined /> },
            },
            {
              name: "profiles",
              list: "/customers",
              show: "/customers/show/:id",
              meta: { label: "고객 관리", icon: <TeamOutlined /> },
            },
            {
              name: "inquiries",
              list: "/inquiries",
              show: "/inquiries/show/:id",
              meta: { label: "문의 관리", icon: <QuestionCircleOutlined /> },
            },
            {
              name: "admin_settings",
              list: "/settings",
              meta: { label: "설정", icon: <SettingOutlined /> },
            },
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
          }}
        >
          <Routes>
            <Route
              element={
                <Authenticated
                  key="auth"
                  fallback={<Navigate to="/login" />}
                >
                  <AppLayout />
                </Authenticated>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="/orders" element={<OrderList />} />
              <Route path="/orders/show/:id" element={<OrderShow />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/create" element={<ProductCreate />} />
              <Route path="/products/edit/:id" element={<ProductEdit />} />
              <Route path="/coupons" element={<CouponList />} />
              <Route path="/coupons/create" element={<CouponCreate />} />
              <Route path="/coupons/edit/:id" element={<CouponEdit />} />
              <Route path="/claims" element={<ClaimList />} />
              <Route path="/claims/show/:id" element={<ClaimShow />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/customers/show/:id" element={<CustomerShow />} />
              <Route path="/inquiries" element={<InquiryList />} />
              <Route path="/inquiries/show/:id" element={<InquiryShow />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route
              path="/login"
              element={
                <Authenticated key="login" fallback={<LoginPage />}>
                  <Navigate to="/" />
                </Authenticated>
              }
            />
          </Routes>
        </Refine>
      </AntdApp>
    </BrowserRouter>
  );
}
