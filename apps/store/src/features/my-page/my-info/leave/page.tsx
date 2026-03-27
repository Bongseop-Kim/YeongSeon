import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui-extended/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { ROUTES } from "@/constants/ROUTES";
import { signOut } from "@/features/auth/api/auth-api";
import { useDeleteAccount } from "@/features/auth/api/auth-query";
import { toast } from "@/lib/toast";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { useAuthStore } from "@/store/auth";
import { useModalStore } from "@/store/modal";
import {
  UtilityPageAside,
  UtilityPageIntro,
} from "@/components/composite/utility-page";

function LeaveConfirmationBlock({
  agree,
  isPending,
  onLeave,
  onCancel,
  control,
}: {
  agree: boolean;
  isPending: boolean;
  onLeave: () => void;
  onCancel: () => void;
  control: ReturnType<typeof useForm<{ agree: boolean }>>["control"];
}) {
  return (
    <UtilityPageAside
      title="탈퇴 확인"
      description="유의사항을 확인한 뒤 동의 체크를 해야 탈퇴를 진행할 수 있습니다."
      tone="danger"
    >
      <Controller
        name="agree"
        control={control}
        render={({ field }) => (
          <Field orientation="horizontal" className="items-start gap-3">
            <Checkbox
              id="agree"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <FieldContent className="gap-1">
              <FieldLabel htmlFor="agree">
                <FieldTitle>탈퇴 동의</FieldTitle>
              </FieldLabel>
              <FieldDescription className="mt-0">
                유의사항을 확인하였으며, 이에 동의합니다.
              </FieldDescription>
            </FieldContent>
          </Field>
        )}
      />

      <div className="mt-5 flex flex-col gap-2">
        <Button
          variant="destructive"
          className="w-full"
          disabled={!agree || isPending}
          onClick={onLeave}
        >
          {isPending ? "처리 중..." : "회원 탈퇴"}
        </Button>
        <Button className="w-full" variant="outline" onClick={onCancel}>
          탈퇴 그만두기
        </Button>
      </div>
    </UtilityPageAside>
  );
}

export default function MyInfoLeavePage() {
  const form = useForm<{ agree: boolean }>({
    defaultValues: { agree: false },
  });
  const { isMobile } = useBreakpoint();

  const navigate = useNavigate();
  const { confirm } = useModalStore();
  const deleteAccount = useDeleteAccount();

  const agree = form.watch("agree");

  const handleLeave = () => {
    confirm("정말 탈퇴하시겠습니까?", () => {
      deleteAccount.mutate(undefined, {
        onSuccess: async () => {
          try {
            await signOut();
            useAuthStore.setState({ user: null, initialized: false });
            toast.success("회원탈퇴가 완료되었습니다.");
            navigate(ROUTES.HOME);
          } catch {
            toast.error(
              "로그아웃 중 오류가 발생했습니다. 앱을 재시작해주세요.",
            );
          }
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "회원탈퇴에 실패했습니다. 다시 시도해주세요.",
          );
        },
      });
    });
  };

  return (
    <MainLayout>
      <MainContent>
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-8 lg:space-y-10">
            <UtilityPageIntro
              eyebrow="Account Close"
              title="회원탈퇴"
              description="탈퇴 후 복구가 어려운 항목이 있으므로 아래 내용을 먼저 확인해 주세요."
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-12">
              <div className="min-w-0 px-4 lg:px-0">
                <div className="space-y-5">
                  <div className="border-b border-stone-200 pb-4">
                    <p className="text-sm font-semibold text-zinc-950">
                      아이디 재사용 및 복구 불가
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      사용 중인 아이디는 탈퇴 후 본인과 타인 모두 다시 사용할 수
                      없습니다.
                    </p>
                  </div>
                  <div className="border-b border-stone-200 pb-4">
                    <p className="text-sm font-semibold text-zinc-950">
                      회원정보 및 이용기록 삭제
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      데이터는 영구 삭제되며 복구되지 않습니다. 단, 스토어 주문
                      정보는 관련 법령에 따라 5년간 분리 보관됩니다.
                    </p>
                  </div>
                  <div className="border-b border-stone-200 pb-4">
                    <p className="text-sm font-semibold text-zinc-950">
                      탈퇴 후 재가입 제한
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      회원 탈퇴 이후 동일 계정으로 다시 가입할 수 없습니다.
                    </p>
                  </div>
                  <div className="border-b border-stone-200 pb-4">
                    <p className="text-sm font-semibold text-zinc-950">
                      등록 게시물 유지
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      게시글, 댓글, 후기 등은 자동 삭제되지 않습니다. 원하지
                      않는 게시물은 탈퇴 전에 직접 삭제해 주세요.
                    </p>
                  </div>
                </div>

                {isMobile ? (
                  <div className="mt-8">
                    <LeaveConfirmationBlock
                      agree={agree}
                      isPending={deleteAccount.isPending}
                      onLeave={handleLeave}
                      onCancel={() => navigate(-1)}
                      control={form.control}
                    />
                  </div>
                ) : null}
              </div>

              {!isMobile ? (
                <div className="min-w-0 space-y-5 px-4 lg:sticky lg:top-24 lg:self-start lg:px-0">
                  <LeaveConfirmationBlock
                    agree={agree}
                    isPending={deleteAccount.isPending}
                    onLeave={handleLeave}
                    onCancel={() => navigate(-1)}
                    control={form.control}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
