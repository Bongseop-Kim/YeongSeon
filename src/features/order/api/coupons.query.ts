import { useQuery } from "@tanstack/react-query";
import { getUserCoupons } from "./coupons.api";

export const userCouponKeys = {
  all: ["user-coupons"] as const,
  list: () => [...userCouponKeys.all, "list"] as const,
};

export const useUserCoupons = () => {
  return useQuery({
    queryKey: userCouponKeys.list(),
    queryFn: getUserCoupons,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};
