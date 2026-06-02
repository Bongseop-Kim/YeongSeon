import { Text } from "seed-design/ui/text";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { loginAdmin } from "@/features/auth/api/auth-api";
import "./auth.css";

export function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("이메일을 입력하세요.");
      return;
    }
    if (!password) {
      setErrorMessage("비밀번호를 입력하세요.");
      return;
    }

    setIsPending(true);
    try {
      await loginAdmin({ email: trimmedEmail, password });
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "로그인에 실패했습니다.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <main className="authPage">
      <section className="authCard" aria-labelledby="admin-login-title">
        <div className="authTitleGroup">
          <Text
            as="h1"
            textStyle="screenTitle"
            id="admin-login-title"
            className="authTitle"
          >
            ESSE SION 관리자
          </Text>
          <Text as="p" textStyle="t4Regular" className="authDescription">
            관리자 권한이 있는 계정으로 로그인하세요.
          </Text>
        </div>

        {errorMessage ? (
          <Callout tone="critical" description={errorMessage} role="alert" />
        ) : null}

        <form className="authForm" autoComplete="off" onSubmit={handleSubmit}>
          <TextField
            label="이메일"
            value={email}
            disabled={isPending}
            onValueChange={({ value }) => setEmail(value)}
          >
            <TextFieldInput
              id="admin-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="admin@example.com"
              disabled={isPending}
            />
          </TextField>

          <TextField
            label="비밀번호"
            value={password}
            disabled={isPending}
            onValueChange={({ value }) => setPassword(value)}
          >
            <TextFieldInput
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              disabled={isPending}
            />
          </TextField>

          <div className="authActions">
            <ActionButton
              type="submit"
              loading={isPending}
              disabled={isPending}
            >
              로그인
            </ActionButton>
          </div>
        </form>
      </section>
    </main>
  );
}
