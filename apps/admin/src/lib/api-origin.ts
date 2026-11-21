export const API_ORIGIN = new URL(process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/graphql").origin;

/** Printable invoice; the order's access token is what authorises viewing it. */
export function invoiceUrl(orderId: string, accessToken: string): string {
  return `${API_ORIGIN}/orders/${orderId}/invoice?token=${encodeURIComponent(accessToken)}`;
}
