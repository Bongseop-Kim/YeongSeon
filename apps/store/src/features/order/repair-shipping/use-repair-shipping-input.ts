import { useReducer } from "react";
import type { ShippingAddress } from "@/entities/shipping";
import type { CreateOrderRepairShippingRequest } from "@/entities/order";
import type { RepairNoTrackingReason } from "@/shared/constants/REPAIR_SHIPPING";
import type {
  RepairShippingDraft,
  RepairShippingPhoto,
} from "@/shared/store/order";
import {
  EMPTY_PICKUP_REQUEST,
  type PickupRequestInfo,
} from "./pickup-request-model";
import type { RepairShippingMethod } from "./components/shipping-method-choice";
import type { TrackingMode } from "./components/tracking-mode-toggle";
import { uploadRepairShippingPhotos } from "./upload-repair-shipping-photos";

interface PrefilledTracking {
  courierCompany: string;
  trackingNumber: string;
  photos?: RepairShippingPhoto[];
}

interface PrefilledNoTracking {
  reason: RepairNoTrackingReason;
  memo: string;
  photos?: RepairShippingPhoto[];
}

interface UseRepairShippingInputOptions {
  initialTrackingMode?: TrackingMode | null;
  initialTracking?: PrefilledTracking | null;
  initialNoTracking?: PrefilledNoTracking | null;
}

export interface RepairShippingInputState {
  repairMethod: RepairShippingMethod;
  trackingMode: TrackingMode | null;
  courierCompany: string;
  trackingNumber: string;
  uploadedTrackingPhotos: RepairShippingPhoto[];
  trackingPhotos: File[];
  noTrackingReason: RepairNoTrackingReason | "";
  uploadedNoTrackingPhotos: RepairShippingPhoto[];
  noTrackingPhotos: File[];
  noTrackingMemo: string;
  pickupInfo: PickupRequestInfo;
  isPickupPostcodeOpen: boolean;
}

type RepairShippingInputAction =
  | { type: "setRepairMethod"; value: RepairShippingMethod }
  | { type: "setTrackingMode"; value: TrackingMode | null }
  | { type: "setCourierCompany"; value: string }
  | { type: "setTrackingNumber"; value: string }
  | { type: "setTrackingPhotos"; value: File[] }
  | { type: "retainUploadedTrackingPhotoUrls"; urls: string[] }
  | { type: "setNoTrackingReason"; value: RepairNoTrackingReason }
  | { type: "setNoTrackingPhotos"; value: File[] }
  | { type: "retainUploadedNoTrackingPhotoUrls"; urls: string[] }
  | { type: "setNoTrackingMemo"; value: string }
  | { type: "setPickupInfo"; value: PickupRequestInfo }
  | { type: "setPickupPostcodeOpen"; value: boolean }
  | { type: "applyPickupPostcode"; address: string; postalCode: string };

const keepPhotosByUrls = (
  photos: RepairShippingPhoto[],
  urls: string[],
): RepairShippingPhoto[] => photos.filter((photo) => urls.includes(photo.url));

const createInitialRepairShippingInput = ({
  initialTrackingMode = null,
  initialTracking,
  initialNoTracking,
}: UseRepairShippingInputOptions = {}): RepairShippingInputState => ({
  repairMethod: "direct",
  trackingMode: initialTrackingMode,
  courierCompany: initialTracking?.courierCompany ?? "",
  trackingNumber: initialTracking?.trackingNumber ?? "",
  uploadedTrackingPhotos: initialTracking?.photos ?? [],
  trackingPhotos: [],
  noTrackingReason: initialNoTracking?.reason ?? "",
  uploadedNoTrackingPhotos: initialNoTracking?.photos ?? [],
  noTrackingPhotos: [],
  noTrackingMemo: initialNoTracking?.memo ?? "",
  pickupInfo: EMPTY_PICKUP_REQUEST,
  isPickupPostcodeOpen: false,
});

const repairShippingInputReducer = (
  state: RepairShippingInputState,
  action: RepairShippingInputAction,
): RepairShippingInputState => {
  switch (action.type) {
    case "setRepairMethod":
      return { ...state, repairMethod: action.value };
    case "setTrackingMode":
      return { ...state, trackingMode: action.value };
    case "setCourierCompany":
      return { ...state, courierCompany: action.value };
    case "setTrackingNumber":
      return { ...state, trackingNumber: action.value };
    case "setTrackingPhotos":
      return { ...state, trackingPhotos: action.value };
    case "retainUploadedTrackingPhotoUrls":
      return {
        ...state,
        uploadedTrackingPhotos: keepPhotosByUrls(
          state.uploadedTrackingPhotos,
          action.urls,
        ),
      };
    case "setNoTrackingReason":
      return { ...state, noTrackingReason: action.value };
    case "setNoTrackingPhotos":
      return { ...state, noTrackingPhotos: action.value };
    case "retainUploadedNoTrackingPhotoUrls":
      return {
        ...state,
        uploadedNoTrackingPhotos: keepPhotosByUrls(
          state.uploadedNoTrackingPhotos,
          action.urls,
        ),
      };
    case "setNoTrackingMemo":
      return { ...state, noTrackingMemo: action.value };
    case "setPickupInfo":
      return { ...state, pickupInfo: action.value };
    case "setPickupPostcodeOpen":
      return { ...state, isPickupPostcodeOpen: action.value };
    case "applyPickupPostcode":
      return {
        ...state,
        pickupInfo: {
          ...state.pickupInfo,
          address: action.address,
          postalCode: action.postalCode,
        },
        isPickupPostcodeOpen: false,
      };
  }
};

