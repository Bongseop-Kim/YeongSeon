import { useLogin } from "@refinedev/core";
import { Button, Card, Form, Input, Typography, Alert, Space } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useState } from "react";

const { Title } = Typography;

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin();
  const [error, setError] = useState<string | null>(null);

  const onFinish = (values: { email: string; password: string }) => {
    setError(null);
    login(values, {
      onError: (err) => {
        setError(err?.message ?? "로그인에 실패했습니다.");
      },
    });
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f0f2f5",
      }}
    >
      <Card style={{ width: 400 }}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Title level={3} style={{ textAlign: "center", margin: 0 }}>
            ESSE SION 관리자
          </Title>

          {error && <Alert message={error} type="error" showIcon />}

          <Form layout="vertical" onFinish={onFinish} autoComplete="off">
            <Form.Item
              name="email"
              rules={[{ required: true, message: "이메일을 입력하세요" }]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="이메일"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: "비밀번호를 입력하세요" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="비밀번호"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                loading={isPending}
              >
                로그인
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
