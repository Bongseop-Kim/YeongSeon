import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "../ui/input";
import { useState } from "react";

export const PwInput = (
  { placeholder, disabled, id, ...props }: Omit<React.ComponentProps<"input">, "type">
) => {
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
        <div
          onClick={() => {
            setShowPassword(!showPassword);
          }}
          className="cursor-pointer"
        >
          {showPassword ? (
            <EyeIcon className="size-4 text-muted-foreground" />
          ) : (
            <EyeOffIcon className="size-4 text-muted-foreground" />
          )}
        </div>
      }
    />
  );
};
