import { create } from "zustand";

type ModalType = "alert" | "confirm" | "custom";

interface ModalState {
  isOpen: boolean;
  modalType: ModalType;
  title: string;
  description?: string;
  children?: React.ReactNode | (() => React.ReactNode);
  confirmText: string;
  cancelText: string;
  confirmVariant:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  customFooter?: React.ReactNode | (() => React.ReactNode);
  showDefaultFooter: boolean;
  fullScreenOnMobile: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalStore extends ModalState {
  openModal: (config: {
    title?: string;
    modalType?: ModalType;
    description?: string;
    children?: React.ReactNode | (() => React.ReactNode);
    confirmText?: string;
    cancelText?: string;
    confirmVariant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
    customFooter?: React.ReactNode | (() => React.ReactNode);
    showDefaultFooter?: boolean;
    fullScreenOnMobile?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
  }) => void;
  closeModal: () => void;
  confirm: (
    message: string,
    onConfirm?: () => void,
    options?: { confirmText?: string; cancelText?: string }
  ) => void;
  alert: (
    message: string,
    onConfirm?: () => void,
    options?: { title?: string; confirmText?: string }
  ) => void;
}

export const useModalStore = create<ModalStore>((set, get) => ({
  isOpen: false,
  modalType: "confirm",
  title: "",
  description: "",
  children: null,
  confirmText: "확인",
  cancelText: "취소",
  confirmVariant: "default",
  customFooter: undefined,
  showDefaultFooter: true,
  fullScreenOnMobile: false,
  onConfirm: undefined,
  onCancel: undefined,

  openModal: (config) => {
    set({
      isOpen: true,
      modalType: config.modalType || "confirm",
      title: config.title,
      description: config.description,
      children: config.children,
      confirmText: config.confirmText || "확인",
      cancelText: config.cancelText || "취소",
      confirmVariant: config.confirmVariant || "default",
      customFooter: config.customFooter,
      showDefaultFooter: config.showDefaultFooter !== false,
      fullScreenOnMobile: config.fullScreenOnMobile || false,
      onConfirm: config.onConfirm,
      onCancel: config.onCancel,
    });
  },

  closeModal: () => {
    set({
      isOpen: false,
      modalType: "confirm",
      title: "",
      description: "",
      children: null,
      confirmText: "확인",
      cancelText: "취소",
      confirmVariant: "default",
      customFooter: undefined,
      showDefaultFooter: true,
      fullScreenOnMobile: false,
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

  alert: (message, onConfirm, options) => {
    get().openModal({
      modalType: "alert",
      title: options?.title,
      description: message,
      confirmText: options?.confirmText || "확인",
      onConfirm,
    });
  },
}));
