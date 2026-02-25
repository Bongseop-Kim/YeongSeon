import React, { useContext } from "react";
import {
  Layout,
  Menu,
  Grid,
  Drawer,
  Button,
  theme,
  ConfigProvider,
  Tooltip,
} from "antd";
import {
  LogoutOutlined,
  UnorderedListOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  type TreeMenuItem,
  useTranslate,
  useLogout,
  CanAccess,
  useIsExistAuthentication,
  useMenu,
  useLink,
  useWarnAboutChange,
} from "@refinedev/core";
import { ThemedTitle, useThemedLayoutContext } from "@refinedev/antd";

import type { CSSProperties } from "react";

interface AdminSiderProps {
  Title?: React.FC<{ collapsed: boolean }>;
}

export const AdminSider: React.FC<AdminSiderProps> = ({ Title: TitleFromProps }) => {
  const { token } = theme.useToken();
  const {
    siderCollapsed,
    setSiderCollapsed,
    mobileSiderOpen,
    setMobileSiderOpen,
  } = useThemedLayoutContext();

  const isExistAuthentication = useIsExistAuthentication();
  const direction = useContext(ConfigProvider.ConfigContext)?.direction;
  const Link = useLink();
  const { warnWhen, setWarnWhen } = useWarnAboutChange();
  const translate = useTranslate();
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu();
  const breakpoint = Grid.useBreakpoint();
  const { mutate: mutateLogout } = useLogout();

  const isMobile =
    typeof breakpoint.lg === "undefined" ? false : !breakpoint.lg;

  const RenderToTitle = TitleFromProps ?? ThemedTitle;

  const renderTreeView = (tree: TreeMenuItem[], selectedKey?: string) => {
    return tree.map((item: TreeMenuItem) => {
      const { key, name, children, meta, list } = item;
      const parentName = meta?.parent;
      const label = item?.label ?? meta?.label ?? name;
      const icon = meta?.icon;
      const route = list;

      if (children.length > 0) {
        return (
          <CanAccess
            key={item.key}
            resource={name}
            action="list"
            params={{ resource: item }}
          >
            <Menu.SubMenu
              key={item.key}
              icon={icon ?? <UnorderedListOutlined />}
              title={label}
            >
              {renderTreeView(children, selectedKey)}
            </Menu.SubMenu>
          </CanAccess>
        );
      }

      const isSelected = key === selectedKey;
      const isRoute = !(parentName !== undefined && children.length === 0);
      const linkStyle: CSSProperties =
        isSelected ? { pointerEvents: "none" } : {};

      return (
        <CanAccess
          key={item.key}
          resource={name}
          action="list"
          params={{ resource: item }}
        >
          <Menu.Item
            key={item.key}
            icon={icon ?? (isRoute && <UnorderedListOutlined />)}
            style={linkStyle}
          >
            <Link to={route ?? ""} style={linkStyle}>
              {label}
            </Link>
            {!siderCollapsed && isSelected && (
              <div className="ant-menu-tree-arrow" />
            )}
          </Menu.Item>
        </CanAccess>
      );
    });
  };

  const handleLogout = () => {
    if (warnWhen) {
      const confirm = window.confirm(
        translate(
          "warnWhenUnsavedChanges",
          "Are you sure you want to leave? You have unsaved changes.",
        ),
      );
      if (confirm) {
        setWarnWhen(false);
        mutateLogout();
      }
    } else {
      mutateLogout();
    }
  };

  const items = renderTreeView(menuItems, selectedKey);

  const renderLogoutButton = (collapsed: boolean) => {
    if (!isExistAuthentication) return null;

    const button = (
      <Button
        type="text"
        danger
        block
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        aria-label="로그아웃"
        style={{
          minHeight: 44,
          minWidth: 44,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        {collapsed ? null : "로그아웃"}
      </Button>
    );

    if (collapsed) {
      return (
        <Tooltip title="로그아웃" placement="right">
          {button}
        </Tooltip>
      );
    }

    return button;
  };

  const renderSiderContent = (collapsed: boolean) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Title area */}
      <div
        style={{
          width: collapsed ? 80 : 200,
          padding: collapsed ? "0" : "0 16px",
          display: "flex",
          justifyContent: collapsed ? "center" : "flex-start",
          alignItems: "center",
          height: 64,
          backgroundColor: token.colorBgElevated,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        <RenderToTitle collapsed={collapsed} />
      </div>

      {/* Nav menu — scrollable */}
      <Menu
        selectedKeys={selectedKey ? [selectedKey] : []}
        defaultOpenKeys={defaultOpenKeys}
        mode="inline"
        style={{
          paddingTop: 8,
          border: "none",
          flex: 1,
          overflowY: "auto",
        }}
        onClick={() => {
          if (isMobile) setMobileSiderOpen(false);
        }}
      >
        {items}
      </Menu>

      {/* Logout area */}
      <div
        style={{
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          padding: collapsed ? "8px 4px" : "8px 12px",
          flexShrink: 0,
        }}
      >
        {renderLogoutButton(collapsed)}
      </div>
    </div>
  );

  const renderDrawerSider = () => (
    <Drawer
      open={mobileSiderOpen}
      onClose={() => setMobileSiderOpen(false)}
      placement={direction === "rtl" ? "right" : "left"}
      closable={false}
      width={200}
      styles={{ body: { padding: 0 } }}
      maskClosable
    >
      <Layout>
        <Layout.Sider
          style={{
            height: "100vh",
            backgroundColor: token.colorBgContainer,
            borderRight: `1px solid ${token.colorBgElevated}`,
          }}
        >
          {renderSiderContent(false)}
        </Layout.Sider>
      </Layout>
    </Drawer>
  );

  if (isMobile) {
    return renderDrawerSider();
  }

  const siderStyles: CSSProperties = {
    backgroundColor: token.colorBgContainer,
    borderRight: `1px solid ${token.colorBgElevated}`,
  };

  const renderClosingIcons = () => {
    const iconProps = { style: { color: token.colorPrimary } };
    const OpenIcon = direction === "rtl" ? RightOutlined : LeftOutlined;
    const CollapsedIcon = direction === "rtl" ? LeftOutlined : RightOutlined;
    const IconComponent = siderCollapsed ? CollapsedIcon : OpenIcon;
    return <IconComponent {...iconProps} />;
  };

  return (
    <Layout.Sider
      style={siderStyles}
      collapsible
      collapsed={siderCollapsed}
      onCollapse={(collapsed, type) => {
        if (type === "clickTrigger") {
          setSiderCollapsed(collapsed);
        }
      }}
      collapsedWidth={80}
      breakpoint="lg"
      trigger={
        <Button
          type="text"
          style={{
            borderRadius: 0,
            height: "100%",
            width: "100%",
            backgroundColor: token.colorBgElevated,
          }}
        >
          {renderClosingIcons()}
        </Button>
      }
    >
      {renderSiderContent(siderCollapsed)}
    </Layout.Sider>
  );
};
