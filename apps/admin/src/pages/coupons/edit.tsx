import { Edit, useForm } from "@refinedev/antd";
import { Modal } from "antd";
import { useState } from "react";
import { CouponEditForm } from "@/features/coupons/components/coupon-edit-form";
import { IssuedCouponTable } from "@/features/coupons/components/issued-coupon-table";
import { IssueCouponModal } from "@/features/coupons/components/issue-coupon-modal";
import { useIssuedCoupons, useCouponIssue, useCouponRevoke } from "@/features/coupons/api/coupons-query";
import type { AdminIssuedCouponRow } from "@/features/coupons/types/admin-coupon";

export default function CouponEdit() {
  const { formProps, saveButtonProps, id } = useForm({
    resource: "coupons",
    redirect: "list",
  });

  const couponId = id ? String(id) : undefined;

  const [modal, modalContextHolder] = Modal.useModal();
  const [issueModalOpen, setIssueModalOpen] = useState(false);

  const { rows } = useIssuedCoupons(couponId);
  const { issue, issuing } = useCouponIssue(couponId);
  const { revoke, revoking } = useCouponRevoke(couponId);

  const handleRevoke = (targetRows: AdminIssuedCouponRow[]) => {
    const count = targetRows.filter(
      (r) => r.status === "active" || r.status === "활성" || r.status === "발급" ||
             r.status === "사용가능" || r.status === "미사용"
    ).length;

    if (!count) return;

    modal.confirm({
      title: `${count}건을 회수하시겠습니까?`,
      okText: "회수",
      cancelText: "취소",
      onOk: () => revoke(targetRows),
    });
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      {modalContextHolder}
      <CouponEditForm formProps={formProps} saveButtonProps={saveButtonProps} />
      <IssuedCouponTable
        rows={rows}
        revoking={revoking}
        onRevoke={handleRevoke}
        onOpenIssueModal={() => setIssueModalOpen(true)}
      />
      <IssueCouponModal
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        couponId={couponId}
        onIssue={issue}
        issuing={issuing}
      />
    </Edit>
  );
}