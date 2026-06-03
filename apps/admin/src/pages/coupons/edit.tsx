import { Text } from "seed-design/ui/text";
import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Callout } from "seed-design/ui/callout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import {
  CouponEditConfirmDialog,
  CouponForm,
  CouponIssueDialog,
  CouponIssuedSection,
  createDefaultCouponFormValues,
  isActiveIssuedStatus,
  isCouponPresetKey,
  toCouponFormValues,
  useCouponQuery,
  useIssuedCouponsQuery,
  useIssueCouponsMutation,
  usePresetCouponUsersQuery,
  useRevokeIssuedCouponsMutation,
  useUpdateCouponMutation,
  type AdminCouponFormValues,
  type CouponEditConfirmState,
  type CouponPresetKey,
  type CouponUser,
  type IssuedCouponRow,
} from "@/features/coupons";

const EMPTY_COUPON_USERS: CouponUser[] = [];
const EMPTY_ISSUED_ROWS: IssuedCouponRow[] = [];

interface CouponEditState {
  notice: string | null;
  issueDialogOpen: boolean;
  selectedPreset: CouponPresetKey;
  excludeIssuedUsers: boolean;
  keyword: string;
  selectedUserIds: Set<string>;
  selectedIssuedIds: Set<string>;
  confirmState: CouponEditConfirmState | null;
}

type CouponEditAction =
  | { type: "noticeChanged"; notice: string | null }
  | { type: "issueDialogOpened" }
  | { type: "issueDialogClosed" }
  | { type: "presetSelected"; preset: CouponPresetKey }
  | { type: "excludeIssuedUsersChanged"; checked: boolean }
  | { type: "keywordChanged"; keyword: string }
  | { type: "selectedUserIdsChanged"; ids: Set<string> }
  | { type: "selectedIssuedIdsChanged"; ids: Set<string> }
  | { type: "confirmRequested"; confirmState: CouponEditConfirmState }
  | { type: "confirmCleared" }
  | { type: "issueSucceeded"; notice: string }
  | { type: "revokeSucceeded"; notice: string };

function createInitialCouponEditState(): CouponEditState {
  return {
    notice: null,
    issueDialogOpen: false,
    selectedPreset: "all",
    excludeIssuedUsers: true,
    keyword: "",
    selectedUserIds: new Set(),
    selectedIssuedIds: new Set(),
    confirmState: null,
  };
}

function couponEditReducer(
  state: CouponEditState,
  action: CouponEditAction,
): CouponEditState {
  switch (action.type) {
    case "noticeChanged":
      return { ...state, notice: action.notice };
    case "issueDialogOpened":
      return { ...state, issueDialogOpen: true };
    case "issueDialogClosed":
      return { ...state, issueDialogOpen: false };
    case "presetSelected":
      return {
        ...state,
        selectedPreset: action.preset,
        selectedUserIds: new Set(),
      };
    case "excludeIssuedUsersChanged":
      return {
        ...state,
        excludeIssuedUsers: action.checked,
        selectedUserIds: new Set(),
      };
    case "keywordChanged":
      return { ...state, keyword: action.keyword, selectedUserIds: new Set() };
    case "selectedUserIdsChanged":
      return { ...state, selectedUserIds: action.ids };
    case "selectedIssuedIdsChanged":
      return { ...state, selectedIssuedIds: action.ids };
    case "confirmRequested":
      return { ...state, confirmState: action.confirmState };
    case "confirmCleared":
      return { ...state, confirmState: null };
    case "issueSucceeded":
      return {
        ...state,
        notice: action.notice,
        issueDialogOpen: false,
        selectedUserIds: new Set(),
      };
    case "revokeSucceeded":
      return {
        ...state,
        notice: action.notice,
        selectedIssuedIds: new Set(),
      };
  }
}

