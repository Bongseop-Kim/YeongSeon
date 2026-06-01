import { useCallback } from "react";
import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ActionButton } from "seed-design/ui/action-button";
import { Chip } from "seed-design/ui/chip";
import { Switch } from "seed-design/ui/switch";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import {
  COUPON_PRESET_KEYS,
  COUPON_PRESET_LABELS,
  type CouponPresetKey,
  type CouponUser,
} from "@/features/coupons/types/admin-coupon";
import { AdminDataTable } from "./admin-data-table";

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

const USER_COLUMNS: ColumnDef<CouponUser>[] = [
  {
    accessorKey: "name",
    header: "이름",
    cell: ({ row }) => row.original.name ?? "-",
  },
  {
    accessorKey: "phone",
    header: "전화번호",
    cell: ({ row }) => row.original.phone ?? "-",
  },
];

interface CouponIssueDialogProps {
  selectedPreset: CouponPresetKey;
  excludeIssuedUsers: boolean;
  keyword: string;
  users: CouponUser[];
  selectedUserIds: Set<string>;
  isFetching: boolean;
  isIssuing: boolean;
  onClose: () => void;
  onPresetChange: (value: string) => void;
  onExcludeIssuedUsersChange: (checked: boolean) => void;
  onKeywordChange: (value: string) => void;
  onSelectedUserIdsChange: (ids: Set<string>) => void;
  onIssue: () => void;
}

export function CouponIssueDialog({
  selectedPreset,
  excludeIssuedUsers,
  keyword,
  users,
  selectedUserIds,
  isFetching,
  isIssuing,
  onClose,
  onPresetChange,
  onExcludeIssuedUsersChange,
  onKeywordChange,
  onSelectedUserIdsChange,
  onIssue,
}: CouponIssueDialogProps): ReactNode {
  const openDialog = useCallback((dialog: HTMLDialogElement | null) => {
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  return (
    <dialog
      ref={openDialog}
      className="couponModal"
      aria-labelledby="coupon-issue-title"
      onClose={onClose}
    >
      <header className="couponModalHeader">
        <div>
          <h2 id="coupon-issue-title" className="couponModalTitle">
            쿠폰 발급
          </h2>
          <p className="couponPageDescription">
            대상 고객을 선택해 쿠폰을 발급합니다.
          </p>
        </div>
        <ActionButton type="button" variant="neutralWeak" onClick={onClose}>
          닫기
        </ActionButton>
      </header>

      <Chip.RadioRoot
        className="couponPresetGroup"
        aria-label="고객 프리셋"
        value={selectedPreset}
        onValueChange={onPresetChange}
      >
        {COUPON_PRESET_KEYS.map((preset) => (
          <Chip.RadioItem key={preset} value={preset}>
            <span>{COUPON_PRESET_LABELS[preset]}</span>
          </Chip.RadioItem>
        ))}
      </Chip.RadioRoot>

      <div className="couponSearchRow">
        <TextField
          label="고객명 검색"
          name="coupon-user-search"
          value={keyword}
          onValueChange={({ value }) => onKeywordChange(value)}
        >
          <TextFieldInput placeholder="고객명 검색…" />
        </TextField>
        <Switch
          checked={excludeIssuedUsers}
          onCheckedChange={onExcludeIssuedUsersChange}
          label="중복 발급 방지"
        />
      </div>

      <p aria-live="polite">
        {KR_NUMBER_FORMAT.format(selectedUserIds.size)}명 선택됨
        {isFetching ? " · 고객 조회 중…" : ""}
      </p>

      <AdminDataTable
        data={users}
        columns={USER_COLUMNS}
        getRowId={(row) => row.id}
        emptyText="조건에 맞는 고객이 없습니다."
        selectedRowIds={selectedUserIds}
        onSelectedRowIdsChange={onSelectedUserIdsChange}
      />

      <div className="couponFormActions">
        <ActionButton
          type="button"
          loading={isIssuing}
          disabled={isIssuing}
          onClick={onIssue}
        >
          선택 발급
        </ActionButton>
        <ActionButton type="button" variant="neutralWeak" onClick={onClose}>
          취소
        </ActionButton>
      </div>
    </dialog>
  );
}
