import { create } from "zustand";

interface ModalState {
  isOpen: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmText: string;
  cancelText: string;
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
    title: string;
    description?: string;
    children?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
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
    options?: { confirmText?: string; cancelText?: string }
  ) => void;
}

export const useModalStore = create<ModalStore>((set, get) => ({
  isOpen: false,
  title: "",
  description: "",
  children: null,
  confirmText: "확인",
  cancelText: "취소",
  confirmVariant: "default",
  onConfirm: undefined,
  onCancel: undefined,

  openModal: (config) => {
    set({
      isOpen: true,
      title: config.title,
      description: config.description,
      children: config.children,
      confirmText: config.confirmText || "확인",
      cancelText: config.cancelText || "취소",
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
      children: null,
      confirmText: "확인",
      cancelText: "취소",
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
}));
