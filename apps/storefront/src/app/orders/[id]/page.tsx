import type { Metadata } from "next";
import { CheckCircle2, Clock, FileText, PackageCheck, Truck, XCircle } from "lucide-react";
import { formatIndianPhone } from "@shopkit/commerce";
import { PayPendingOrder } from "@/components/PayPendingOrder";
import { StoreMessage } from "@/components/StoreMessage";
import { storeFallback } from "@/components/StoreGate";
import { StoreShell } from "@/components/StoreRenderer";
import { fetchOrder } from "@/lib/api";
import { invoiceUrl, type StoreOrder } from "@/lib/orders";
import { formatPrice, loadStore, storeHref } from "@/lib/store-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; preview?: string }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function headline(order: StoreOrder): { icon: React.ReactNode; title: string; body: string } {
  const icon = "h-10 w-10 sk-primary-text";
  switch (order.status) {
    case "PENDING_PAYMENT":
      return {
        icon: <Clock className={icon} />,
        title: "Waiting for payment",
        body: "Your order is reserved. Finish paying to confirm it — unpaid orders are cancelled after 30 minutes.",
      };
    case "PLACED":
      return {
        icon: <CheckCircle2 className={icon} />,
        title: "Thank you! Your order is confirmed",
        body:
          order.paymentMethod === "COD"
            ? "Keep cash or UPI ready when it arrives. We'll message you when it ships."
            : "Payment received. We'll message you when it ships.",
      };
    case "SHIPPED":
      return { icon: <Truck className={icon} />, title: "Your order is on the way", body: "It has been handed to the courier." };
    case "DELIVERED":
      return { icon: <PackageCheck className={icon} />, title: "Delivered", body: "We hope you love it!" };
    case "CANCELLED":
      return {
        icon: <XCircle className={icon} />,
        title: "This order was cancelled",
        body: order.paymentStatus === "REFUNDED" ? "Your payment has been refunded to the original method." : "You have not been charged.",
      };
  }
}

export default async function OrderPage({ params, searchParams }: PageProps) {
  const { token, preview } = await searchParams;
  const store = await loadStore(preview);
  if (store.kind !== "ok") return storeFallback(store);
  const { id } = await params;

  const order = token && UUID.test(id) ? await fetchOrder(store.ctx.host, { orderId: id, token }) : null;
  if (!order) {
    return <StoreMessage title="Order not found" body="Open the link from your order confirmation message to see this order." />;
  }

  const { ctx } = store;
  const head = headline(order);
  const address = order.shippingAddress;

  return (
    <StoreShell layout={store.data.layout} isPreview={store.data.isPreview} ctx={ctx}>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
        <div className="space-y-3 text-center">
          <div className="flex justify-center">{head.icon}</div>
          <p className="sk-muted text-sm">Order #{order.number}</p>
          <h1 className="sk-heading text-3xl font-semibold">{head.title}</h1>
          <p className="sk-muted mx-auto max-w-md">{head.body}</p>
          {order.status === "PENDING_PAYMENT" && (
            <div className="flex justify-center pt-2">
              <PayPendingOrder order={order} storeName={store.data.shop.name} label={`Pay ${formatPrice(order.total, ctx.currency)}`} />
            </div>
          )}
          {order.trackingUrl && order.status === "SHIPPED" && (
            <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="sk-button">
              <Truck className="h-4 w-4" /> Track {order.trackingNumber ?? "shipment"}
            </a>
          )}
          {!order.trackingUrl && order.trackingNumber && <p className="text-sm">Tracking number: {order.trackingNumber}</p>}
        </div>

        <div className="sk-border rounded-xl border p-5">
          <ul className="space-y-3">
            {order.items.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" className="h-16 w-14 rounded object-cover" />
                ) : (
                  <div className="sk-placeholder h-16 w-14 rounded" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="sk-muted">
                    {item.variantTitle && `${item.variantTitle} · `}
                    {formatPrice(item.unitPrice, ctx.currency)} × {item.quantity}
                  </p>
                </div>
                <span>{formatPrice(item.lineTotal, ctx.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="sk-border mt-4 space-y-1.5 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal, ctx.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>{order.shippingFee ? formatPrice(order.shippingFee, ctx.currency) : "Free"}</span>
            </div>
            <div className="flex justify-between pt-1 text-lg font-semibold">
              <span>Total</span>
              <span>{formatPrice(order.total, ctx.currency)}</span>
            </div>
            <p className="sk-muted text-xs">
              {order.paymentMethod === "COD" ? "Cash on delivery" : order.paymentStatus === "PAID" ? "Paid online" : "Online payment"}
              {order.tax && " · Prices include GST"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <h2 className="font-semibold">Delivering to</h2>
            <p>{order.customer.name}</p>
            <p className="sk-muted">
              {address.line1}
              {address.line2 && `, ${address.line2}`}
              <br />
              {address.city}, {address.state} {address.pincode}
            </p>
            <p className="sk-muted">{formatIndianPhone(order.customer.phone)}</p>
          </div>
          <div className="space-y-2 text-sm sm:text-right">
            {order.invoiceNumber && (
              <a href={invoiceUrl(order)} target="_blank" rel="noreferrer" className="sk-primary-text inline-flex items-center gap-1.5 font-medium hover:underline">
                <FileText className="h-4 w-4" /> Download invoice
              </a>
            )}
            <p>
              <a href={storeHref("/", ctx)} className="sk-muted hover:underline">
                Continue shopping
              </a>
            </p>
          </div>
        </div>
        <p className="sk-muted text-center text-xs">Bookmark this page to check your order later. Keep the link private.</p>
      </div>
    </StoreShell>
  );
}
