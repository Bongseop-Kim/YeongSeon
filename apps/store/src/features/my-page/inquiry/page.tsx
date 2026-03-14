import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  InquiryForm,
  type InquiryFormData,
} from "@/features/my-page/inquiry/components/inquiry-form";
import { InquiryCard } from "./components/inquiry-card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { useModalStore } from "@/store/modal";
import { toast } from "@/lib/toast";
import { Empty } from "@/components/composite/empty";
import {
  useInquiries,
  useCreateInquiry,
  useUpdateInquiry,
  useDeleteInquiry,
} from "@/features/my-page/inquiry/api/inquiry-query";
import {
  INQUIRY_CATEGORIES,
  type InquiryCategory,
} from "@/features/my-page/inquiry/types/inquiry-item";

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
  }, []);

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
          <div className="flex items-center justify-center min-h-96">
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
          <Card>
            <Empty
              title="문의 목록을 불러올 수 없습니다."
              description={
                error instanceof Error ? error.message : "오류가 발생했습니다."
              }
            />
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <PageLayout
          sidebar={
            <Card>
              <CardContent>
                <InquiryForm {...inquiryFormProps} />
              </CardContent>
            </Card>
          }
          actionBar={
            isMobile ? (
              <Button className="w-full" onClick={handleNewInquiry} size="xl">
                1:1 문의 등록
              </Button>
            ) : undefined
          }
        >
          <>
            {inquiries.length === 0 ? (
              <Card>
                <Empty
                  title="문의 내역이 없습니다."
                  description="궁금한 점이 있으시면 문의를 등록해주세요."
                />
              </Card>
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
          </>
        </PageLayout>

        {/* 모바일 전용 Sheet */}
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
