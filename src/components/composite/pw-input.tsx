import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input } from "../ui/input";
import { useState } from "react";

export const PwInput = ({ ...props }: React.ComponentProps<"input">) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      type={showPassword ? "text" : "password"}
      placeholder="비밀번호를 입력해주세요."
      {...props}
      icon={
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
