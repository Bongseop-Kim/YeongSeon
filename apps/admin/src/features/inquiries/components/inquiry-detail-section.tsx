import { useState } from "react";
import { Descriptions, Tag, Input, Button, Space, Spin } from "antd";
import { INQUIRY_STATUS_COLORS } from "../types/admin-inquiry";
import {
  useAdminInquiryDetail,
  useAnswerInquiry,
} from "../api/inquiries-query";
import { IMAGEKIT_URL_ENDPOINT } from "@/lib/imagekit";

export function InquiryDetailSection() {
  const { detail, isLoading } = useAdminInquiryDetail();
  const { answer, isPending } = useAnswerInquiry();
  const [answerText, setAnswerText] = useState("");

  if (isLoading) return <Spin />;
  if (!detail) return null;

  const handleAnswer = async () => {
    if (!answerText.trim()) return;
    const success = await answer(detail.id, answerText);
    if (success) setAnswerText("");
  };

  return (
    <>
      <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="제목">{detail.title}</Descriptions.Item>
        <Descriptions.Item label="상태">
          <Tag color={INQUIRY_STATUS_COLORS[detail.status]}>{detail.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="문의 유형">{detail.category}</Descriptions.Item>
        {detail.category === "상품" && detail.product && (
          <Descriptions.Item label="상품">
            <Space>
              <img
                src={`${IMAGEKIT_URL_ENDPOINT}${detail.product.image}`}
                alt={detail.product.name}
                style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }}
              />
              {detail.product.name}
            </Space>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="작성일">{detail.date}</Descriptions.Item>
        <Descriptions.Item label="내용">{detail.content}</Descriptions.Item>
        {detail.type === "answered" && (
          <>
            <Descriptions.Item label="답변">{detail.answer}</Descriptions.Item>
            <Descriptions.Item label="답변일">
              {detail.answerDate}
            </Descriptions.Item>
          </>
        )}
      </Descriptions>

      {detail.type === "pending" && (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input.TextArea
            rows={4}
            placeholder="답변을 입력하세요"
            aria-label="답변 입력"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
          />
          <Button
            type="primary"
            loading={isPending}
            onClick={handleAnswer}
            disabled={!answerText.trim()}
          >
            답변 등록
          </Button>
        </Space>
      )}
    </>
  );
}