export const isRepairShippingReceiptIncomplete = (
  state: RepairShippingInputState,
) =>
  state.trackingMode === "has-tracking"
    ? !state.courierCompany?.trim() || !state.trackingNumber.trim()
    : !state.noTrackingReason;

const resolvePickupRequest = (
  state: RepairShippingInputState,
  selectedAddress: ShippingAddress | null,
) => {
  if (state.pickupInfo.sameAsShipping && selectedAddress) {
    return {
      recipientName: selectedAddress.recipientName,
      recipientPhone: selectedAddress.recipientPhone,
      postalCode: selectedAddress.postalCode ?? null,
      address: [selectedAddress.address, selectedAddress.detailAddress]
        .filter(Boolean)
        .join(" "),
      detailAddress: null,
    };
  }

  const name = state.pickupInfo.name.trim();
  const phone = state.pickupInfo.phone.trim();
  const address = state.pickupInfo.address.trim();
  if (!name || !phone || !address) return null;

  return {
    recipientName: name,
    recipientPhone: phone,
    postalCode: state.pickupInfo.postalCode.trim() || null,
    address,
    detailAddress: state.pickupInfo.detailAddress.trim() || null,
  };
};

export const getRepairShippingPaymentBlocker = (
  state: RepairShippingInputState,
  selectedAddress: ShippingAddress | null,
): string | null => {
  if (state.repairMethod === "pickup") {
    return resolvePickupRequest(state, selectedAddress)
      ? null
      : "수거지 이름, 연락처, 주소를 입력해주세요.";
  }

  if (state.trackingMode === "has-tracking") {
    return !state.courierCompany.trim() || !state.trackingNumber.trim()
      ? "택배사와 송장번호를 입력해주세요."
      : null;
  }

  if (state.trackingMode === "no-tracking" && !state.noTrackingReason) {
    return "송장번호 없이 접수하는 사유를 선택해주세요.";
  }

  return null;
};

export const createRepairShippingRequest = (
  state: RepairShippingInputState,
  selectedAddress: ShippingAddress | null,
): CreateOrderRepairShippingRequest => {
  if (state.repairMethod === "pickup") {
    const pickup = resolvePickupRequest(state, selectedAddress);
    if (!pickup) {
      throw new Error("수거지 이름, 연락처, 주소를 입력해주세요.");
    }
    return { method: "pickup", pickup };
  }

  return { method: "direct" };
};

export const createRepairShippingDraft = async (
  state: RepairShippingInputState,
): Promise<RepairShippingDraft> => {
  if (state.repairMethod !== "direct") {
    return { method: "pickup" };
  }

  if (state.trackingMode === "has-tracking") {
    const photos = [
      ...state.uploadedTrackingPhotos,
      ...(await uploadRepairShippingPhotos(state.trackingPhotos)),
    ];
    return {
      method: "direct",
      tracking: {
        courierCompany: state.courierCompany.trim(),
        trackingNumber: state.trackingNumber.trim(),
        photos,
      },
    };
  }

  if (state.trackingMode === "no-tracking") {
    const photos = [
      ...state.uploadedNoTrackingPhotos,
      ...(await uploadRepairShippingPhotos(state.noTrackingPhotos)),
    ];
    return {
      method: "direct",
      noTracking: {
        reason: state.noTrackingReason as RepairNoTrackingReason,
        memo: state.noTrackingMemo,
        photos,
      },
    };
  }

  return { method: "direct" };
};

export const useRepairShippingInput = (
  options?: UseRepairShippingInputOptions,
) => {
  const [state, dispatch] = useReducer(
    repairShippingInputReducer,
    options,
    createInitialRepairShippingInput,
  );

  return {
    state,
    actions: {
      setRepairMethod: (value: RepairShippingMethod) =>
        dispatch({ type: "setRepairMethod", value }),
      setTrackingMode: (value: TrackingMode | null) =>
        dispatch({ type: "setTrackingMode", value }),
      setCourierCompany: (value: string) =>
        dispatch({ type: "setCourierCompany", value }),
      setTrackingNumber: (value: string) =>
        dispatch({ type: "setTrackingNumber", value }),
      setTrackingPhotos: (value: File[]) =>
        dispatch({ type: "setTrackingPhotos", value }),
      retainUploadedTrackingPhotoUrls: (urls: string[]) =>
        dispatch({ type: "retainUploadedTrackingPhotoUrls", urls }),
      setNoTrackingReason: (value: RepairNoTrackingReason) =>
        dispatch({ type: "setNoTrackingReason", value }),
      setNoTrackingPhotos: (value: File[]) =>
        dispatch({ type: "setNoTrackingPhotos", value }),
      retainUploadedNoTrackingPhotoUrls: (urls: string[]) =>
        dispatch({ type: "retainUploadedNoTrackingPhotoUrls", urls }),
      setNoTrackingMemo: (value: string) =>
        dispatch({ type: "setNoTrackingMemo", value }),
      setPickupInfo: (value: PickupRequestInfo) =>
        dispatch({ type: "setPickupInfo", value }),
      setPickupPostcodeOpen: (value: boolean) =>
        dispatch({ type: "setPickupPostcodeOpen", value }),
      applyPickupPostcode: (address: string, postalCode: string) =>
        dispatch({ type: "applyPickupPostcode", address, postalCode }),
    },
  };
};

export type RepairShippingInputActions = ReturnType<
  typeof useRepairShippingInput
>["actions"];
