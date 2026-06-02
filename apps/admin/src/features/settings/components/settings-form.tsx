import { Text } from "seed-design/ui/text";
import { useRef, useState } from "react";
import { COURIER_COMPANY_NAMES } from "@yeongseon/shared/constants/courier-companies";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  RadioSelectBoxItem,
  RadioSelectBoxRoot,
} from "seed-design/ui/select-box";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import {
  useDefaultCourierForm,
  useDesignTokenInitialGrantForm,
} from "@/features/settings/api/settings-query";
import "./settings-form.css";

interface SettingsErrorCardProps {
  errorMessage: string;
  onRetry: () => void;
}

function SettingsErrorCard({ errorMessage, onRetry }: SettingsErrorCardProps) {
  return (
    <Callout
      tone="critical"
      title="설정을 불러오지 못했습니다"
      description={errorMessage}
      role="alert"
      linkProps={{ children: "다시 시도", onClick: onRetry }}
    />
  );
}

interface SettingSectionProps {
  titleId: string;
  title: string;
  isLoading: boolean;
  isError: boolean;
  error: { message?: string } | null;
  onRetry: () => void;
  children: React.ReactNode;
}

function SettingSection({
  titleId,
  title,
  isLoading,
  isError,
  error,
  onRetry,
  children,
}: SettingSectionProps) {
  let content = children;

  if (isLoading) {
    content = <AdminPanelSkeleton lines={3} />;
  } else if (isError) {
    content = (
      <SettingsErrorCard
        errorMessage={error?.message ?? "알 수 없는 오류"}
        onRetry={onRetry}
      />
    );
  }

  return (
    <section
      className="settingsSection adminSettingsCard"
      aria-labelledby={titleId}
    >
      <Text
        as="h2"
        textStyle="t5Bold"
        id={titleId}
        className="settingsSectionTitle"
      >
        {title}
      </Text>
      {content}
    </section>
  );
}

