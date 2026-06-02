import { Text } from "seed-design/ui/text";
import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ActionButton } from "seed-design/ui/action-button";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogRoot,
  AlertDialogTitle,
} from "seed-design/ui/alert-dialog";
import { Chip } from "seed-design/ui/chip";
import { Switch } from "seed-design/ui/switch";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import {
  COUPON_PRESET_KEYS,
  COUPON_PRESET_LABELS,
  type CouponPresetKey,
  type CouponUser,
} from "@/features/coupons/types/admin-coupon";
import { AdminDataTable } from "@/components/AdminDataTable";

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
  return (
    <AlertDialogRoot
      open
      role="dialog"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="couponModal" layerIndex={60}>
        <AlertDialogHeader>
          <AlertDialogTitle id="coupon-issue-title">쿠폰 발급</AlertDialogTitle>
          <AlertDialogDescription>
            대상 고객을 선택해 쿠폰을 발급합니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Chip.RadioRoot
          className="couponPresetGroup"
          aria-label="고객 프리셋"
          value={selectedPreset}
          onValueChange={onPresetChange}
        >
          {COUPON_PRESET_KEYS.map((preset) => (
            <Chip.RadioItem key={preset} value={preset}>
              <Text as="span" textStyle="t4Regular">
                {COUPON_PRESET_LABELS[preset]}
              </Text>
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

        <Text as="p" textStyle="t4Regular" aria-live="polite">
          {KR_NUMBER_FORMAT.format(selectedUserIds.size)}명 선택됨
          {isFetching ? " · 고객 조회 중…" : ""}
        </Text>

        <AdminDataTable
          data={users}
          columns={USER_COLUMNS}
          getRowId={(row) => row.id}
          emptyText="조건에 맞는 고객이 없습니다."
          selectedRowIds={selectedUserIds}
          onSelectedRowIdsChange={onSelectedUserIdsChange}
          isLoading={isFetching}
        />

        <AlertDialogFooter>
          <ActionButton
            type="button"
            loading={isIssuing}
            disabled={isIssuing}
            onClick={onIssue}
          >
            선택 발급
          </ActionButton>
          <AlertDialogAction
            type="button"
            variant="neutralWeak"
            onClick={onClose}
          >
            취소
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogRoot>
  );
}
