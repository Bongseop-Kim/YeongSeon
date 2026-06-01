import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
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
          <h1 id="admin-login-title" className="authTitle">
            ESSE SION 관리자
          </h1>
          <p className="authDescription">
            관리자 권한이 있는 계정으로 로그인하세요.
          </p>
        </div>

        {errorMessage ? (
          <Callout tone="critical" description={errorMessage} role="alert" />
        ) : null}

        <form className="authForm" autoComplete="off" onSubmit={handleSubmit}>
          <label className="authField" htmlFor="admin-email">
            <span className="authFieldLabel">이메일</span>
            <input
              id="admin-email"
              className="authInput"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="admin@example.com"
              value={email}
              disabled={isPending}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="authField" htmlFor="admin-password">
            <span className="authFieldLabel">비밀번호</span>
            <input
              id="admin-password"
              className="authInput"
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호"
              value={password}
              disabled={isPending}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

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
