import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 고유한 아이템 ID를 생성합니다.
 * @param parts ID를 구성할 부분들 (productId, optionId 등)
 * @returns 생성된 ID 문자열
 */
export function generateItemId(
  ...parts: (string | number | undefined)[]
): string {
  const validParts = parts.filter(
    (part) => part !== undefined && part !== null
  );

  return validParts.length > 0
    ? `${validParts.join("-")}-${uuidv4()}`
    : uuidv4();
}
