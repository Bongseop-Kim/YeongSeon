import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShippingAddress } from "@/entities/shipping";
import {
  createRepairShippingDraft,
  createRepairShippingRequest,
  getRepairShippingPaymentBlocker,
  isRepairShippingReceiptIncomplete,
  useRepairShippingInput,
} from "./use-repair-shipping-input";
import { uploadRepairShippingPhotos } from "./upload-repair-shipping-photos";

vi.mock("./upload-repair-shipping-photos", () => ({
  uploadRepairShippingPhotos: vi.fn(async () => [
    { url: "https://image.example/uploaded.jpg", fileId: "uploaded-file" },
  ]),
}));

const selectedAddress: ShippingAddress = {
  id: "address-1",
  recipientName: "김봉섭",
  recipientPhone: "01012345678",
  postalCode: "12345",
  address: "서울시 강남구",
  detailAddress: "101호",
  isDefault: true,
};

describe("useRepairShippingInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefilled uploaded photos keep only remaining preview URLs", () => {
    const { result } = renderHook(() =>
      useRepairShippingInput({
        initialTrackingMode: "has-tracking",
        initialTracking: {
          courierCompany: "CJ",
          trackingNumber: "123",
          photos: [
            { url: "https://image.example/keep.jpg", fileId: "keep" },
            { url: "https://image.example/drop.jpg", fileId: "drop" },
          ],
        },
      }),
    );

    act(() => {
      result.current.actions.retainUploadedTrackingPhotoUrls([
        "https://image.example/keep.jpg",
      ]);
    });

    expect(result.current.state.uploadedTrackingPhotos).toEqual([
      { url: "https://image.example/keep.jpg", fileId: "keep" },
    ]);
  });

  it("creates pickup repair shipping request from the selected shipping address", () => {
    const { result } = renderHook(() => useRepairShippingInput());

    act(() => {
      result.current.actions.setRepairMethod("pickup");
    });

    expect(
      getRepairShippingPaymentBlocker(result.current.state, selectedAddress),
    ).toBeNull();
    expect(
      createRepairShippingRequest(result.current.state, selectedAddress),
    ).toEqual({
      method: "pickup",
      pickup: {
        recipientName: "김봉섭",
        recipientPhone: "01012345678",
        postalCode: "12345",
        address: "서울시 강남구 101호",
        detailAddress: null,
      },
    });
  });

  it("treats whitespace-only courier company as incomplete", () => {
    const { result } = renderHook(() => useRepairShippingInput());

    act(() => {
      result.current.actions.setTrackingMode("has-tracking");
      result.current.actions.setCourierCompany("   ");
      result.current.actions.setTrackingNumber("1234567890");
    });

    expect(isRepairShippingReceiptIncomplete(result.current.state)).toBe(true);
  });

  it("creates a direct tracking draft with trimmed tracking values and retained uploaded photos", async () => {
    const { result } = renderHook(() =>
      useRepairShippingInput({
        initialTrackingMode: "has-tracking",
        initialTracking: {
          courierCompany: "CJ",
          trackingNumber: " 1234567890 ",
          photos: [
            {
              url: "https://image.example/existing.jpg",
              fileId: "existing-file",
            },
          ],
        },
      }),
    );

    act(() => {
      result.current.actions.setTrackingMode("has-tracking");
    });

    await expect(
      createRepairShippingDraft(result.current.state),
    ).resolves.toEqual({
      method: "direct",
      tracking: {
        courierCompany: "CJ",
        trackingNumber: "1234567890",
        photos: [
          {
            url: "https://image.example/existing.jpg",
            fileId: "existing-file",
          },
          {
            url: "https://image.example/uploaded.jpg",
            fileId: "uploaded-file",
          },
        ],
      },
    });
    expect(uploadRepairShippingPhotos).toHaveBeenCalledWith([]);
  });

  it("creates a no-tracking draft with retained uploaded photos", async () => {
    const { result } = renderHook(() =>
      useRepairShippingInput({
        initialTrackingMode: "no-tracking",
        initialNoTracking: {
          reason: "quick",
          memo: "문 앞에 두었습니다.",
          photos: [
            {
              url: "https://image.example/no-tracking-existing.jpg",
              fileId: "no-tracking-existing-file",
            },
          ],
        },
      }),
    );

    await expect(
      createRepairShippingDraft(result.current.state),
    ).resolves.toEqual({
      method: "direct",
      noTracking: {
        reason: "quick",
        memo: "문 앞에 두었습니다.",
        photos: [
          {
            url: "https://image.example/no-tracking-existing.jpg",
            fileId: "no-tracking-existing-file",
          },
          {
            url: "https://image.example/uploaded.jpg",
            fileId: "uploaded-file",
          },
        ],
      },
    });
    expect(uploadRepairShippingPhotos).toHaveBeenCalledWith([]);
  });
});
