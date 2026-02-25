import { Button, theme } from "antd";
import { BarsOutlined } from "@ant-design/icons";
import { useResourceParams } from "@refinedev/core";
import { useThemedLayoutContext } from "@refinedev/antd";
import { useIsMobile } from "@/hooks/useIsMobile";

export const AdminHeader: React.FC = () => {
  const isMobile = useIsMobile();
  const { token } = theme.useToken();
  const { setMobileSiderOpen } = useThemedLayoutContext();
  const { resource } = useResourceParams();

  if (!isMobile) return null;

  const label = (resource?.meta?.label as string) ?? "";

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        height: 48,
        padding: "0 12px",
        backgroundColor: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Button
        type="text"
        icon={<BarsOutlined />}
        onClick={() => setMobileSiderOpen(true)}
        aria-label="메뉴 열기"
        style={{ marginRight: 8 }}
      />
      <span style={{ fontWeight: 600, fontSize: 16 }}>{label}</span>
    </div>
  );
};
