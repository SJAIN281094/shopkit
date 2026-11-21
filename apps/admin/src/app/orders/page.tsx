"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { Loader2, Search, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ORDER_STATUS_LABEL, OrderStatusBadge, paymentLabel } from "@/components/OrderBadges";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ORDERS, type OrderStatus } from "@/lib/graphql";
import { formatInr } from "@/lib/money";
import { cn } from "@/lib/utils";

const TABS: { status?: OrderStatus; label: string }[] = [
  { label: "All" },
  { status: "PLACED", label: ORDER_STATUS_LABEL.PLACED },
  { status: "SHIPPED", label: ORDER_STATUS_LABEL.SHIPPED },
  { status: "DELIVERED", label: ORDER_STATUS_LABEL.DELIVERED },
  { status: "PENDING_PAYMENT", label: ORDER_STATUS_LABEL.PENDING_PAYMENT },
  { status: "CANCELLED", label: ORDER_STATUS_LABEL.CANCELLED },
];

function OrderList() {
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const { data, loading } = useQuery(ORDERS, {
    variables: { filter: { ...(status && { status }), ...(deferredSearch && { search: deferredSearch }) } },
  });
  const orders = data?.orders ?? [];

  return (
    <div className="mx-auto mt-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">New orders also reach you by email and WhatsApp.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setStatus(tab.status)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                status === tab.status ? "bg-accent font-medium" : "text-muted-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Order #, name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <p className="font-medium">{deferredSearch || status ? "No orders match" : "No orders yet"}</p>
            {!deferredSearch && !status && (
              <p className="max-w-sm text-sm text-muted-foreground">
                When someone buys from your store, the order shows up here.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="divide-y">
          {orders.map((order) => {
            const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="grid grid-cols-[80px_1fr_auto] items-center gap-4 p-3 transition-colors hover:bg-accent/50 sm:grid-cols-[80px_1fr_160px_110px_100px]"
              >
                <span className="font-medium">#{order.number}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{order.customer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {units} item
                    {units === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="hidden text-xs text-muted-foreground sm:block">{paymentLabel(order.paymentMethod, order.paymentStatus)}</span>
                <span className="hidden text-right text-sm font-medium sm:block">{formatInr(order.total)}</span>
                <span className="justify-self-end">
                  <OrderStatusBadge status={order.status} />
                </span>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <AppShell>
      <OrderList />
    </AppShell>
  );
}
