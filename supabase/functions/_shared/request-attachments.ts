type AttachmentType = "color" | "pattern" | "fabric" | "image" | "ci-placement";

const LOG_ATTACHMENT_TYPES: readonly AttachmentType[] = [
  "color",
  "pattern",
  "fabric",
  "image",
  "ci-placement",
] as const;

const MAX_ATTACHMENT_COUNT = 20;
const MAX_ATTACHMENT_LABEL_LENGTH = 120;
const MAX_ATTACHMENT_VALUE_LENGTH = 500;
const MAX_ATTACHMENT_FILE_NAME_LENGTH = 120;
const MAX_ATTACHMENT_ID_LENGTH = 120;
const MAX_ATTACHMENT_URL_LENGTH = 2048;
const SAFE_FILE_NAME_PATTERN = /^[^\\/:*?"<>|]+$/;

export type LogRequestAttachment = {
  type: AttachmentType;
  label: string;
  value: string;
  fileName?: string;
};

export type SessionAttachment = {
  type?: LogRequestAttachment["type"];
  label?: string;
  value?: string;
  fileName?: string;
  filename?: string;
  url?: string;
  id?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toTrimmedString(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }

  return trimmedValue.slice(0, maxLength);
}

function toSanitizedFileName(value: unknown): string | undefined {
  const fileName = toTrimmedString(value, MAX_ATTACHMENT_FILE_NAME_LENGTH);
  if (
    !fileName ||
    hasControlCharacter(fileName) ||
    !SAFE_FILE_NAME_PATTERN.test(fileName)
  ) {
    return undefined;
  }

  return fileName;
}

function isAttachmentType(value: unknown): value is AttachmentType {
  return (
    typeof value === "string" &&
    LOG_ATTACHMENT_TYPES.some((attachmentType) => attachmentType === value)
  );
}

function toAttachmentType(
  value: unknown,
): LogRequestAttachment["type"] | undefined {
  return isAttachmentType(value) ? value : undefined;
}

function isControlCharacterCode(code: number): boolean {
  return code <= 0x1f || code === 0x7f || (code >= 0x80 && code <= 0x9f);
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    if (isControlCharacterCode(character.charCodeAt(0))) {
      return true;
    }
  }

  return false;
}

function toBaseAttachmentFields(attachment: Record<string, unknown>): {
  type?: LogRequestAttachment["type"];
  label?: string;
  value?: string;
} {
  return {
    type: toAttachmentType(attachment.type),
    label: toTrimmedString(attachment.label, MAX_ATTACHMENT_LABEL_LENGTH),
    value: toTrimmedString(attachment.value, MAX_ATTACHMENT_VALUE_LENGTH),
  };
}

export function sanitizeLogRequestAttachments(
  value: unknown,
): LogRequestAttachment[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const attachments = value
    .slice(0, MAX_ATTACHMENT_COUNT)
    .filter(isRecord)
    .map((attachment) => {
      const {
        type,
        label,
        value: attachmentValue,
      } = toBaseAttachmentFields(attachment);
      const fileName = toSanitizedFileName(attachment.fileName);

      if (!type || !label || !attachmentValue) {
        return null;
      }

      return {
        type,
        label,
        value: attachmentValue,
        ...(fileName ? { fileName } : {}),
      };
    })
    .filter(
      (attachment): attachment is LogRequestAttachment => attachment !== null,
    );

  return attachments.length > 0 ? attachments : null;
}

export function sanitizeSessionAttachments(
  value: unknown,
): SessionAttachment[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const attachments = value
    .slice(0, MAX_ATTACHMENT_COUNT)
    .filter(isRecord)
    .map((attachment) => {
      const sanitizedAttachment: SessionAttachment = {};
      const {
        type,
        label,
        value: attachmentValue,
      } = toBaseAttachmentFields(attachment);
      const fileName = toSanitizedFileName(attachment.fileName);
      const filename = toSanitizedFileName(attachment.filename);
      const url = toTrimmedString(attachment.url, MAX_ATTACHMENT_URL_LENGTH);
      const id = toTrimmedString(attachment.id, MAX_ATTACHMENT_ID_LENGTH);

      if (type) {
        sanitizedAttachment.type = type;
      }
      if (label) {
        sanitizedAttachment.label = label;
      }
      if (attachmentValue) {
        sanitizedAttachment.value = attachmentValue;
      }
      if (fileName) {
        sanitizedAttachment.fileName = fileName;
      }
      if (filename) {
        sanitizedAttachment.filename = filename;
      }
      if (url) {
        sanitizedAttachment.url = url;
      }
      if (id) {
        sanitizedAttachment.id = id;
      }

      return Object.keys(sanitizedAttachment).length > 0
        ? sanitizedAttachment
        : null;
    })
    .filter(
      (attachment): attachment is SessionAttachment => attachment !== null,
    );

  return attachments.length > 0 ? attachments : null;
}
