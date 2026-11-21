"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { refreshCart } from "@/app/actions";
import { cart, cartSubtotal, useCart, type CartLine } from "@/lib/cart";
import { formatPrice, storeHref } from "@/lib/format";
import { shippingFor } from "@/lib/orders";
import type { StorefrontShop } from "@/lib/api";

/** Re-prices the stored cart against the live catalog once on mount; returns a notice if anything changed. */
export function useFreshCart(): string | null {
  const lines = useCart();
  const [notice, setNotice] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current || lines.length === 0) return;
    done.current = true;
    void refreshCart(lines.map(({ variantId, handle }) => ({ variantId, handle }))).then((result) => {
      if (!result.ok) return;
      const before = new Map(lines.map((l) => [l.variantId, l]));
      const fresh = new Map(result.data.map((l) => [l.variantId, l]));
      const removed = lines.filter((l) => {
        const now = fresh.get(l.variantId);
        return !now || now.stock === 0;
      });
      const changed = result.data.some((l) => before.get(l.variantId)?.price !== l.price);
      cart.refresh(result.data);
      if (removed.length) {
        const names = removed.map((l) => l.title).join(", ");
        setNotice(`${names} ${removed.length === 1 ? "is no longer available and was" : "are no longer available and were"} removed.`);
      }
      else if (changed) setNotice("Some prices have changed since you added them.");
    });
  }, [lines]);

  return notice;
}

export function QuantityStepper({ line }: { line: CartLine }) {
  const max = Math.min(20, line.stock ?? 20);
  return (
    <div className="sk-border inline-flex items-center rounded-full border">
      <button type="button" aria-label="Decrease" className="p-2" onClick={() => cart.setQuantity(line.variantId, line.quantity - 1)}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-sm">{line.quantity}</span>
      <button
        type="button"
        aria-label="Increase"
        className="p-2 disabled:opacity-40"
        disabled={line.quantity >= max}
        onClick={() => cart.setQuantity(line.variantId, line.quantity + 1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function CartView({
  shop,
  previewToken,
}: {
  shop: Pick<StorefrontShop, "currency" | "shippingFee" | "freeShippingAbove" | "codEnabled" | "onlinePayments">;
  previewToken: string | null;
}) {
  const lines = useCart();
  const notice = useFreshCart();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const subtotal = cartSubtotal(lines);
  const shipping = shippingFor(subtotal, shop);
  const canCheckout = shop.codEnabled || shop.onlinePayments;
  const ctx = { previewToken };

  if (!hydrated) return <div className="h-64" />;

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="sk-heading text-3xl font-semibold">Your cart is empty</h1>
        {notice && <p className="sk-muted text-sm">{notice}</p>}
        <a href={storeHref("/collections/all", ctx)} className="sk-button">
          Continue shopping
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="sk-heading mb-6 text-3xl font-semibold">Your cart</h1>
      {notice && <p className="sk-soft-bg mb-4 rounded-lg px-4 py-3 text-sm">{notice}</p>}
      <div className="grid gap-10 md:grid-cols-[1fr_300px]">
        <ul className="sk-border divide-y border-y">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-4 py-4">
              <a href={storeHref(`/products/${line.handle}`, ctx)} className="shrink-0">
                {line.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.image} alt="" className="h-24 w-20 rounded-md object-cover" />
                ) : (
                  <div className="sk-placeholder h-24 w-20 rounded-md" />
                )}
              </a>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div>
                  <a href={storeHref(`/products/${line.handle}`, ctx)} className="font-medium hover:underline">
                    {line.title}
                  </a>
                  {line.variantTitle && <p className="sk-muted text-sm">{line.variantTitle}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <QuantityStepper line={line} />
                  <button
                    type="button"
                    aria-label={`Remove ${line.title}`}
                    className="sk-muted hover:opacity-70"
                    onClick={() => cart.setQuantity(line.variantId, 0)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <span className="font-medium">{formatPrice(line.price * line.quantity, shop.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal, shop.currency)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Shipping</span>
            <span>{shipping ? formatPrice(shipping, shop.currency) : "Free"}</span>
          </div>
          {shop.freeShippingAbove !== null && shipping > 0 && (
            <p className="sk-muted text-xs">
              Add {formatPrice(shop.freeShippingAbove - subtotal, shop.currency)} more for free shipping.
            </p>
          )}
          <div className="sk-border flex justify-between border-t pt-3 text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(subtotal + shipping, shop.currency)}</span>
          </div>
          <p className="sk-muted text-xs">Prices include taxes.</p>
          {canCheckout ? (
            <a href={storeHref("/checkout", ctx)} className="sk-button w-full justify-center">
              Checkout
            </a>
          ) : (
            <p className="text-sm">This store isn&apos;t taking orders online yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
