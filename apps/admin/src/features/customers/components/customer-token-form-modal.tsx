import { useEffect, useState, type FormEvent } from "react";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  TextField,
  TextFieldInput,
  TextFieldTextarea,
} from "seed-design/ui/text-field";
import { useManageCustomerTokensMutation } from "@/features/customers/api/customers-query";
import "./customers.css";

interface CustomerTokenFormModalProps {
  userId: string;
  mode: "grant" | "deduct";
  open: boolean;
  onClose: () => void;
}

const MODAL_TITLE: Record<CustomerTokenFormModalProps["mode"], string> = {
  grant: "토큰 지급",
  deduct: "토큰 차감",
};

function isValidTokenAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount >= 1;
}

export function CustomerTokenFormModal({
  userId,
  mode,
  open,
  onClose,
}: CustomerTokenFormModalProps) {
  const mutation = useManageCustomerTokensMutation();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setDescription("");
      setNotice(null);
    }
  }, [open]);

  if (!open) return null;

  const parsedAmount = Number(amount);
  const trimmedDescription = description.trim();
  const canSubmit =
    isValidTokenAmount(parsedAmount) && trimmedDescription.length > 0;

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!canSubmit) {
      setNotice("수량과 설명을 입력해주세요.");
      return;
    }

    setNotice(null);
    try {
      await mutation.mutateAsync({
        userId,
        amount: mode === "deduct" ? -parsedAmount : parsedAmount,
        description: trimmedDescription,
      });
      onClose();
    } catch {
      // mutation.error로 렌더링한다.
    }
  };

  return (
    <div className="customerModalBackdrop" role="presentation">
      <section
        className="customerModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-token-modal-title"
      >
        <h2 id="customer-token-modal-title" className="customerModalTitle">
          {MODAL_TITLE[mode]}
        </h2>
        {notice ? <Callout tone="warning" description={notice} /> : null}
        {mutation.error ? (
          <Callout
            tone="critical"
            description={`토큰 처리에 실패했습니다: ${mutation.error.message}`}
          />
        ) : null}
        <form className="customerTokenForm" onSubmit={handleSubmit} noValidate>
          <TextField
            label="수량"
            value={amount}
            onValueChange={({ value }) => setAmount(value)}
            invalid={amount.length > 0 && !isValidTokenAmount(parsedAmount)}
            errorMessage="1 이상의 정수를 입력해주세요."
          >
            <TextFieldInput
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
            />
          </TextField>
          <TextField
            label="설명"
            value={description}
            onValueChange={({ value }) => setDescription(value)}
          >
            <TextFieldTextarea aria-label="토큰 처리 설명" />
          </TextField>
          <div className="customerFormActions">
            <ActionButton
              type="submit"
              loading={mutation.isPending}
              disabled={!canSubmit || mutation.isPending}
            >
              {MODAL_TITLE[mode]}
            </ActionButton>
            <ActionButton
              type="button"
              variant="neutralWeak"
              disabled={mutation.isPending}
              onClick={onClose}
            >
              취소
            </ActionButton>
          </div>
        </form>
      </section>
    </div>
  );
}
