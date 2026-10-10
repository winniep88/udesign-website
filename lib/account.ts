export type SavedAddress = {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  postcode: string;
  city: string;
  state: string;
  country: string;
  is_default: boolean;
};

export type WelcomeVoucher = {
  id: string;
  user_id: string;
  expires_at: string;
  code: string;
  reserved_at: string | null;
  redeemed_at: string | null;
  forfeited_at: string | null;
};

export type CustomerOrder = {
  id: string;
  user_id: string;
  order_status: string;
  product_subtotal_sen: number;
  voucher_discount_sen: number;
  shipping_sen: number;
  total_sen: number;
  created_at: string;
};

export type LoyaltyEntry = {
  id: string;
  user_id: string;
  points: number;
  kind: string;
  created_at: string;
};

export function addressText(address: SavedAddress) {
  return [address.line1, address.line2, address.postcode, address.city, address.state, address.country === "MY" ? "Malaysia" : address.country === "SG" ? "Singapore" : address.country].filter(Boolean).join(", ");
}
