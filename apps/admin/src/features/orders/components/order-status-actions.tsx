import { useEffect, useRef, useState } from "react";
import { eulo } from "@yeongseon/shared";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import type { AdminOrderDetail } from "@/features/orders/types/admin-order";

type ActiveModal = "advance" | "rollback" | "cancel" | null;

interface OrderStatusActionsProps {
  order: AdminOrderDetail;
  nextStatus: string | undefined;
  rollbackStatus: string | undefined;
  onStatusChange: (newStatus: string, memo: string) => Promise<boolean>;
  onRollback: (targetStatus: string, memo: string) => Promise<boolean>;
  onBeforeAdvance?: () => boolean;
  isUpdating: boolean;
}

function getModalTitle(
  activeModal: ActiveModal,
  nextStatus?: string,
  rollbackStatus?: string,
) {
  if (activeModal === "advance") {
    return `${nextStatus}${eulo(nextStatus ?? "")} 변경`;
  }
  if (activeModal === "rollback") {
    return `${rollbackStatus}${eulo(rollbackStatus ?? "")} 롤백`;
  }
  return "주문 취소";
}

function getConfirmLabel(activeModal: ActiveModal) {
  if (activeModal === "advance") return "변경";
  if (activeModal === "rollback") return "롤백";
  return "취소 처리";
}

function openDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "");
}

function closeDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
}

export function OrderStatusActions({
  order,
  nextStatus,
  rollbackStatus,
  onStatusChange,
  onRollback,
  onBeforeAdvance,
  isUpdating,
}: OrderStatusActionsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [memo, setMemo] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const isClaimLocked = order.activeClaim != null;

  const openModal = (nextModal: Exclude<ActiveModal, null>) => {
    if (isClaimLocked) return;
    setActiveModal(nextModal);
    setMemo("");
    setValidationError(null);
    openDialog(dialogRef.current);
  };

  const closeModal = () => {
    closeDialog(dialogRef.current);
    setActiveModal(null);
    setMemo("");
    setValidationError(null);
  };

  const handleAdvanceConfirm = async () => {
    if (isClaimLocked || !nextStatus) return;
    const ok = await onStatusChange(nextStatus, memo);
    if (ok) closeModal();
  };

  const handleCancelConfirm = async () => {
    if (isClaimLocked) return;
    const ok = await onStatusChange("취소", memo);
    if (ok) closeModal();
  };

  const handleRollbackConfirm = async () => {
    if (isClaimLocked || !rollbackStatus) return;
    if (!memo.trim()) {
      setValidationError("롤백 사유를 입력해주세요.");
      return;
    }
    const ok = await onRollback(rollbackStatus, memo);
    if (ok) closeModal();
  };

  const handleConfirm = () => {
    if (activeModal === "advance") void handleAdvanceConfirm();
    if (activeModal === "cancel") void handleCancelConfirm();
    if (activeModal === "rollback") void handleRollbackConfirm();
  };

  useEffect(() => {
    if (isClaimLocked && dialogRef.current?.open) {
      closeDialog(dialogRef.current);
    }
  }, [isClaimLocked]);

  return (
    <section className="orderPanel" aria-labelledby="order-status-action-title">
      <div className="orderPanelHeader">
        <h2 id="order-status-action-title" className="orderSectionTitle">
          상태 처리
        </h2>
      </div>
      {isClaimLocked ? (
        <p className="orderMutedText">
          활성 클레임이 있어 주문 상태는 클레임 상세에서 처리해야 합니다.
        </p>
      ) : null}
      <div className="orderActionRow">
        {order.adminActions.includes("advance") && nextStatus ? (
          <ActionButton
            type="button"
            loading={isUpdating}
            disabled={isClaimLocked}
            onClick={() => {
              if (onBeforeAdvance && !onBeforeAdvance()) return;
              openModal("advance");
            }}
          >
            {nextStatus}
            {eulo(nextStatus)} 변경
          </ActionButton>
        ) : null}
        {order.adminActions.includes("rollback") && rollbackStatus ? (
          <ActionButton
            type="button"
            variant="neutralWeak"
            loading={isUpdating}
            disabled={isClaimLocked}
            onClick={() => openModal("rollback")}
          >
            {rollbackStatus}
            {eulo(rollbackStatus)} 롤백
          </ActionButton>
        ) : null}
        {order.adminActions.includes("cancel") ? (
          <ActionButton
            type="button"
            variant="neutralWeak"
            loading={isUpdating}
            disabled={isClaimLocked}
            onClick={() => openModal("cancel")}
          >
            취소 처리
          </ActionButton>
        ) : null}
      </div>

      <dialog
        ref={dialogRef}
        className="orderModal"
        aria-labelledby="order-status-dialog-title"
        onClose={() => setActiveModal(null)}
      >
        {activeModal ? (
          <>
            <div className="orderModalHeader">
              <h3 id="order-status-dialog-title" className="orderSectionTitle">
                {getModalTitle(activeModal, nextStatus, rollbackStatus)}
              </h3>
            </div>
            {activeModal === "advance" ? (
              <p>
                현재 상태 <strong>{order.status}</strong> →{" "}
                <strong>{nextStatus}</strong>으로 변경합니다.
              </p>
            ) : null}
            {activeModal === "cancel" ? (
              <p>이 주문을 취소하시겠습니까?</p>
            ) : null}
            {activeModal === "rollback" ? (
              <p>
                현재 상태 <strong>{order.status}</strong> →{" "}
                <strong>{rollbackStatus}</strong>으로 롤백합니다.
              </p>
            ) : null}
            {validationError ? (
              <Callout
                tone="critical"
                description={validationError}
                role="alert"
              />
            ) : null}
            <label className="orderField">
              <span className="orderFieldLabel">
                {activeModal === "rollback"
                  ? "롤백 사유 (필수)"
                  : "메모 (선택)"}
              </span>
              <textarea
                className="orderInput orderTextarea"
                placeholder={
                  activeModal === "rollback"
                    ? "롤백 사유 (필수)"
                    : "메모 (선택)"
                }
                value={memo}
                onChange={(event) => {
                  setMemo(event.target.value);
                  setValidationError(null);
                }}
              />
            </label>
            <div className="orderModalActions">
              <ActionButton
                type="button"
                variant="neutralWeak"
                disabled={isUpdating}
                onClick={closeModal}
              >
                닫기
              </ActionButton>
              <ActionButton
                type="button"
                loading={isUpdating}
                disabled={isUpdating}
                onClick={handleConfirm}
              >
                {getConfirmLabel(activeModal)}
              </ActionButton>
            </div>
          </>
        ) : null}
      </dialog>
    </section>
  );
}
