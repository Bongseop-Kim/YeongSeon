export {
  shippingKeys,
  useShippingAddresses,
  useDefaultShippingAddress,
  useShippingAddress,
  useCreateShippingAddress,
  useUpdateShippingAddress,
  useDeleteShippingAddress,
} from "./api/shipping-query";
export type {
  ShippingAddress,
  ShippingAddressInput,
} from "./model/shipping-address";
export type { ShippingAddressRecord } from "./model/shipping-address-record";
