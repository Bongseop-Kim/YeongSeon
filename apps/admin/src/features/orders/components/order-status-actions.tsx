import { Text } from "seed-design/ui/text";
import { useEffect, useState } from "react";
import { eulo } from "@yeongseon/shared";
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
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldTextarea } from "seed-design/ui/text-field";
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

export function OrderStatusActions({
  order,
  nextStatus,
  rollbackStatus,
  onStatusChange,
  onRollback,
  onBeforeAdvance,
  isUpdating,
}: OrderStatusActionsProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [memo, setMemo] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const isClaimLocked = order.activeClaim != null;

  const openModal = (nextModal: Exclude<ActiveModal, null>) => {
    if (isClaimLocked) return;
    setActiveModal(nextModal);
    setMemo("");
    setValidationError(null);
  };

  const closeModal = () => {
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
    if (isClaimLocked && activeModal) {
      setActiveModal(null);
      setMemo("");
      setValidationError(null);
    }
  }, [activeModal, isClaimLocked]);

  return (
    <section className="orderPanel" aria-labelledby="order-status-action-title">
      <div className="orderPanelHeader">
        <Text
          as="h2"
          textStyle="t6Bold"
          id="order-status-action-title"
          className="orderSectionTitle"
        >
          상태 처리
        </Text>
      </div>
      {isClaimLocked ? (
        <Text as="p" textStyle="t4Regular" className="orderMutedText">
          활성 클레임이 있어 주문 상태는 클레임 상세에서 처리해야 합니다.
        </Text>
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

      <AlertDialogRoot
        open={activeModal !== null}
        role="dialog"
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        {activeModal ? (
          <AlertDialogContent layerIndex={60}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {getModalTitle(activeModal, nextStatus, rollbackStatus)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {activeModal === "advance" ? (
                  <>
                    현재 상태 {order.status}에서 {nextStatus}(으)로 변경합니다.
                  </>
                ) : null}
                {activeModal === "cancel"
                  ? "이 주문을 취소하시겠습니까?"
                  : null}
                {activeModal === "rollback" ? (
                  <>
                    현재 상태 {order.status}에서 {rollbackStatus}(으)로
                    롤백합니다.
                  </>
                ) : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="orderModalBody">
              {validationError ? (
                <Callout
                  tone="critical"
                  description={validationError}
                  role="alert"
                />
              ) : null}
              <TextField
                label={activeModal === "rollback" ? "롤백 사유" : "메모"}
                value={memo}
                required={activeModal === "rollback"}
                showRequiredIndicator={activeModal === "rollback"}
                invalid={Boolean(validationError)}
                onValueChange={({ value }) => {
                  setMemo(value);
                  setValidationError(null);
                }}
              >
                <TextFieldTextarea
                  name="order-status-memo"
                  placeholder={
                    activeModal === "rollback"
                      ? "롤백 사유 (필수)"
                      : "메모 (선택)"
                  }
                />
              </TextField>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction
                variant="neutralWeak"
                disabled={isUpdating}
                onClick={closeModal}
              >
                닫기
              </AlertDialogAction>
              <ActionButton
                type="button"
                loading={isUpdating}
                disabled={isUpdating}
                onClick={handleConfirm}
              >
                {getConfirmLabel(activeModal)}
              </ActionButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialogRoot>
    </section>
  );
}
