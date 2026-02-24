import { Edit, useForm } from "@refinedev/antd";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Button,
  Modal,
  Table,
  Tag,
  Space,
  message,
} from "antd";
import { useInvalidate, useList } from "@refinedev/core";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

type CouponUser = {
  id: string;
  name: string | null;
  phone: string | null;
  birth: string | null;
  created_at: string | null;
};

type IssuedCouponRow = {
  id: string;
  userId?: string | null;
  couponId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  status?: string | null;
  issuedAt?: string | null;
};

type PresetKey =
  | "all"
  | "new30"
  | "birthdayThisMonth"
  | "purchased"
  | "notPurchased"
  | "dormant";

const PRESET_LABELS: Record<PresetKey, string> = {
  all: "전체 고객",
  new30: "신규 가입 (30일)",
  birthdayThisMonth: "생일 고객 (이번 달)",
  purchased: "구매 고객",
  notPurchased: "미구매 고객",
  dormant: "휴면 고객",
};

export default function CouponEdit() {
  const { formProps, saveButtonProps, id } = useForm({
    resource: "coupons",
    redirect: "list",
  });

  const invalidate = useInvalidate();
  const [modal, modalContextHolder] = Modal.useModal();

  const [issueModal, setIssueModal] = useState(false);
  const [users, setUsers] = useState<CouponUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<React.Key[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("all");
  const [excludeIssuedUsers, setExcludeIssuedUsers] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [loadingPreset, setLoadingPreset] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const [selectedIssuedIds, setSelectedIssuedIds] = useState<React.Key[]>([]);
  const [selectedIssuedRows, setSelectedIssuedRows] = useState<IssuedCouponRow[]>([]);
  const [revoking, setRevoking] = useState(false);

  const couponId = id;

  const { result: issuedResult } = useList<IssuedCouponRow>({
    resource: "admin_user_coupon_view",
    filters: [{ field: "couponId", operator: "eq", value: couponId }],
    queryOptions: { enabled: !!couponId },
  });

  const issuedRows = issuedResult.data ?? [];

  const isActiveIssuedStatus = (status?: string | null) => {
    const normalized = (status ?? "").trim().toLowerCase();
    return (
      normalized === "active" ||
      normalized.includes("active") ||
      normalized === "활성" ||
      normalized === "발급" ||
      normalized === "사용가능" ||
      normalized === "미사용"
    );
  };

  const loadCustomers = async (): Promise<CouponUser[]> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, phone, birth, created_at")
      .eq("role", "customer")
      .eq("is_active", true);

    if (error) {
      throw error;
    }

    return (data ?? []) as CouponUser[];
  };

  const loadPurchasedUserIds = async (): Promise<Set<string>> => {
    const { data, error } = await supabase
      .from("orders")
      .select("user_id")
      .eq("status", "완료");

    if (error) {
      throw error;
    }

    return new Set((data ?? []).map((row) => row.user_id).filter(Boolean));
  };

  const loadAlreadyIssuedUserIds = async (): Promise<Set<string>> => {
    if (!couponId || !excludeIssuedUsers) {
      return new Set();
    }

    const { data, error } = await supabase
      .from("user_coupons")
      .select("user_id")
      .eq("coupon_id", couponId);

    if (error) {
      throw error;
    }

    return new Set((data ?? []).map((row) => row.user_id).filter(Boolean));
  };

  const applyPreset = async (preset: PresetKey) => {
    if (!couponId) {
      return;
    }

    setLoadingPreset(true);
    setSelectedPreset(preset);
    setSelectedUserIds([]);

    try {
      const [allCustomers, alreadyIssued] = await Promise.all([
        loadCustomers(),
        loadAlreadyIssuedUserIds(),
      ]);

      const now = dayjs();
      const start30d = now.subtract(30, "day");
      const start90d = now.subtract(90, "day");

      let presetUsers = allCustomers;

      if (preset === "new30") {
        presetUsers = allCustomers.filter(
          (user) => user.created_at && dayjs(user.created_at).isAfter(start30d)
        );
      }

      if (preset === "birthdayThisMonth") {
        const targetMonth = now.month();
        presetUsers = allCustomers.filter((user) => {
          if (!user.birth) {
            return false;
          }

          const birthDate = dayjs(user.birth);
          return birthDate.isValid() && birthDate.month() === targetMonth;
        });
      }

      if (preset === "purchased") {
        const purchasedUserIds = await loadPurchasedUserIds();
        presetUsers = allCustomers.filter((user) => purchasedUserIds.has(user.id));
      }

      if (preset === "notPurchased") {
        const purchasedUserIds = await loadPurchasedUserIds();
        presetUsers = allCustomers.filter((user) => !purchasedUserIds.has(user.id));
      }

      if (preset === "dormant") {
        const { data: completedOrders, error } = await supabase
          .from("orders")
          .select("user_id, created_at")
          .eq("status", "완료");

        if (error) {
          throw error;
        }

        const latestOrderByUser = new Map<string, dayjs.Dayjs>();

        for (const row of completedOrders ?? []) {
          if (!row.user_id || !row.created_at) {
            continue;
          }

          const orderDate = dayjs(row.created_at);
          const prev = latestOrderByUser.get(row.user_id);

          if (!prev || orderDate.isAfter(prev)) {
            latestOrderByUser.set(row.user_id, orderDate);
          }
        }

        presetUsers = allCustomers.filter((user) => {
          const latest = latestOrderByUser.get(user.id);
          return !!latest && latest.isBefore(start90d);
        });
      }

      if (excludeIssuedUsers) {
        presetUsers = presetUsers.filter((user) => !alreadyIssued.has(user.id));
      }

      setUsers(presetUsers);
    } catch (error) {
      console.error(error);
      message.error("대상 고객 조회에 실패했습니다.");
      setUsers([]);
    } finally {
      setLoadingPreset(false);
    }
  };

  useEffect(() => {
    if (!issueModal || !couponId) {
      return;
    }

    applyPreset(selectedPreset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueModal, excludeIssuedUsers]);

  const filteredUsers = useMemo(() => {
    if (!keyword.trim()) {
      return users;
    }

    const q = keyword.trim().toLowerCase();
    return users.filter((user) => (user.name ?? "").toLowerCase().includes(q));
  }, [users, keyword]);

  const refreshIssuedList = async () => {
    await invalidate({
      resource: "admin_user_coupon_view",
      invalidates: ["list"],
    });
  };

  const handleBulkIssue = () => {
    if (!couponId) {
      return;
    }

    const targetIds = selectedUserIds.map(String);

    if (!targetIds.length) {
      message.warning("발급할 고객을 선택해주세요.");
      return;
    }

    modal.confirm({
      title: `${targetIds.length}명에게 발급하시겠습니까?`,
      okText: "발급",
      cancelText: "취소",
      onOk: async () => {
        setIssuing(true);
        try {
          const { error } = await supabase.from("user_coupons").insert(
            targetIds.map((userId) => ({
              user_id: userId,
              coupon_id: couponId,
              status: "active",
            }))
          );

          if (error) {
            throw error;
          }

          message.success(`${targetIds.length}명 발급 완료`);
          setIssueModal(false);
          setSelectedUserIds([]);
          await refreshIssuedList();
        } catch (error) {
          console.error(error);
          message.error("일괄 발급에 실패했습니다.");
        } finally {
          setIssuing(false);
        }
      },
    });
  };

  const revokeCoupons = (rows: IssuedCouponRow[]) => {
    const targetRows = rows.filter((row) => row && isActiveIssuedStatus(row.status));

    if (!targetRows.length) {
      message.warning("회수할 항목을 선택해주세요.");
      return;
    }

    const couponIds = Array.from(
      new Set(targetRows.map((row) => row.id).filter((value): value is string => !!value))
    );
    const userIds = Array.from(
      new Set(targetRows.map((row) => row.userId).filter((value): value is string => !!value))
    );

    modal.confirm({
      title: `${targetRows.length}건을 회수하시겠습니까?`,
      okText: "회수",
      cancelText: "취소",
      onOk: async () => {
        setRevoking(true);
        try {
          let updateError: { message?: string } | null = null;

          if (couponIds.length > 0) {
            const { error } = await supabase
              .from("user_coupons")
              .update({ status: "revoked" })
              .in("id", couponIds);
            updateError = error;
          } else if (couponId && userIds.length > 0) {
            const { error } = await supabase
              .from("user_coupons")
              .update({ status: "revoked" })
              .eq("coupon_id", couponId)
              .in("user_id", userIds)
              .eq("status", "active");
            updateError = error;
          } else {
            updateError = { message: "회수 대상 식별자(id/userId)가 없습니다." };
          }

          if (updateError) {
            throw updateError;
          }

          message.success(`${targetRows.length}건 회수 완료`);
          setSelectedIssuedIds([]);
          setSelectedIssuedRows([]);
          await refreshIssuedList();
        } catch (error) {
          console.error(error);
          const detail =
            error && typeof error === "object" && "message" in error
              ? String(error.message)
              : "";
          message.error(`일괄 회수에 실패했습니다.${detail ? ` (${detail})` : ""}`);
        } finally {
          setRevoking(false);
        }
      },
    });
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      {modalContextHolder}
      <Form {...formProps} layout="vertical">
        <Form.Item label="쿠폰명" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="할인유형" name="discount_type" rules={[{ required: true }]}>
          <Select
            options={[
              { label: "퍼센트(%)", value: "percentage" },
              { label: "고정금액(원)", value: "fixed" },
            ]}
          />
        </Form.Item>
        <Form.Item label="할인값" name="discount_value" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="최대할인금액" name="max_discount_amount">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="설명" name="description">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item
          label="만료일"
          name="expiry_date"
          rules={[{ required: true }]}
          getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
          getValueFromEvent={(date: dayjs.Dayjs | null) => date?.format("YYYY-MM-DD") ?? null}
        >
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="추가정보" name="additional_info">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="활성" name="is_active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>

      <Space size={12} style={{ marginTop: 16, marginBottom: 16 }}>
        <Button type="primary" onClick={() => setIssueModal(true)}>
          쿠폰 발급
        </Button>
        <Button
          danger
          disabled={!selectedIssuedIds.length}
          loading={revoking}
          onClick={() => revokeCoupons(selectedIssuedRows)}
        >
          일괄 회수 ({selectedIssuedIds.length}건)
        </Button>
      </Space>

      <Table<IssuedCouponRow>
        dataSource={issuedRows}
        rowKey="id"
        pagination={false}
        size="small"
        title={() => `발급 내역 (${issuedRows.length}건)`}
        rowSelection={{
          selectedRowKeys: selectedIssuedIds,
          onChange: (keys, rows) => {
            setSelectedIssuedIds(keys);
            setSelectedIssuedRows(rows as IssuedCouponRow[]);
          },
          getCheckboxProps: (record) => ({
            disabled: !isActiveIssuedStatus(record.status),
          }),
        }}
      >
        <Table.Column dataIndex="userName" title="이름" />
        <Table.Column dataIndex="userEmail" title="이메일" />
        <Table.Column
          dataIndex="status"
          title="상태"
          render={(v: string) => <Tag>{v}</Tag>}
        />
        <Table.Column dataIndex="issuedAt" title="발급일" />
        <Table.Column
          title="회수"
          render={(_: unknown, record) => (
            <Button
              size="small"
              danger
              disabled={!isActiveIssuedStatus(record.status)}
              loading={revoking}
              onClick={() => revokeCoupons([record as IssuedCouponRow])}
            >
              회수
            </Button>
          )}
        />
      </Table>

      <Modal
        title="쿠폰 발급"
        open={issueModal}
        onCancel={() => setIssueModal(false)}
        onOk={handleBulkIssue}
        okText="선택 발급"
        cancelText="취소"
        confirmLoading={issuing}
        width={860}
      >
        <Space wrap style={{ marginBottom: 12 }}>
          {(Object.keys(PRESET_LABELS) as PresetKey[]).map((preset) => (
            <Tag.CheckableTag
              key={preset}
              checked={selectedPreset === preset}
              onChange={(checked) => {
                if (checked) {
                  applyPreset(preset);
                }
              }}
            >
              {PRESET_LABELS[preset]}
            </Tag.CheckableTag>
          ))}
        </Space>

        <Space style={{ display: "block", marginBottom: 12 }}>
          <Switch checked={excludeIssuedUsers} onChange={setExcludeIssuedUsers} />
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
          loading={loadingPreset}
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
    </Edit>
  );
}
