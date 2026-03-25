import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Sheet, SheetContent } from "@/components/ui/sheet";
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

export default function InquiryPage() {
  const { confirm } = useModalStore();
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<
    InquiryFormData | undefined
  >(undefined);
  const { isMobile } = useBreakpoint();
  const [searchParams] = useSearchParams();

  const { data: inquiries = [], isLoading, error } = useInquiries();
  const createMutation = useCreateInquiry();
  const updateMutation = useUpdateInquiry();
  const deleteMutation = useDeleteInquiry();

  const editingInquiry = editingInquiryId
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
      if (isMobile) setIsSheetOpen(true);
    }
  }, [isMobile, searchParams]);

  const handleEdit = (id: string) => {
    setEditingInquiryId(id);
    if (isMobile) setIsSheetOpen(true);
  };

  const handleDelete = (id: string) => {
    confirm("문의를 삭제하시겠습니까?", () => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("문의가 삭제되었습니다.");
          setEditingInquiryId(null);
          setIsSheetOpen(false);
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
      if (editingInquiryId) {
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
    [editingInquiryId, updateMutation, createMutation],
  );

  const handleFormCancel = () => {
    setEditingInquiryId(null);
    setIsSheetOpen(false);
  };

  const handleNewInquiry = () => {
    setEditingInquiryId(null);
    setInitialFormData(undefined);
    setIsSheetOpen(true);
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

  const inquiryFormProps = useMemo(
    () => ({
      inquiryId: editingInquiryId,
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
            !isMobile ? (
              <UtilityPageAside
                title={editingInquiryId ? "문의 수정" : "문의 등록"}
                description="문의 유형을 선택하고 필요한 내용을 작성해 주세요."
                tone="muted"
              >
                <div className="pt-1">
                  <InquiryForm {...inquiryFormProps} />
                </div>
              </UtilityPageAside>
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
            <UtilityPageIntro
              eyebrow="Inquiry"
              title="1:1 문의 내역"
              description="등록한 문의와 답변 상태를 확인하고, 필요한 경우 새 문의를 작성합니다."
            />

            <UtilityPageSection
              title="문의 목록"
              description="답변 대기 중인 문의는 수정과 삭제가 가능합니다."
            >
              {inquiries.length === 0 ? (
                <div className="px-4 lg:px-0">
                  <Empty
                    title="문의 내역이 없습니다."
                    description="궁금한 점이 있으시면 문의를 등록해주세요."
                  />
                </div>
              ) : (
                inquiries.map((inquiry) => (
                  <InquiryCard
                    key={inquiry.id}
                    inquiry={inquiry}
                    isMutating={isMutating}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </UtilityPageSection>
          </div>
        </PageLayout>

        {isMobile && (
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent side="bottom">
              <div className="px-4 pb-4">
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
