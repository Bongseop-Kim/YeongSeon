import { useState } from "react";
import { Modal, Space, Switch, Input, Table, Tag } from "antd";
import { usePresetCustomers, useFilteredUsers } from "../api/coupons-query";
import { PRESET_LABELS } from "../types/admin-coupon";
import type { PresetKey } from "../types/admin-coupon";

type IssueCouponModalProps = {
  open: boolean;
  onClose: () => void;
  couponId: string | undefined;
  onIssue: (userIds: string[]) => Promise<boolean>;
  issuing: boolean;
};

export function IssueCouponModal({
  open,
  onClose,
  couponId,
  onIssue,
  issuing,
}: IssueCouponModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("all");
  const [excludeIssuedUsers, setExcludeIssuedUsers] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<React.Key[]>([]);

  const { users, loading } = usePresetCustomers(couponId, open, selectedPreset, excludeIssuedUsers);
  const filteredUsers = useFilteredUsers(users, keyword);

  const handleOk = async () => {
    const targetIds = selectedUserIds.map(String);
    if (!targetIds.length) {
      const { message } = await import("antd");
      message.warning("발급할 고객을 선택해주세요.");
      return;
    }
    const ok = await onIssue(targetIds);
    if (ok) {
      setSelectedUserIds([]);
      setKeyword("");
      onClose();
    }
  };

  return (
    <Modal
      title="쿠폰 발급"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="선택 발급"
      cancelText="취소"
      confirmLoading={issuing}
      width="90vw"
      style={{ maxWidth: 860 }}
    >
      <Space wrap style={{ marginBottom: 12 }}>
        {(Object.keys(PRESET_LABELS) as PresetKey[]).map((preset) => (
          <Tag.CheckableTag
            key={preset}
            checked={selectedPreset === preset}
            onChange={(checked) => {
              if (checked) {
                setSelectedPreset(preset);
                setSelectedUserIds([]);
              }
            }}
          >
            {PRESET_LABELS[preset]}
          </Tag.CheckableTag>
        ))}
      </Space>

      <Space style={{ display: "block", marginBottom: 12 }}>
        <Switch
          checked={excludeIssuedUsers}
          onChange={(val) => {
            setExcludeIssuedUsers(val);
            setSelectedUserIds([]);
          }}
        />
        <span>중복 발급 방지</span>
      </Space>

      <Input.Search
        value={keyword}
        placeholder="고객명 검색"
        onChange={(e) => setKeyword(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />

      <div style={{ marginBottom: 8 }}>{selectedUserIds.length}명 선택됨</div>

      <Table
        loading={loading}
        dataSource={filteredUsers}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 10 }}
        rowSelection={{
          selectedRowKeys: selectedUserIds,
          onChange: setSelectedUserIds,
        }}
      >
        <Table.Column dataIndex="name" title="이름" />
        <Table.Column dataIndex="phone" title="전화번호" />
      </Table>
    </Modal>
  );
}