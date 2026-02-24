import { Refine } from "@refinedev/core";
import { ThemedLayout, useNotificationProvider } from "@refinedev/antd";
import routerProvider from "@refinedev/react-router";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { App as AntdApp } from "antd";

import { authProvider } from "@/providers/auth-provider";
import { dataProvider } from "@/providers/data-provider";

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
              name: "orders",
              list: "/orders",
              meta: { label: "주문 관리" },
            },
            {
              name: "products",
              list: "/products",
              meta: { label: "상품 관리" },
            },
            {
              name: "coupons",
              list: "/coupons",
              meta: { label: "쿠폰 관리" },
            },
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
          }}
        >
          <Routes>
            <Route element={<AppLayout />}>
              <Route
                index
                element={<div>ESSE SION 관리자 대시보드</div>}
              />
              <Route path="/orders" element={<div>주문 목록 (준비중)</div>} />
              <Route
                path="/products"
                element={<div>상품 목록 (준비중)</div>}
              />
              <Route path="/coupons" element={<div>쿠폰 목록 (준비중)</div>} />
            </Route>
          </Routes>
        </Refine>
      </AntdApp>
    </BrowserRouter>
  );
}
