import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useSearchParams } from "react-router-dom";
import { Empty } from "@/components/composite/empty";
import {
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui-extended/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  InquiryForm,
  type InquiryFormData,
} from "@/features/my-page/inquiry/components/inquiry-form";
import { InquiryCard } from "@/features/my-page/inquiry/components/inquiry-card";
import {
  useCreateInquiry,
  useDeleteInquiry,
  useInquiries,
  useUpdateInquiry,
} from "@/features/my-page/inquiry/api/inquiry-query";
import {
  INQUIRY_CATEGORIES,
  type InquiryCategory,
} from "@/features/my-page/inquiry/types/inquiry-item";
import { toast } from "@/lib/toast";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { useModalStore } from "@/store/modal";

const sectionMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};
const MAX_INQUIRY_CARD_DELAY = 0.72;

export default function InquiryPage() {
  const { confirm } = useModalStore();
  // null = 닫힘, 'new' = 새 문의 작성, string = 수정 중인 문의 ID
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<
    InquiryFormData | undefined
  >(undefined);
  const { isMobile } = useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: inquiries = [], isLoading, error } = useInquiries();
  const createMutation = useCreateInquiry();
  const updateMutation = useUpdateInquiry();
  const deleteMutation = useDeleteInquiry();

  const isEditingInquiry =
    editingInquiryId != null && editingInquiryId !== "new";
  const editingInquiry = isEditingInquiry
    ? inquiries.find((i) => i.id === editingInquiryId)
    : null;

  useEffect(() => {
    const rawCategory = searchParams.get("category");
    const category = INQUIRY_CATEGORIES.includes(rawCategory as InquiryCategory)
      ? (rawCategory as InquiryCategory)
      : null;
    const productId = searchParams.get("productId");
    const productName = searchParams.get("productName");
    const parsedProductId = productId
      ? Number.isNaN(Number(productId))
        ? undefined
        : Number(productId)
      : undefined;

    if (category) {
      setInitialFormData({
        category,
        productId: parsedProductId,
        productName:
          parsedProductId !== undefined
            ? (productName ?? undefined)
            : undefined,
        title: "",
        content: "",
      });
      if (isMobile) {
        setEditingInquiryId(null);
        setIsSheetOpen(true);
      } else {
        setEditingInquiryId("new");
      }

      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("category");
      nextSearchParams.delete("productId");
      nextSearchParams.delete("productName");
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [isMobile, searchParams, setSearchParams]);

  const handleEdit = (id: string) => {
    setEditingInquiryId(id);
    if (isMobile) setIsSheetOpen(true);
  };

  const handleDelete = (id: string) => {
    confirm("문의를 삭제하시겠습니까?", () => {
      deleteMutation.mutate(id, {
        onSuccess: (_, deletedInquiryId) => {
          toast.success("문의가 삭제되었습니다.");
          if (deletedInquiryId === editingInquiryId) {
            setEditingInquiryId(null);
            setIsSheetOpen(false);
          }
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "삭제에 실패했습니다.",
          );
        },
      });
    });
  };

  const handleFormSubmit = useCallback(
    (data: InquiryFormData) => {
      if (isEditingInquiry && editingInquiryId) {
        updateMutation.mutate(
          {
            id: editingInquiryId,
            category: data.category,
            productId: data.productId,
            title: data.title,
            content: data.content,
          },
          {
            onSuccess: () => {
              toast.success("문의가 수정되었습니다.");
              setEditingInquiryId(null);
              setIsSheetOpen(false);
            },
            onError: (err) => {
              toast.error(
                err instanceof Error ? err.message : "수정에 실패했습니다.",
              );
            },
          },
        );
      } else {
        createMutation.mutate(
          {
            category: data.category,
            productId: data.productId,
            title: data.title,
            content: data.content,
          },
          {
            onSuccess: () => {
              toast.success("문의가 등록되었습니다.");
              setEditingInquiryId(null);
              setIsSheetOpen(false);
            },
            onError: (err) => {
              toast.error(
                err instanceof Error ? err.message : "등록에 실패했습니다.",
              );
            },
          },
        );
      }
    },
    [isEditingInquiry, editingInquiryId, updateMutation, createMutation],
  );

  const handleFormCancel = () => {
    setEditingInquiryId(null);
    setInitialFormData(undefined);
    setIsSheetOpen(false);
  };

  const handleNewInquiry = () => {
    setInitialFormData(undefined);
    if (isMobile) {
      setEditingInquiryId(null);
      setIsSheetOpen(true);
    } else {
      setEditingInquiryId((prev) => (prev === null ? "new" : null));
    }
  };

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const initialData = useMemo<InquiryFormData | undefined>(() => {
    if (editingInquiry) {
      return {
        category: editingInquiry.category,
        productId: editingInquiry.product?.id,
        productName: editingInquiry.product?.name,
        productImage: editingInquiry.product?.image,
        title: editingInquiry.title,
        content: editingInquiry.content,
      };
    }
    return initialFormData;
  }, [editingInquiry, initialFormData]);

  const summaryItems = useMemo(() => {
    const pendingCount = inquiries.filter(
      (item) => item.status === "답변대기",
    ).length;
    const answeredCount = inquiries.length - pendingCount;
    type AnsweredInquiry = (typeof inquiries)[number] & { answerDate: string };
    const latestAnsweredInquiry = inquiries.reduce<AnsweredInquiry | undefined>(
      (latest, item) => {
        if (typeof item.answerDate !== "string") return latest;
        const answeredItem = item as AnsweredInquiry;
        if (!latest) return answeredItem;
        return new Date(answeredItem.answerDate).getTime() >
          new Date(latest.answerDate).getTime()
          ? answeredItem
          : latest;
      },
      undefined,
    );
    return [
      { label: "전체", value: `${inquiries.length}건` },
      { label: "답변 대기", value: `${pendingCount}건` },
      { label: "답변 완료", value: `${answeredCount}건` },
      {
        label: "최근 답변",
        value: latestAnsweredInquiry?.answerDate
          ? new Date(latestAnsweredInquiry.answerDate).toLocaleDateString(
              "ko-KR",
            )
          : "없음",
      },
    ];
  }, [inquiries]);
  const isDesktopComposerOpen = !isMobile && editingInquiryId !== null;

  const inquiryFormProps = useMemo(
    () => ({
      inquiryId: editingInquiryId !== "new" ? editingInquiryId : null,
      initialData,
      onSubmit: handleFormSubmit,
      isPending: createMutation.isPending || updateMutation.isPending,
    }),
    [
      editingInquiryId,
      initialData,
      handleFormSubmit,
      createMutation.isPending,
      updateMutation.isPending,
    ],
  );

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex min-h-96 items-center justify-center">
            <div className="text-zinc-500">문의 목록을 불러오는 중...</div>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <MainContent>
          <div className="px-4 lg:px-0">
            <Empty
              title="문의 목록을 불러올 수 없습니다."
              description={
                error instanceof Error ? error.message : "오류가 발생했습니다."
              }
            />
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <PageLayout
          sidebar={
            isDesktopComposerOpen ? (
              <motion.div
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <UtilityPageAside
                  title={isEditingInquiry ? "문의 수정" : "문의 등록"}
                  description="문의 유형과 내용을 정리해 등록하세요."
                  tone="muted"
                >
                  <div className="pt-1">
                    <InquiryForm
                      {...inquiryFormProps}
                      onCancel={handleFormCancel}
                    />
                  </div>
                </UtilityPageAside>
              </motion.div>
            ) : undefined
          }
          actionBar={
            isMobile ? (
              <Button className="w-full" onClick={handleNewInquiry} size="xl">
                1:1 문의 등록
              </Button>
            ) : undefined
          }
          contentClassName="py-4 lg:py-8"
        >
          <div className="space-y-8 lg:space-y-10">
            <motion.div {...sectionMotion}>
              <UtilityPageIntro
                eyebrow="Inquiry Desk"
                title="1:1 문의"
                description="문의 현황을 확인하고 필요한 항목만 바로 작성할 수 있습니다."
                actions={
                  !isMobile ? (
                    <Button onClick={handleNewInquiry} size="lg">
                      {isDesktopComposerOpen
                        ? "작성 패널 닫기"
                        : "새 문의 작성"}
                    </Button>
                  ) : undefined
                }
                meta={
                  <div className="grid overflow-hidden rounded-2xl border border-stone-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-stone-200 xl:grid-cols-4">
                    {summaryItems.map((item) => (
                      <div
                        key={item.label}
                        className="border-b border-stone-200 px-4 py-4 last:border-b-0 sm:border-b-0 lg:px-5 lg:py-5"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                          {item.label}
                        </p>
                        <p className="mt-2 text-lg font-semibold tracking-tight text-zinc-950">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                }
              />
            </motion.div>

            <motion.div
              {...sectionMotion}
              transition={{ ...sectionMotion.transition, delay: 0.05 }}
            >
              <UtilityPageSection
                title="문의 목록"
                description="답변 대기 상태의 문의만 수정하거나 삭제할 수 있습니다."
              >
                {inquiries.length === 0 ? (
                  <div className="px-4 lg:px-0">
                    <Empty
                      title="문의 내역이 없습니다."
                      description="궁금한 점이 생기면 새 문의를 등록해 주세요."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200">
                    {inquiries.map((inquiry, index) => (
                      <motion.div
                        key={inquiry.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.28,
                          ease: "easeOut",
                          delay: Math.min(index * 0.03, MAX_INQUIRY_CARD_DELAY),
                        }}
                      >
                        <InquiryCard
                          inquiry={inquiry}
                          isMutating={isMutating}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </UtilityPageSection>
            </motion.div>
          </div>
        </PageLayout>

        {isMobile && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent side="bottom" className="h-[92svh] rounded-t-3xl">
              <SheetHeader className="px-4 pt-5">
                <SheetTitle>
                  {isEditingInquiry ? "문의 수정" : "새 문의 작성"}
                </SheetTitle>
                <SheetDescription>
                  문의 유형과 내용을 입력하면 답변 상태를 이 화면에서 계속
                  확인할 수 있습니다.
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
                <InquiryForm
                  {...inquiryFormProps}
                  onCancel={handleFormCancel}
                />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </MainContent>
    </MainLayout>
  );
}
