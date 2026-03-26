import { create } from "zustand";

interface ModalState {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText: string;
  cancelText: string;
  hideCancelButton: boolean;
  confirmVariant:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalStore extends ModalState {
  openModal: (config: {
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    hideCancelButton?: boolean;
    confirmVariant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
  closeModal: () => void;
  confirm: (
    message: string,
    onConfirm?: () => void,
    options?: { confirmText?: string; cancelText?: string },
  ) => void;
  alert: (message: string) => void;
}

export const useModalStore = create<ModalStore>((set, get) => ({
  isOpen: false,
  title: "",
  description: "",
  confirmText: "확인",
  cancelText: "취소",
  hideCancelButton: false,
  confirmVariant: "default",
  onConfirm: undefined,
  onCancel: undefined,

  openModal: (config) => {
    set({
      isOpen: true,
      title: config.title,
      description: config.description,
      confirmText: config.confirmText || "확인",
      cancelText: config.cancelText || "취소",
      hideCancelButton: config.hideCancelButton ?? false,
      confirmVariant: config.confirmVariant || "default",
      onConfirm: config.onConfirm,
      onCancel: config.onCancel,
    });
  },

  closeModal: () => {
    set({
      isOpen: false,
      title: "",
      description: "",
      confirmText: "확인",
      cancelText: "취소",
      hideCancelButton: false,
      confirmVariant: "default",
      onConfirm: undefined,
      onCancel: undefined,
    });
  },

  confirm: (message, onConfirm, options) => {
    get().openModal({
      title: "확인",
      description: message,
      confirmText: options?.confirmText || "확인",
      cancelText: options?.cancelText || "취소",
      onConfirm,
    });
  },

  alert: (message) => {
    get().openModal({
      title: "알림",
      description: message,
      confirmText: "확인",
      hideCancelButton: true,
    });
  },
}));
