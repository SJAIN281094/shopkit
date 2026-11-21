"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { resumePayment } from "@/app/actions";
import { cart } from "@/lib/cart";
import type { StoreOrder } from "@/lib/orders";
import { payOrder } from "@/lib/pay";

export function PayPendingOrder({ order, storeName, label }: { order: StoreOrder; storeName: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    const payment = await resumePayment({ orderId: order.id, token: order.accessToken });
    if (!payment.ok) {
      setBusy(false);
      return setError(payment.error);
    }
    const outcome = await payOrder(order, payment.data, storeName);
    if (outcome.kind === "paid") {
      cart.clear();
      window.location.reload();
      return;
    }
    setBusy(false);
    if (outcome.kind === "error") setError(outcome.message);
  }

  return (
    <div className="space-y-2">
      <button type="button" className="sk-button disabled:opacity-60" disabled={busy} onClick={pay}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {label}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
