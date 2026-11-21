"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeft, ExternalLink, FileText, Loader2, MessageCircle, PackageCheck, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatIndianPhone } from "@shopkit/commerce";
import { AppShell } from "@/components/AppShell";
import { OrderStatusBadge, paymentLabel } from "@/components/OrderBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invoiceUrl } from "@/lib/api-origin";
import {
  CANCEL_ORDER,
  MARK_ORDER_DELIVERED,
  MARK_ORDER_SHIPPED,
  ORDER,
  ORDER_COUNTS,
  ORDERS,
  PRODUCTS,
  type Order,
} from "@/lib/graphql";
import { formatInr } from "@/lib/money";

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;

function ShipForm({ order }: { order: Order }) {
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl ?? "");
  const [ship, { loading }] = useMutation(MARK_ORDER_SHIPPED, { refetchQueries: [ORDERS, ORDER_COUNTS] });
  const editing = order.status === "SHIPPED";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await ship({
        variables: { input: { orderId: order.id, trackingNumber: trackingNumber.trim() || null, trackingUrl: trackingUrl.trim() || null } },
      });
      toast.success(editing ? "Tracking updated" : "Marked as shipped — the buyer has been notified");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tn">Tracking number</Label>
          <Input id="tn" value={trackingNumber} maxLength={80} placeholder="Optional" onChange={(e) => setTrackingNumber(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tu">Tracking link</Label>
          <Input id="tu" value={trackingUrl} placeholder="Optional, https://…" onChange={(e) => setTrackingUrl(e.target.value)} />
        </div>
      </div>
      <Button type="submit" loading={loading} icon={<Truck />} variant={editing ? "outline" : "default"}>
        {editing ? "Update tracking" : "Mark as shipped"}
      </Button>
    </form>
  );
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery(ORDER, { variables: { id } });
  const refetchQueries = [ORDERS, ORDER_COUNTS, PRODUCTS];
  const [deliver, deliverState] = useMutation(MARK_ORDER_DELIVERED, { refetchQueries });
  const [cancel, cancelState] = useMutation(CANCEL_ORDER, { refetchQueries });
  const order = data?.order;

  if (!order) {
    return <div className="flex justify-center py-24">{loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}</div>;
  }

  async function act(action: () => Promise<unknown>, message: string) {
    try {
      await action();
      toast.success(message);
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  const canCancel = order.status === "PLACED" || order.status === "PENDING_PAYMENT" || order.status === "SHIPPED";
  const address = order.shippingAddress;

  return (
    <div className="mx-auto mt-8 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders" aria-label="Back to orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Order #{order.number}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.invoiceNumber && (
            <Button variant="outline" size="sm" asChild>
              <a href={invoiceUrl(order.id, order.accessToken)} target="_blank" rel="noreferrer">
                <FileText className="h-4 w-4" /> Invoice
              </a>
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              icon={<XCircle />}
              loading={cancelState.loading}
              onClick={() => {
                const refund = order.paymentStatus === "PAID" ? " The online payment will be refunded." : "";
                if (window.confirm(`Cancel order #${order.number}? Items go back into stock.${refund}`)) {
                  void act(() => cancel({ variables: { id: order.id } }), "Order cancelled");
                }
              }}
            >
              Cancel order
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt="" className="h-12 w-12 rounded-md object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.productId ? <Link href={`/products/${item.productId}`} className="hover:underline">{item.title}</Link> : item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.variantTitle && `${item.variantTitle} · `}
                      {formatInr(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{formatInr(item.lineTotal)}</span>
                </div>
              ))}
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatInr(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{order.shippingFee ? formatInr(order.shippingFee) : "Free"}</span>
                </div>
                {order.tax && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Includes GST</span>
                    <span>
                      {order.tax.igst
                        ? `IGST ${formatInr(order.tax.igst)}`
                        : `CGST ${formatInr(order.tax.cgst)} + SGST ${formatInr(order.tax.sgst)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-base font-semibold">
                  <span>Total</span>
                  <span>{formatInr(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {(order.status === "PLACED" || order.status === "SHIPPED") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{order.status === "PLACED" ? "Ship this order" : "Delivery"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ShipForm order={order} />
                {order.status === "SHIPPED" && (
                  <div className="border-t pt-4">
                    <Button
                      icon={<PackageCheck />}
                      loading={deliverState.loading}
                      onClick={() =>
                        act(
                          () => deliver({ variables: { id: order.id } }),
                          order.paymentMethod === "COD" ? "Delivered and cash collected" : "Marked as delivered",
                        )
                      }
                    >
                      Mark as delivered{order.paymentMethod === "COD" ? " (cash collected)" : ""}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {order.status === "PENDING_PAYMENT" && (
            <Card>
              <CardContent className="py-4 text-sm text-muted-foreground">
                The buyer hasn&apos;t finished paying. Unpaid orders cancel themselves
                {order.expiresAt ? ` at ${when(order.expiresAt)}` : ""} and the stock is released.
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customer.name}</p>
              <p className="flex items-center gap-2">
                <a href={`tel:+${order.customer.phone}`} className="hover:underline">
                  {formatIndianPhone(order.customer.phone)}
                </a>
                <a
                  href={`https://wa.me/${order.customer.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Message on WhatsApp"
                  className="text-success"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </p>
              {order.customer.email && <p className="text-muted-foreground">{order.customer.email}</p>}
              <div className="pt-3 text-muted-foreground">
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>
                  {address.city}, {address.state} {address.pincode}
                </p>
              </div>
              {order.note && <p className="mt-3 rounded-md bg-muted p-2 text-xs">“{order.note}”</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment & timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <p className="font-medium">{paymentLabel(order.paymentMethod, order.paymentStatus)}</p>
              {order.gatewayPaymentId && <p className="truncate text-xs text-muted-foreground">Payment ID {order.gatewayPaymentId}</p>}
              {order.invoiceNumber && <p className="text-xs text-muted-foreground">Invoice {order.invoiceNumber}</p>}
              <ul className="space-y-1 pt-2 text-xs text-muted-foreground">
                <li>Placed {when(order.createdAt)}</li>
                {order.paidAt && <li>Paid {when(order.paidAt)}</li>}
                {order.shippedAt && <li>Shipped {when(order.shippedAt)}</li>}
                {order.deliveredAt && <li>Delivered {when(order.deliveredAt)}</li>}
                {order.cancelledAt && <li>Cancelled {when(order.cancelledAt)}</li>}
              </ul>
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 pt-2 text-xs text-primary hover:underline">
                  Track shipment {order.trackingNumber} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <AppShell>
      <OrderDetail />
    </AppShell>
  );
}
