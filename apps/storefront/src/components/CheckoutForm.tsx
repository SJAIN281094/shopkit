"use client";

import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { INDIAN_STATES, isValidPincode, normalizeIndianPhone } from "@shopkit/commerce";
import { placeOrder } from "@/app/actions";
import type { StorefrontShop } from "@/lib/api";
import { cart, cartSubtotal, useCart } from "@/lib/cart";
import { formatPrice, storeHref } from "@/lib/format";
import { orderPath, shippingFor, type PaymentRequest, type StoreOrder } from "@/lib/orders";
import { payOrder } from "@/lib/pay";
import { useFreshCart } from "./CartView";

interface Form {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  stateCode: string;
  pincode: string;
  note: string;
}

const EMPTY_FORM: Form = { name: "", phone: "", email: "", line1: "", line2: "", city: "", stateCode: "", pincode: "", note: "" };
const SAVED_DETAILS_KEY = "shopkit-buyer";

function validate(form: Form): string | null {
  if (form.name.trim().length < 2) return "Enter your full name";
  if (!normalizeIndianPhone(form.phone)) return "Enter a 10-digit mobile number";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid email or leave it empty";
  if (form.line1.trim().length < 3) return "Enter your house / street address";
  if (form.city.trim().length < 2) return "Enter your city";
  if (!form.stateCode) return "Choose your state";
  if (!isValidPincode(form.pincode.trim())) return "Enter a 6-digit pincode";
  return null;
}

