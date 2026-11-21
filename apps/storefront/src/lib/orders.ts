export type OrderStatus = "PENDING_PAYMENT" | "PLACED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface StoreOrder {
  id: string;
  number: number;
  status: OrderStatus;
  paymentMethod: "COD" | "ONLINE";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  customer: { name: string; phone: string; email: string | null };
  shippingAddress: { line1: string; line2: string; city: string; state: string; pincode: string };
  items: { title: string; variantTitle: string; image: string | null; unitPrice: number; quantity: number; lineTotal: number }[];
  subtotal: number;
  shippingFee: number;
  total: number;
  tax: { taxable: number; cgst: number; sgst: number; igst: number } | null;
  invoiceNumber: string | null;
  accessToken: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export const ORDER_FIELDS = `
  id number status paymentMethod paymentStatus
  customer { name phone email }
  shippingAddress { line1 line2 city state pincode }
  items { title variantTitle image unitPrice quantity lineTotal }
  subtotal shippingFee total
  tax { taxable cgst sgst igst }
  invoiceNumber accessToken trackingNumber trackingUrl expiresAt createdAt
`;

export interface PaymentRequest {
  gateway: "razorpay" | "test";
  keyId: string | null;
  gatewayOrderId: string;
  amount: number;
}

export interface CheckoutInput {
  items: { variantId: string; quantity: number }[];
  customer: { name: string; phone: string; email: string | null };
  address: { line1: string; line2: string; city: string; stateCode: string; pincode: string };
  paymentMethod: "COD" | "ONLINE";
  note: string | null;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Shipping the API will charge, mirrored so the cart can show it before the order is placed. */
export function shippingFor(subtotal: number, shop: { shippingFee: number; freeShippingAbove: number | null }): number {
  if (shop.freeShippingAbove !== null && subtotal >= shop.freeShippingAbove) return 0;
  return shop.shippingFee;
}

export function orderPath(order: { id: string; accessToken: string }): string {
  return `/orders/${order.id}?token=${encodeURIComponent(order.accessToken)}`;
}

export function invoiceUrl(order: { id: string; accessToken: string }): string {
  const origin = (process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000").replace(/\/+$/, "");
  return `${origin}/orders/${order.id}/invoice?token=${encodeURIComponent(order.accessToken)}`;
}
