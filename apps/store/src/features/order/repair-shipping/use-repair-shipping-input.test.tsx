import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ShippingAddress } from "@/entities/shipping";
import {
  createRepairShippingDraft,
  createRepairShippingRequest,
  getRepairShippingPaymentBlocker,
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

  it("creates a direct tracking draft with trimmed tracking values", async () => {
    const { result } = renderHook(() => useRepairShippingInput());

    act(() => {
      result.current.actions.setTrackingMode("has-tracking");
      result.current.actions.setCourierCompany("CJ");
      result.current.actions.setTrackingNumber(" 1234567890 ");
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
            url: "https://image.example/uploaded.jpg",
            fileId: "uploaded-file",
          },
        ],
      },
    });
    expect(uploadRepairShippingPhotos).toHaveBeenCalledWith([]);
  });
});