export function SettingsForm() {
  const [notice, setNotice] = useState<string | null>(null);
  const [amountInputDraft, setAmountInputDraft] = useState<string | null>(null);
  const [tokenGrantValidationError, setTokenGrantValidationError] = useState<
    string | null
  >(null);
  const tokenGrantInputRef = useRef<HTMLInputElement>(null);
  const {
    courierCompany,
    setCourierCompany,
    save,
    reset: resetCourierCompany,
    isDirty: isCourierDirty,
    isLoading,
    isError,
    error,
    refetch,
    isSaving,
    saveError,
  } = useDefaultCourierForm();

  const {
    amount,
    savedAmount,
    setAmount,
    save: saveTokenGrant,
    reset: resetTokenGrant,
    isDirty: isTokenGrantAmountDirty,
    isLoading: isTokenGrantLoading,
    isError: isTokenGrantError,
    error: tokenGrantError,
    refetch: refetchTokenGrant,
    isSaving: isTokenGrantSaving,
    saveError: tokenGrantSaveError,
  } = useDesignTokenInitialGrantForm();

  const amountInputValue = amountInputDraft ?? String(amount);
  const parsedTokenGrantAmount = Number(amountInputValue);
  const isTokenGrantInputValid =
    Number.isInteger(parsedTokenGrantAmount) && parsedTokenGrantAmount >= 1;
  const tokenGrantInputError =
    amountInputValue === "" || !isTokenGrantInputValid
      ? "1개 이상의 정수를 입력해주세요."
      : null;
  const isTokenGrantDirty =
    amountInputDraft === null
      ? isTokenGrantAmountDirty
      : amountInputDraft !== String(savedAmount);
  const tokenGrantFieldError =
    tokenGrantValidationError ?? tokenGrantInputError;

  const handleSaveCourier = async () => {
    setNotice(null);

    try {
      await save();
      setNotice("기본 택배사를 저장했습니다.");
    } catch {
      // saveError로 렌더링한다.
    }
  };

  const handleSaveTokenGrant = async () => {
    setNotice(null);

    const parsedAmount = Number(amountInputValue);
    if (!Number.isInteger(parsedAmount) || parsedAmount < 1) {
      setTokenGrantValidationError("1개 이상의 정수를 입력해주세요.");
      tokenGrantInputRef.current?.focus();
      return;
    }

    setTokenGrantValidationError(null);

    try {
      await saveTokenGrant();
      setAmountInputDraft(null);
      setNotice("신규 가입 토큰 지급량을 저장했습니다.");
    } catch {
      // saveError로 렌더링한다.
    }
  };

  return (
    <main className="settingsPage adminSettingsPage">
      <header className="settingsTitleGroup">
        <Text as="h1" textStyle="screenTitle" className="settingsTitle">
          관리자 설정
        </Text>
        <Text as="p" textStyle="t4Regular" className="settingsDescription">
          운영 기본값과 가입 보상 설정을 관리합니다.
        </Text>
      </header>

      {notice ? (
        <Callout
          tone="positive"
          description={notice}
          role="status"
          aria-live="polite"
        />
      ) : null}

      <SettingSection
        titleId="settings-default-courier"
        title="기본 택배사"
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => void refetch()}
      >
        <form
          className="settingsSectionForm adminSettingsSectionForm"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveCourier();
          }}
        >
          <RadioSelectBoxRoot
            className="settingsCourierOptions adminSettingsFieldFull"
            aria-labelledby="settings-default-courier"
            name="default-courier-company"
            value={courierCompany}
            onValueChange={setCourierCompany}
            columns={2}
          >
            {COURIER_COMPANY_NAMES.map((name) => (
              <RadioSelectBoxItem key={name} value={name} label={name} />
            ))}
          </RadioSelectBoxRoot>
          <div className="settingsActionRow adminSettingsActionRow">
            {isCourierDirty ? (
              <Text
                as="p"
                textStyle="t4Regular"
                className="settingsSaveSummary adminSettingsActionSummary"
              >
                저장하지 않은 변경사항 1개가 있습니다.
              </Text>
            ) : null}
            {isCourierDirty ? (
              <ActionButton
                type="button"
                variant="neutralWeak"
                disabled={isSaving}
                onClick={resetCourierCompany}
              >
                변경 취소
              </ActionButton>
            ) : null}
            <ActionButton
              type="submit"
              loading={isSaving}
              disabled={!courierCompany || isSaving || !isCourierDirty}
            >
              기본 택배사 저장
            </ActionButton>
          </div>
        </form>
        {saveError ? (
          <Callout
            tone="critical"
            title="기본 택배사를 저장하지 못했습니다"
            description={saveError.message}
            role="alert"
          />
        ) : null}
      </SettingSection>

      <SettingSection
        titleId="settings-design-token-initial-grant"
        title="신규 가입 토큰 지급량"
        isLoading={isTokenGrantLoading}
        isError={isTokenGrantError}
        error={tokenGrantError}
        onRetry={() => void refetchTokenGrant()}
      >
        <form
          className="settingsSectionForm adminSettingsSectionForm"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveTokenGrant();
          }}
        >
          <TextField
            className="settingsNumberField adminSettingsField"
            label="토큰 지급량"
            name="design-token-initial-grant"
            value={amountInputValue}
            onValueChange={({ value }) => {
              setAmountInputDraft(value);

              const parsed = Number(value);
              if (Number.isInteger(parsed) && parsed >= 1) {
                setAmount(parsed);
                setTokenGrantValidationError(null);
              }
            }}
            suffix="개"
            required
            showRequiredIndicator
            invalid={Boolean(tokenGrantFieldError)}
            errorMessage={tokenGrantFieldError}
          >
            <TextFieldInput
              ref={tokenGrantInputRef}
              name="design-token-initial-grant"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              autoComplete="off"
            />
          </TextField>
          <div className="settingsActionRow adminSettingsActionRow">
            {isTokenGrantDirty ? (
              <Text
                as="p"
                textStyle="t4Regular"
                className="settingsSaveSummary adminSettingsActionSummary"
              >
                저장하지 않은 변경사항 1개가 있습니다.
              </Text>
            ) : null}
            {isTokenGrantDirty ? (
              <ActionButton
                type="button"
                variant="neutralWeak"
                disabled={isTokenGrantSaving}
                onClick={() => {
                  resetTokenGrant();
                  setAmountInputDraft(null);
                  setTokenGrantValidationError(null);
                }}
              >
                변경 취소
              </ActionButton>
            ) : null}
            <ActionButton
              type="submit"
              loading={isTokenGrantSaving}
              disabled={
                isTokenGrantSaving ||
                !isTokenGrantDirty ||
                Boolean(tokenGrantInputError)
              }
            >
              토큰 지급량 저장
            </ActionButton>
          </div>
        </form>
        {tokenGrantSaveError ? (
          <Callout
            tone="critical"
            title="토큰 지급량을 저장하지 못했습니다"
            description={tokenGrantSaveError.message}
            role="alert"
          />
        ) : null}
      </SettingSection>
    </main>
  );
}
