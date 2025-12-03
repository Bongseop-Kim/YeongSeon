import { Button } from "@/components/ui/button";
import { Controller, useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";

interface InquiryFormData {
  title: string;
  content: string;
}

interface InquiryFormProps {
  inquiryId?: string | null;
  initialData?: InquiryFormData;
  onSubmit: (data: InquiryFormData) => void;
  onCancel?: () => void;
}

// 더미 데이터 (실제로는 API에서 가져와야 함)
const getInquiryById = (id: string): InquiryFormData | null => {
  const dummyInquiries: Record<string, InquiryFormData> = {
    "2": {
      title: "맞춤 제작 문의",
      content: "맞춤 제작 시 최소 수량이 어떻게 되나요?",
    },
    "5": {
      title: "제품 재고 문의",
      content: "해당 제품 재입고 예정이 있나요?",
    },
  };
  return dummyInquiries[id] || null;
};

export const InquiryForm = ({
  inquiryId,
  initialData,
  onSubmit,
  onCancel,
}: InquiryFormProps) => {
  const isEditMode = !!inquiryId;

  const form = useForm<InquiryFormData>({
    defaultValues: initialData || {
      title: "",
      content: "",
    },
  });

  useEffect(() => {
    if (isEditMode && inquiryId && !initialData) {
      const inquiryData = getInquiryById(inquiryId);
      if (inquiryData) {
        form.reset(inquiryData);
      }
    }
  }, [isEditMode, inquiryId, initialData, form]);

  const handleSubmit = (data: InquiryFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label>제목</Label>
          <Controller
            name="title"
            control={form.control}
            rules={{ required: "제목을 입력해주세요." }}
            render={({ field, fieldState }) => (
              <>
                <Input
                  type="text"
                  placeholder="제목을 입력해주세요."
                  {...field}
                  className="w-full"
                />
                {fieldState.error && (
                  <p className="text-sm text-red-500">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>문의 내용</Label>
          <Controller
            name="content"
            control={form.control}
            rules={{ required: "문의 내용을 입력해주세요." }}
            render={({ field, fieldState }) => (
              <>
                <Textarea
                  placeholder="문의 내용을 입력해주세요."
                  className="min-h-[200px] resize-none"
                  {...field}
                />
                {fieldState.error && (
                  <p className="text-sm text-red-500">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              취소
            </Button>
          )}
          <Button type="submit" className="flex-1">
            {isEditMode ? "수정하기" : "등록하기"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
