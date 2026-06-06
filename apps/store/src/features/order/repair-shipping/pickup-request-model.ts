export interface PickupRequestInfo {
  sameAsShipping: boolean;
  name: string;
  phone: string;
  postalCode: string;
  address: string;
  detailAddress: string;
}

export const EMPTY_PICKUP_REQUEST: PickupRequestInfo = {
  sameAsShipping: true,
  name: "",
  phone: "",
  postalCode: "",
  address: "",
  detailAddress: "",
};
