import { cn } from "@/lib/utils";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/graphql";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PLACED: "To ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-muted text-muted-foreground",
  PLACED: "bg-amber-100 text-amber-800",
  SHIPPED: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-success/10 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export function paymentLabel(method: PaymentMethod, status: PaymentStatus): string {
  if (status === "REFUNDED") return "Refunded";
  if (method === "COD") return status === "PAID" ? "COD · collected" : "Cash on delivery";
  return status === "PAID" ? "Paid online" : status === "FAILED" ? "Payment failed" : "Online · not paid";
}
