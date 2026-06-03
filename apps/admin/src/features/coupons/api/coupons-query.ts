import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCoupon,
  getCoupon,
  getCoupons,
  getIssuedCoupons,
  getPresetCouponUsers,
  issueCoupons,
  revokeIssuedCoupons,
  updateCoupon,
} from "@/features/coupons/api/coupons-api";
import type {
  AdminCouponFormValues,
  CouponPresetKey,
  IssuedCouponRow,
} from "@/features/coupons/types/admin-coupon";

export const COUPON_PAGE_SIZE = 20;

export function useCouponsQuery(page: number) {
  return useQuery({
    queryKey: ["coupons", "list", page, COUPON_PAGE_SIZE],
    queryFn: () => getCoupons({ page, pageSize: COUPON_PAGE_SIZE }),
  });
}

export function useCouponQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["coupons", "detail", id],
    queryFn: () => getCoupon(id ?? ""),
    enabled: Boolean(id),
  });
}

export function useCreateCouponMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AdminCouponFormValues) => createCoupon(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["coupons", "list"] });
    },
  });
}

export function useUpdateCouponMutation(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AdminCouponFormValues) =>
      updateCoupon({ id: id ?? "", values }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["coupons", "list"] });
      void queryClient.invalidateQueries({
        queryKey: ["coupons", "detail", id],
      });
    },
  });
}

export function useIssuedCouponsQuery(couponId: string | undefined) {
  return useQuery({
    queryKey: ["coupons", "issued", couponId],
    queryFn: () => getIssuedCoupons(couponId ?? ""),
    enabled: Boolean(couponId),
  });
}

export function usePresetCouponUsersQuery(params: {
  couponId: string | undefined;
  preset: CouponPresetKey;
  excludeIssuedUsers: boolean;
  enabled: boolean;
}) {
  return useQuery({
    queryKey: [
      "coupons",
      "preset-users",
      params.couponId,
      params.preset,
      params.excludeIssuedUsers,
    ],
    queryFn: () =>
      getPresetCouponUsers({
        couponId: params.couponId ?? "",
        preset: params.preset,
        excludeIssuedUsers: params.excludeIssuedUsers,
      }),
    enabled: Boolean(params.couponId) && params.enabled,
  });
}

export function useIssueCouponsMutation(couponId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      issueCoupons({ couponId: couponId ?? "", userIds }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["coupons", "issued", couponId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["coupons", "preset-users", couponId],
      });
    },
  });
}

export function useRevokeIssuedCouponsMutation(couponId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: IssuedCouponRow[]) =>
      revokeIssuedCoupons({ couponId: couponId ?? "", rows }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["coupons", "issued", couponId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["coupons", "preset-users", couponId],
      });
    },
  });
}
