import { Show } from "@refinedev/antd";
import { useShow, useUpdate } from "@refinedev/core";
import { Descriptions, Tag, Button, Input, Space } from "antd";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  답변대기: "warning",
  답변완료: "success",
};

export default function InquiryShow() {
  const { query: queryResult } = useShow({ resource: "inquiries" });
  const inquiry = queryResult?.data?.data;
  const [answerText, setAnswerText] = useState("");

  const { mutate: updateInquiry, mutation: updateMutation } = useUpdate();

  const handleAnswer = () => {
    if (!answerText.trim()) return;

    updateInquiry({
      resource: "inquiries",
      id: inquiry!.id as string,
      values: {
        status: "답변완료",
        answer: answerText,
        answer_date: new Date().toISOString(),
      },
    });
  };

  return (
    <Show>
      <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="제목">{inquiry?.title as string}</Descriptions.Item>
        <Descriptions.Item label="상태">
          {inquiry?.status && (
            <Tag color={STATUS_COLORS[inquiry.status as string]}>
              {inquiry.status as string}
            </Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="작성일">
          {(inquiry?.created_at as string)?.slice(0, 10)}
        </Descriptions.Item>
        <Descriptions.Item label="내용">{inquiry?.content as string}</Descriptions.Item>
        {inquiry?.answer && (
          <>
            <Descriptions.Item label="답변">{inquiry.answer as string}</Descriptions.Item>
            <Descriptions.Item label="답변일">
              {(inquiry.answer_date as string)?.slice(0, 10)}
            </Descriptions.Item>
          </>
        )}
      </Descriptions>

      {inquiry?.status === "답변대기" && (
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input.TextArea
            rows={4}
            placeholder="답변을 입력하세요"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
          />
          <Button
            type="primary"
            loading={updateMutation.isPending}
            onClick={handleAnswer}
            disabled={!answerText.trim()}
          >
            답변 등록
          </Button>
        </Space>
      )}
    </Show>
  );
}
