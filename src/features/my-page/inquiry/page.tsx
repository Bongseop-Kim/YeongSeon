import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { InquiryItem } from "./types/inquiry-item";
import { useState } from "react";
import { InquiryForm } from "./components/InquiryForm";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useBreakpoint } from "@/providers/breakpoint-provider";
import { formatDate } from "@/utils/formatDate";
import { useModalStore } from "@/store/modal";

const dummyData: InquiryItem[] = [
  {
    id: "1",
    date: "2025-01-15",
    status: "답변완료",
    title: "배송 문의",
    content: "주문한 상품이 언제 배송되나요?",
    answer: "주문하신 상품은 1월 18일에 배송될 예정입니다. 감사합니다.",
    answerDate: "2025-01-16",
  },
  {
    id: "2",
    date: "2025-01-14",
    status: "답변대기",
    title: "맞춤 제작 문의",
    content: "맞춤 제작 시 최소 수량이 어떻게 되나요?",
  },
  {
    id: "3",
    date: "2025-01-12",
    status: "답변완료",
    title: "리폼 가격 문의",
    content: "넥타이 길이 조절 리폼 가격이 궁금합니다.",
    answer: "넥타이 길이 조절 리폼은 1개당 15,000원입니다.",
    answerDate: "2025-01-13",
  },
  {
    id: "4",
    date: "2025-01-10",
    status: "답변완료",
    title: "교환 문의",
    content: "다른 색상으로 교환 가능한가요?",
    answer: "네, 가능합니다. 고객센터로 연락 주시면 안내해드리겠습니다.",
    answerDate: "2025-01-11",
  },
  {
    id: "5",
    date: "2025-01-08",
    status: "답변대기",
    title: "제품 재고 문의",
    content: "해당 제품 재입고 예정이 있나요?",
  },
];

export default function InquiryPage() {
  const { confirm } = useModalStore();
  const [editingInquiryId, setEditingInquiryId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { isMobile } = useBreakpoint();

  const handleEdit = (id: string) => {
    setEditingInquiryId(id);
    setIsSheetOpen(true);
  };

  const handleDelete = (id: string) => {
    confirm("문의를 삭제하시겠습니까?", () => {
      console.log("삭제:", id);
      // 삭제 API 호출 로직 구현
    });
  };

  const handleFormSubmit = (data: { title: string; content: string }) => {
    console.log(editingInquiryId ? "수정:" : "등록:", data);
    // API 호출 로직 구현
    setEditingInquiryId(null);
    setIsSheetOpen(false);
  };

  const handleFormCancel = () => {
    setEditingInquiryId(null);
    setIsSheetOpen(false);
  };

  const handleNewInquiry = () => {
    setEditingInquiryId(null);
    setIsSheetOpen(true);
  };

  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <>
              {dummyData.map((inquiry) => (
                <Card key={inquiry.id}>
                  <CardContent className="py-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="font-bold text-base">
                              {inquiry.title}
                            </Label>
                            <Badge variant="secondary">{inquiry.status}</Badge>
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
                              onClick={() => handleEdit(inquiry.id)}
                            >
                              수정
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
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
              ))}
            </>
          }
          rightPanel={
            <Card>
              <CardContent>
                <InquiryForm
                  inquiryId={editingInquiryId}
                  onSubmit={handleFormSubmit}
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
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
              />
            </div>
          </SheetContent>
        </Sheet>
      </MainContent>
    </MainLayout>
  );
}