export default function CouponEdit(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const couponQuery = useCouponQuery(id);
  const issuedQuery = useIssuedCouponsQuery(id);
  const updateMutation = useUpdateCouponMutation(id);
  const issueMutation = useIssueCouponsMutation(id);
  const revokeMutation = useRevokeIssuedCouponsMutation(id);
  const [state, dispatch] = useReducer(
    couponEditReducer,
    undefined,
    createInitialCouponEditState,
  );

  const presetUsersQuery = usePresetCouponUsersQuery({
    couponId: id,
    preset: state.selectedPreset,
    excludeIssuedUsers: state.excludeIssuedUsers,
    enabled: state.issueDialogOpen,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, dirtyFields },
  } = useForm<AdminCouponFormValues>({
    defaultValues: createDefaultCouponFormValues(),
  });
  const dirtyCount = Object.keys(dirtyFields).length;

  useEffect(() => {
    if (couponQuery.data) {
      reset(toCouponFormValues(couponQuery.data));
    }
  }, [couponQuery.data, reset]);

  const issuedRows = issuedQuery.data ?? EMPTY_ISSUED_ROWS;
  const presetUsers = presetUsersQuery.data ?? EMPTY_COUPON_USERS;
  const filteredUsers = useMemo(() => {
    const query = state.keyword.trim().toLowerCase();
    if (!query) return presetUsers;
    return presetUsers.filter((user) =>
      (user.name ?? "").toLowerCase().includes(query),
    );
  }, [presetUsers, state.keyword]);

  const selectedIssuedRows = useMemo(
    () => issuedRows.filter((row) => state.selectedIssuedIds.has(row.id)),
    [issuedRows, state.selectedIssuedIds],
  );

  const requestRevoke = useCallback(
    (rows: IssuedCouponRow[]) => {
      const targetRows = rows.filter((row) => isActiveIssuedStatus(row.status));
      if (targetRows.length === 0) {
        dispatch({
          type: "noticeChanged",
          notice: "회수할 항목을 선택해주세요.",
        });
        return;
      }

      dispatch({
        type: "confirmRequested",
        confirmState: {
          title: `${targetRows.length}건을 회수하시겠습니까?`,
          description: "회수된 쿠폰은 고객이 사용할 수 없습니다.",
          actionLabel: "회수",
          onConfirm: () => {
            revokeMutation.mutate(targetRows, {
              onSuccess: () => {
                dispatch({
                  type: "revokeSucceeded",
                  notice: `${targetRows.length}건 회수 완료`,
                });
              },
            });
          },
        },
      });
    },
    [revokeMutation],
  );

  const submitCoupon = handleSubmit((values) => {
    updateMutation.mutate(values, {
      onSuccess: () => {
        dispatch({
          type: "noticeChanged",
          notice: "쿠폰 정보를 저장했습니다.",
        });
        navigate({ pathname: "/coupons", search: location.search });
      },
    });
  });

  function requestBulkIssue(): void {
    const targetIds = Array.from(state.selectedUserIds);
    if (!targetIds.length) {
      dispatch({
        type: "noticeChanged",
        notice: "발급할 고객을 선택해주세요.",
      });
      return;
    }

    dispatch({
      type: "confirmRequested",
      confirmState: {
        title: `${targetIds.length}명에게 발급하시겠습니까?`,
        description: "이미 같은 쿠폰을 가진 고객은 활성 상태로 갱신됩니다.",
        actionLabel: "발급",
        onConfirm: () => {
          issueMutation.mutate(targetIds, {
            onSuccess: () => {
              dispatch({
                type: "issueSucceeded",
                notice: `${targetIds.length}명 발급 완료`,
              });
            },
          });
        },
      },
    });
  }

  function selectPreset(value: string): void {
    if (!isCouponPresetKey(value)) {
      return;
    }

    dispatch({ type: "presetSelected", preset: value });
  }

  const errorMessage =
    couponQuery.error?.message ??
    updateMutation.error?.message ??
    issuedQuery.error?.message ??
    presetUsersQuery.error?.message ??
    issueMutation.error?.message ??
    revokeMutation.error?.message ??
    null;

  if (couponQuery.isLoading) {
    return (
      <main className="couponPage adminSettingsPage">
        <AdminPanelSkeleton lines={5} />
      </main>
    );
  }

  return (
    <main className="couponPage adminSettingsPage">
      <AdminPageHeader
        title="쿠폰 수정"
        description="쿠폰 정보와 발급 내역을 관리합니다."
        className="couponPageHeader"
        titleGroupClassName="couponPageTitleGroup"
        titleClassName="couponPageTitle"
        descriptionClassName="couponPageDescription"
      />

      {state.notice ? (
        <Callout
          tone="positive"
          description={state.notice}
          role="status"
          aria-live="polite"
        />
      ) : null}
      {errorMessage ? (
        <Callout tone="critical" description={errorMessage} role="alert" />
      ) : null}

      <section
        className="couponPanel adminSettingsCard"
        aria-labelledby="coupon-edit-form-title"
      >
        <Text
          as="h2"
          textStyle="t6Bold"
          id="coupon-edit-form-title"
          className="couponPanelTitle"
        >
          기본 정보
        </Text>
        <form onSubmit={submitCoupon} noValidate>
          <CouponForm
            control={control}
            errors={errors}
            submitting={updateMutation.isPending}
            submitLabel="저장"
            isDirty={isDirty}
            dirtyCount={dirtyCount}
            onCancel={() => {
              if (couponQuery.data) {
                reset(toCouponFormValues(couponQuery.data));
              }
            }}
          />
        </form>
      </section>

      <CouponIssuedSection
        issuedRows={issuedRows}
        selectedIssuedIds={state.selectedIssuedIds}
        selectedIssuedRows={selectedIssuedRows}
        isFetching={issuedQuery.isFetching}
        isRevoking={revokeMutation.isPending}
        onSelectedIssuedIdsChange={(ids) =>
          dispatch({ type: "selectedIssuedIdsChanged", ids })
        }
        onOpenIssueDialog={() => dispatch({ type: "issueDialogOpened" })}
        onRevoke={requestRevoke}
      />

      {state.issueDialogOpen ? (
        <CouponIssueDialog
          selectedPreset={state.selectedPreset}
          excludeIssuedUsers={state.excludeIssuedUsers}
          keyword={state.keyword}
          users={filteredUsers}
          selectedUserIds={state.selectedUserIds}
          isFetching={presetUsersQuery.isFetching}
          isIssuing={issueMutation.isPending}
          onClose={() => dispatch({ type: "issueDialogClosed" })}
          onPresetChange={selectPreset}
          onExcludeIssuedUsersChange={(checked) =>
            dispatch({ type: "excludeIssuedUsersChanged", checked })
          }
          onKeywordChange={(keyword) =>
            dispatch({ type: "keywordChanged", keyword })
          }
          onSelectedUserIdsChange={(ids) =>
            dispatch({ type: "selectedUserIdsChanged", ids })
          }
          onIssue={requestBulkIssue}
        />
      ) : null}

      <CouponEditConfirmDialog
        confirmState={state.confirmState}
        onClose={() => dispatch({ type: "confirmCleared" })}
      />
    </main>
  );
}
