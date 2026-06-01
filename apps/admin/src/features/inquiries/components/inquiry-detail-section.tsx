import { Text } from "seed-design/ui/text";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldTextarea } from "seed-design/ui/text-field";
import { AdminPanelSkeleton } from "@/components/AdminSkeleton";
import { StatusBadge } from "@/components/StatusBadge";
import type { InquiryStatus } from "@/features/inquiries/types/admin-inquiry";
import {
  useAdminInquiryDetail,
  useAnswerInquiry,
} from "@/features/inquiries/api/inquiries-query";
import { IMAGEKIT_URL_ENDPOINT } from "@/lib/imagekit";
import "./inquiries.css";

function statusTone(status: InquiryStatus) {
  return status === "답변완료" ? "positive" : "warning";
}

export function InquiryDetailSection() {
  const { id } = useParams<{ id: string }>();
  const query = useAdminInquiryDetail(id);
  const answerMutation = useAnswerInquiry(id);
  const [answerText, setAnswerText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  if (query.isLoading) return <AdminPanelSkeleton lines={5} />;
  if (query.error) {
    return <Callout tone="critical" description={query.error.message} />;
  }
  if (!query.data) {
    return (
      <Callout tone="critical" description="문의 정보를 찾을 수 없습니다." />
    );
  }

  const detail = query.data;
  const handleAnswer = async (): Promise<void> => {
    if (!answerText.trim()) return;

    setNotice(null);
    try {
      await answerMutation.mutateAsync(answerText.trim());
      setAnswerText("");
      setNotice("답변이 등록되었습니다.");
    } catch {
      // mutation error is rendered below.
    }
  };

  return (
    <section className="inquiryPanel" aria-labelledby="inquiry-detail-title">
      <Text
        as="h2"
        textStyle="t6Bold"
        id="inquiry-detail-title"
        className="inquiryPanelTitle"
      >
        문의 상세
      </Text>
      {notice ? <Callout tone="positive" description={notice} /> : null}
      {answerMutation.error ? (
        <Callout
          tone="critical"
          description={`답변 등록 실패: ${answerMutation.error.message}`}
        />
      ) : null}

      <dl className="inquiryDetailGrid">
        <Text as="dt" textStyle="t4Medium" className="inquiryDetailLabel">
          제목
        </Text>
        <Text as="dd" textStyle="t4Regular">
          {detail.title}
        </Text>
        <Text as="dt" textStyle="t4Medium" className="inquiryDetailLabel">
          상태
        </Text>
        <Text as="dd" textStyle="t4Regular">
          <StatusBadge tone={statusTone(detail.status)}>
            {detail.status}
          </StatusBadge>
        </Text>
        <Text as="dt" textStyle="t4Medium" className="inquiryDetailLabel">
          문의 유형
        </Text>
        <Text as="dd" textStyle="t4Regular">
          {detail.category}
        </Text>
        {detail.category === "상품" && detail.product ? (
          <>
            <Text as="dt" textStyle="t4Medium" className="inquiryDetailLabel">
              상품
            </Text>
            <Text as="dd" textStyle="t4Regular" className="inquiryProductRow">
              <img
                src={`${IMAGEKIT_URL_ENDPOINT}${detail.product.image}`}
                alt={detail.product.name}
                className="inquiryProductImage"
              />
              <Text as="span" textStyle="t4Regular">
                {detail.product.name}
              </Text>
            </Text>
          </>
        ) : null}
        <Text as="dt" textStyle="t4Medium" className="inquiryDetailLabel">
          작성일
        </Text>
        <Text as="dd" textStyle="t4Regular">
          {detail.date}
        </Text>
        <Text as="dt" textStyle="t4Medium" className="inquiryDetailLabel">
          내용
        </Text>
        <Text as="dd" textStyle="t4Regular">
          {detail.content}
        </Text>
        {detail.type === "answered" ? (
          <>
            <Text as="dt" textStyle="t4Medium" className="inquiryDetailLabel">
              답변
            </Text>
            <Text as="dd" textStyle="t4Regular">
              {detail.answer}
            </Text>
            <Text as="dt" textStyle="t4Medium" className="inquiryDetailLabel">
              답변일
            </Text>
            <Text as="dd" textStyle="t4Regular">
              {detail.answerDate}
            </Text>
          </>
        ) : null}
      </dl>

      {detail.type === "pending" ? (
        <div className="inquiryAnswerBox">
          <TextField
            label="답변"
            value={answerText}
            onValueChange={({ value }) => setAnswerText(value)}
          >
            <TextFieldTextarea
              placeholder="답변을 입력하세요"
              aria-label="답변 입력"
            />
          </TextField>
          <div className="inquiryAnswerActions">
            <ActionButton
              type="button"
              loading={answerMutation.isPending}
              disabled={!answerText.trim() || answerMutation.isPending}
              onClick={() => void handleAnswer()}
            >
              답변 등록
            </ActionButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}