function Field({
  label,
  id,
  className = "",
  ...props
}: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label htmlFor={id} className={`block space-y-1 ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      <input id={id} className="sk-border w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-current" {...props} />
    </label>
  );
}

export function CheckoutForm({
  shop,
  previewToken,
}: {
  shop: Pick<StorefrontShop, "name" | "currency" | "shippingFee" | "freeShippingAbove" | "codEnabled" | "onlinePayments" | "testPayments">;
  previewToken: string | null;
}) {
  const lines = useCart();
  const notice = useFreshCart();
  const [hydrated, setHydrated] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [method, setMethod] = useState<"COD" | "ONLINE">(shop.onlinePayments ? "ONLINE" : "COD");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** An order placed but not paid yet: lets the buyer retry or use the test gateway. */
  const [awaiting, setAwaiting] = useState<{ order: StoreOrder; payment: PaymentRequest } | null>(null);
  const ctx = { previewToken };

  useEffect(() => {
    setHydrated(true);
    try {
      const saved = JSON.parse(window.localStorage.getItem(SAVED_DETAILS_KEY) ?? "null") as Partial<Form> | null;
      if (saved) setForm((f) => ({ ...f, ...saved, note: "" }));
    } catch {
      // Ignore unreadable saved details.
    }
  }, []);

  const subtotal = cartSubtotal(lines);
  const shipping = shippingFor(subtotal, shop);
  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function finish(order: StoreOrder) {
    cart.clear();
    window.location.href = storeHref(orderPath(order), ctx);
  }

  async function pay(order: StoreOrder, payment: PaymentRequest) {
    setError(null);
    setBusy(true);
    const outcome = await payOrder(order, payment, shop.name);
    if (outcome.kind === "paid") return finish(outcome.order);
    setBusy(false);
    setAwaiting({ order, payment });
    setError(outcome.kind === "dismissed" ? "Payment wasn't completed. You can try again." : outcome.message);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate(form);
    if (problem) return setError(problem);
    setError(null);
    setBusy(true);
    const { note, ...details } = form;
    window.localStorage.setItem(SAVED_DETAILS_KEY, JSON.stringify(details));

    const result = await placeOrder({
      items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      customer: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() || null },
      address: {
        line1: form.line1.trim(),
        line2: form.line2.trim(),
        city: form.city.trim(),
        stateCode: form.stateCode,
        pincode: form.pincode.trim(),
      },
      paymentMethod: method,
      note: note.trim() || null,
    });
    if (!result.ok) {
      setBusy(false);
      return setError(result.error);
    }
    const { order, payment } = result.data;
    if (!payment) return finish(order);
    if (payment.gateway === "test") {
      setBusy(false);
      setAwaiting({ order, payment });
      return;
    }
    await pay(order, payment);
  }

  if (!hydrated) return <div className="h-64" />;

  if (lines.length === 0 && !awaiting) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="sk-heading text-3xl font-semibold">Your cart is empty</h1>
        <a href={storeHref("/collections/all", ctx)} className="sk-button">
          Continue shopping
        </a>
      </div>
    );
  }

  if (awaiting) {
    const { order, payment } = awaiting;
    return (
      <div className="mx-auto max-w-md space-y-5 px-4 py-20 text-center">
        <h1 className="sk-heading text-2xl font-semibold">Pay for order #{order.number}</h1>
        <p className="text-3xl font-semibold">{formatPrice(order.total, shop.currency)}</p>
        {payment.gateway === "test" && (
          <p className="rounded-lg border border-dashed px-4 py-3 text-sm">
            Test mode: no real money is charged. This store hasn&apos;t connected a real payment account yet.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" className="sk-button w-full justify-center" disabled={busy} onClick={() => pay(order, payment)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {payment.gateway === "test" ? "Complete test payment" : "Pay now"}
        </button>
        <a href={storeHref(orderPath(order), ctx)} className="sk-muted block text-sm hover:underline">
          Pay later — unpaid orders are cancelled after 30 minutes
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1fr_340px]" noValidate>
      <div className="space-y-8">
        <h1 className="sk-heading text-3xl font-semibold">Checkout</h1>
        {notice && <p className="sk-soft-bg rounded-lg px-4 py-3 text-sm">{notice}</p>}

        <section className="space-y-4">
          <h2 className="font-semibold">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Full name" autoComplete="name" value={form.name} onChange={set("name")} maxLength={80} />
            <Field id="phone" label="Mobile number" autoComplete="tel" inputMode="tel" placeholder="98765 43210" value={form.phone} onChange={set("phone")} maxLength={20} />
            <Field id="email" label="Email (for order updates)" type="email" autoComplete="email" placeholder="Optional" value={form.email} onChange={set("email")} className="sm:col-span-2" maxLength={160} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold">Delivery address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="line1" label="House, building, street" autoComplete="address-line1" value={form.line1} onChange={set("line1")} className="sm:col-span-2" maxLength={160} />
            <Field id="line2" label="Area, landmark" autoComplete="address-line2" placeholder="Optional" value={form.line2} onChange={set("line2")} className="sm:col-span-2" maxLength={160} />
            <Field id="city" label="City" autoComplete="address-level2" value={form.city} onChange={set("city")} maxLength={80} />
            <Field id="pincode" label="Pincode" autoComplete="postal-code" inputMode="numeric" value={form.pincode} onChange={set("pincode")} maxLength={6} />
            <label htmlFor="state" className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium">State</span>
              <select
                id="state"
                autoComplete="address-level1"
                className="sk-border w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm"
                value={form.stateCode}
                onChange={set("stateCode")}
              >
                <option value="">Choose state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="note" className="block space-y-1 sm:col-span-2">
              <span className="text-sm font-medium">Note for the seller</span>
              <textarea
                id="note"
                rows={2}
                maxLength={500}
                placeholder="Optional"
                className="sk-border w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm"
                value={form.note}
                onChange={set("note")}
              />
            </label>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Payment</h2>
          {shop.onlinePayments && (
            <label className={`sk-border flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${method === "ONLINE" ? "border-current" : ""}`}>
              <input type="radio" name="method" className="mt-1" checked={method === "ONLINE"} onChange={() => setMethod("ONLINE")} />
              <span>
                <span className="block font-medium">Pay online</span>
                <span className="sk-muted block text-sm">
                  UPI, cards, netbanking, wallets{shop.testPayments ? " · test mode" : ""}
                </span>
              </span>
            </label>
          )}
          {shop.codEnabled && (
            <label className={`sk-border flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${method === "COD" ? "border-current" : ""}`}>
              <input type="radio" name="method" className="mt-1" checked={method === "COD"} onChange={() => setMethod("COD")} />
              <span>
                <span className="block font-medium">Cash on delivery</span>
                <span className="sk-muted block text-sm">Pay when your order arrives</span>
              </span>
            </label>
          )}
        </section>
      </div>

      <aside className="sk-soft-bg h-fit space-y-4 rounded-xl p-5 md:sticky md:top-6">
        <h2 className="font-semibold">Order summary</h2>
        <ul className="space-y-3">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-3 text-sm">
              {line.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={line.image} alt="" className="h-14 w-12 rounded object-cover" />
              ) : (
                <div className="sk-placeholder h-14 w-12 rounded" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{line.title}</p>
                <p className="sk-muted">
                  {line.variantTitle && `${line.variantTitle} · `}Qty {line.quantity}
                </p>
              </div>
              <span>{formatPrice(line.price * line.quantity, shop.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="sk-border space-y-2 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal, shop.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{shipping ? formatPrice(shipping, shop.currency) : "Free"}</span>
          </div>
          <div className="flex justify-between pt-1 text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(subtotal + shipping, shop.currency)}</span>
          </div>
          <p className="sk-muted text-xs">Prices include taxes.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button type="submit" className="sk-button w-full justify-center disabled:opacity-60" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {method === "COD" ? "Place order" : `Pay ${formatPrice(subtotal + shipping, shop.currency)}`}
        </button>
      </aside>
    </form>
  );
}
