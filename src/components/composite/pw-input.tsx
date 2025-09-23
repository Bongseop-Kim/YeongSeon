import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "../ui/input";
import { useState } from "react";

export const PwInput = ({
  placeholder,
  disabled,
  id,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      {...props}
      disabled={disabled}
      id={id}
      type={showPassword ? "text" : "password"}
      placeholder={placeholder ?? "비밀번호를 입력해주세요."}
      icon={
        <div
          onClick={() => {
            setShowPassword(!showPassword);
          }}
          className="cursor-pointer"
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()} // 인풋 포커스 유지
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
            aria-pressed={showPassword}
            aria-controls={id}
            disabled={disabled}
            className="cursor-pointer"
          >
            {showPassword ? (
              <EyeIcon className="size-4 text-muted-foreground" />
            ) : (
              <EyeOffIcon className="size-4 text-muted-foreground" />
            )}
          </button>
        </div>
      }
    />
  );
};
