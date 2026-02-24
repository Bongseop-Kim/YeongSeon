import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { v4 as uuidv4 } from "uuid";
import * as React from "react";

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

/**
 * 여러 ref를 하나로 병합합니다.
 * @param refs 병합할 ref들
 * @returns 병합된 ref 콜백
 */
export function mergeRefs<T = unknown>(
  ...refs: Array<React.Ref<T> | null | undefined>
): React.RefCallback<T> {
  return (value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.RefObject<T | null>).current = value;
      }
    });
  };
}
