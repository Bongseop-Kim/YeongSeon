import { Button } from "@/shared/ui-extended/button";
import {
  isSupportedProvider,
  type ProviderConfig,
  type SupportedProvider,
} from "@/features/auth/constants/providers";

interface ProviderButtonProps {
  provider: ProviderConfig;
  onSignIn: (id: SupportedProvider) => void;
  isPending: boolean;
}

export function ProviderButton({
  provider,
  onSignIn,
  isPending,
}: ProviderButtonProps) {
  const supported = isSupportedProvider(provider.id);
  const handleClick = () => {
    if (isSupportedProvider(provider.id)) {
      onSignIn(provider.id);
    }
  };

  return (
    <Button
      key={provider.id}
      onClick={supported ? handleClick : undefined}
      disabled={isPending || !supported}
      variant={provider.variant}
      className={`${provider.className}${!supported ? " opacity-50 cursor-not-allowed" : ""}`}
      title={!supported ? "준비 중인 로그인 방식입니다." : undefined}
    >
      {provider.icon}
      {provider.label}
      {!supported && <span className="ml-2 text-xs font-normal">준비 중</span>}
    </Button>
  );
}
