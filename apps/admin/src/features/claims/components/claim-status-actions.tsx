import { Text } from "seed-design/ui/text";
import { useState } from "react";
import { CLAIM_REJECT_RESTORE_STATUS, eulo } from "@yeongseon/shared";
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
import type { AdminClaimDetail } from "@/features/claims/types/admin-claim";
import "./claims.css";

type ActiveModal = "advance" | "rollback" | "reject" | null;

interface ClaimStatusActionsProps {
  claim: AdminClaimDetail;
  nextStatus: string | undefined;
  rollbackStatus: string | undefined;
  onStatusChange: (newStatus: string, memo: string) => Promise<boolean>;
  onRollback: (targetStatus: string, memo: string) => Promise<boolean>;
  isUpdating: boolean;
}

export function ClaimStatusActions({
  claim,
  nextStatus,
  rollbackStatus,
  onStatusChange,
  onRollback,
  isUpdating,
}: ClaimStatusActionsProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [memo, setMemo] = useState("");
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isRejected = claim.status === "거부";

  const closeModal = () => {
    setActiveModal(null);
    setMemo("");
    setRollbackTarget(null);
    setValidationError(null);
  };

  const handleAdvanceConfirm = async () => {
    if (!nextStatus) return;
    const ok = await onStatusChange(nextStatus, memo);
    if (ok) closeModal();
  };

  const handleRejectConfirm = async () => {
    const ok = await onStatusChange("거부", memo);
    if (ok) closeModal();
  };

  const handleRollbackConfirm = async () => {
    if (!memo.trim()) {
      setValidationError("롤백 사유를 입력해주세요.");
      return;
    }
    if (!rollbackTarget) return;
    const ok = await onRollback(rollbackTarget, memo);
    if (ok) closeModal();
  };

  return (
    <section className="claimPanel" aria-labelledby="claim-actions-title">
      <Text
        as="h2"
        textStyle="t6Bold"
        id="claim-actions-title"
        className="claimPanelTitle"
      >
        상태 처리
      </Text>
      <div className="claimActions">
        {nextStatus ? (
          <ActionButton
            type="button"
            loading={isUpdating}
            onClick={() => setActiveModal("advance")}
          >
            {nextStatus}
            {eulo(nextStatus)} 변경
          </ActionButton>
        ) : null}
        {rollbackStatus ? (
          <ActionButton
            type="button"
            variant="neutralWeak"
            loading={isUpdating}
            onClick={() => {
              setRollbackTarget(rollbackStatus);
              setActiveModal("rollback");
            }}
          >
            {rollbackStatus}
            {eulo(rollbackStatus)} 롤백
          </ActionButton>
        ) : null}
        {isRejected ? (
          <ActionButton
            type="button"
            variant="neutralWeak"
            loading={isUpdating}
            onClick={() => {
              setRollbackTarget(CLAIM_REJECT_RESTORE_STATUS);
              setActiveModal("rollback");
            }}
          >
            접수로 복원
          </ActionButton>
        ) : null}
        {claim.status !== "거부" && claim.status !== "완료" ? (
          <ActionButton
            type="button"
            variant="criticalSolid"
            loading={isUpdating}
            onClick={() => setActiveModal("reject")}
          >
            거부
          </ActionButton>
        ) : null}
      </div>

      <AlertDialogRoot
        open={activeModal === "advance"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <AlertDialogContent layerIndex={60}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {nextStatus}
              {eulo(nextStatus ?? "")} 변경
            </AlertDialogTitle>
            <AlertDialogDescription>
              현재 상태 {claim.status}에서 {nextStatus}(으)로 변경합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="claimModalBody">
            <textarea
              className="claimTextarea"
              placeholder="메모 (선택)"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogAction variant="neutralWeak" onClick={closeModal}>
              닫기
            </AlertDialogAction>
            <ActionButton
              type="button"
              loading={isUpdating}
              onClick={() => void handleAdvanceConfirm()}
            >
              변경
            </ActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>

      <AlertDialogRoot
        open={activeModal === "reject"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <AlertDialogContent layerIndex={60}>
          <AlertDialogHeader>
            <AlertDialogTitle>클레임 거부</AlertDialogTitle>
            <AlertDialogDescription>
              이 클레임을 거부하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="claimModalBody">
            <textarea
              className="claimTextarea"
              placeholder="거부 사유 (선택)"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogAction variant="neutralWeak" onClick={closeModal}>
              닫기
            </AlertDialogAction>
            <ActionButton
              type="button"
              variant="criticalSolid"
              loading={isUpdating}
              onClick={() => void handleRejectConfirm()}
            >
              거부
            </ActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>

      <AlertDialogRoot
        open={activeModal === "rollback"}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
      >
        <AlertDialogContent layerIndex={60}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {rollbackTarget}
              {eulo(rollbackTarget ?? "")} 롤백
            </AlertDialogTitle>
            <AlertDialogDescription>
              현재 상태 {claim.status}에서 {rollbackTarget}(으)로 롤백합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="claimModalBody">
            {validationError ? (
              <Callout tone="critical" description={validationError} />
            ) : null}
            <textarea
              className="claimTextarea"
              placeholder="롤백 사유 (필수)"
              value={memo}
              onChange={(event) => {
                setMemo(event.target.value);
                setValidationError(null);
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogAction variant="neutralWeak" onClick={closeModal}>
              닫기
            </AlertDialogAction>
            <ActionButton
              type="button"
              variant="criticalSolid"
              loading={isUpdating}
              onClick={() => void handleRollbackConfirm()}
            >
              롤백
            </ActionButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogRoot>
    </section>
  );
}
