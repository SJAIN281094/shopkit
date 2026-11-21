"use client";

import { confirmPayment, simulateTestPayment } from "@/app/actions";
import type { PaymentRequest, StoreOrder } from "./orders";
import { openRazorpay } from "./razorpay";

export type PayOutcome = { kind: "paid"; order: StoreOrder } | { kind: "dismissed" } | { kind: "error"; message: string };

/** Takes the buyer through the gateway (or the dev-only test gateway) and confirms the payment with the API. */
export async function payOrder(order: StoreOrder, payment: PaymentRequest, storeName: string): Promise<PayOutcome> {
  try {
    let signed: { paymentId: string; signature: string } | null = null;
    if (payment.gateway === "test") {
      const sim = await simulateTestPayment({ orderId: order.id, token: order.accessToken });
      if (!sim.ok) return { kind: "error", message: sim.error };
      signed = sim.data;
    } else if (payment.keyId) {
      signed = await openRazorpay({
        keyId: payment.keyId,
        orderId: payment.gatewayOrderId,
        amount: payment.amount,
        name: storeName,
        description: `Order #${order.number}`,
        prefill: { name: order.customer.name, email: order.customer.email ?? undefined, contact: `+${order.customer.phone}` },
      });
    }
    if (!signed) return { kind: "dismissed" };
    const confirmed = await confirmPayment({ orderId: order.id, token: order.accessToken, ...signed });
    return confirmed.ok ? { kind: "paid", order: confirmed.data } : { kind: "error", message: confirmed.error };
  } catch (error) {
    return { kind: "error", message: (error as Error).message };
  }
}
