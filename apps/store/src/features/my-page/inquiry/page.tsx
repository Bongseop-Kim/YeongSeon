import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { InquiryForm } from "./components/InquiryForm";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { formatDate } from "@/utils/formatDate";
import { useModalStore } from "@/store/modal";
import { toast } from "@/lib/toast";
import { Empty } from "@/components/composite/empty";
import {
  useInquiries,
  useCreateInquiry,
  useUpdateInquiry,
  useDeleteInquiry,
} from "./api/inquiry-query";

export default function InquiryPage() {
  const { confirm } = useModalStore();
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { isMobile } = useBreakpoint();

  const { data: inquiries = [], isLoading, error } = useInquiries();
  const createMutation = useCreateInquiry();
  const updateMutation = useUpdateInquiry();
  const deleteMutation = useDeleteInquiry();

  const editingInquiry = editingInquiryId
    ? inquiries.find((i) => i.id === editingInquiryId)
    : null;

  const handleEdit = (id: string) => {
    setEditingInquiryId(id);
    setIsSheetOpen(true);
  };

  const handleDelete = (id: string) => {
    confirm("문의를 삭제하시겠습니까?", () => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success("문의가 삭제되었습니다.");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "삭제에 실패했습니다.",
          );
        },
      });
    });
  };

  const handleFormSubmit = (data: { title: string; content: string }) => {
    if (editingInquiryId) {
      updateMutation.mutate(
        { id: editingInquiryId, ...data },
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
      createMutation.mutate(data, {
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
      });
    }
  };

  const handleFormCancel = () => {
    setEditingInquiryId(null);
    setIsSheetOpen(false);
  };

  const handleNewInquiry = () => {
    setEditingInquiryId(null);
    setIsSheetOpen(true);
  };

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

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
        <TwoPanelLayout
          leftPanel={
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
                  <Card key={inquiry.id}>
                    <CardContent className="py-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Label className="font-bold text-base">
                                {inquiry.title}
                              </Label>
                              <Badge variant="secondary">
                                {inquiry.status}
                              </Badge>
                            </div>
                            <Label className="text-xs text-zinc-400">
                              {formatDate(inquiry.date)}
                            </Label>
                          </div>

                          {inquiry.status === "답변대기" && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isMutating}
                                onClick={() => handleEdit(inquiry.id)}
                              >
                                수정
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isMutating}
                                onClick={() => handleDelete(inquiry.id)}
                              >
                                삭제
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label className="text-zinc-600 text-sm whitespace-pre-line">
                            {inquiry.content}
                          </Label>

                          {inquiry.answer && (
                            <div className="mt-2 p-3 bg-zinc-50 rounded-md">
                              <Label className="text-xs text-zinc-600 mb-1 block">
                                답변 (
                                {inquiry.answerDate &&
                                  formatDate(inquiry.answerDate)}
                                )
                              </Label>
                              <Label className="text-sm text-zinc-700 whitespace-pre-line">
                                {inquiry.answer}
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          }
          rightPanel={
            <Card>
              <CardContent>
                <InquiryForm
                  inquiryId={editingInquiryId}
                  initialData={
                    editingInquiry
                      ? {
                          title: editingInquiry.title,
                          content: editingInquiry.content,
                        }
                      : undefined
                  }
                  onSubmit={handleFormSubmit}
                  isPending={createMutation.isPending || updateMutation.isPending}
                />
              </CardContent>
            </Card>
          }
          button={
            isMobile ? (
              <Button className="w-full" onClick={handleNewInquiry} size="xl">
                1:1 문의 등록
              </Button>
            ) : undefined
          }
        />

        {/* 모바일 전용 Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent side="bottom">
            <div className="px-4 pb-4">
              <InquiryForm
                inquiryId={editingInquiryId}
                initialData={
                  editingInquiry
                    ? {
                        title: editingInquiry.title,
                        content: editingInquiry.content,
                      }
                    : undefined
                }
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                isPending={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          </SheetContent>
        </Sheet>
      </MainContent>
    </MainLayout>
  );
}
