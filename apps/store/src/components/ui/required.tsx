import { cn } from "@/lib/utils";

export const Required = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => {
  return (
    <p
      className={cn(
        "text-red-500 font-bold top-[-2px] relative mr-1",
        className
      )}
      {...props}
    >
      *
    </p>
  );
};
