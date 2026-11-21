"use server";

import { headers } from "next/headers";
import { GraphQLRequestError, request, type Product } from "@/lib/api";
import type { CartLine } from "@/lib/cart";
import { ORDER_FIELDS, type ActionResult, type CheckoutInput, type PaymentRequest, type StoreOrder } from "@/lib/orders";

async function storeHost(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-host") ?? h.get("host") ?? "";
}

/**
 * The API rate-limits orders per buyer IP. We call it from this server, so we pass the buyer's IP along
 * with a shared key that tells the API to trust it. The last X-Forwarded-For entry is the one added by
 * the proxy in front of us; earlier entries can be set by the client.
 */
async function buyerHeaders(): Promise<Record<string, string>> {
  const h = await headers();
  const forwarded = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip = forwarded.at(-1) ?? h.get("x-real-ip") ?? "unknown";
  return {
    "x-shopkit-client-ip": ip,
    "x-shopkit-storefront-key": process.env.STOREFRONT_API_KEY ?? "dev-storefront-key",
  };
}

async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof GraphQLRequestError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function placeOrder(
  input: CheckoutInput,
): Promise<ActionResult<{ order: StoreOrder; payment: PaymentRequest | null }>> {
  const host = await storeHost();
  const extra = await buyerHeaders();
  return attempt(async () => {
    const data = await request<{ placeOrder: { order: StoreOrder; payment: PaymentRequest | null } }>(
      `mutation PlaceOrder($host: String!, $input: PlaceOrderInput!) {
        placeOrder(host: $host, input: $input) {
          order { ${ORDER_FIELDS} }
          payment { gateway keyId gatewayOrderId amount }
        }
      }`,
      { host, input },
      extra,
    );
    return data.placeOrder;
  });
}

export async function confirmPayment(input: {
  orderId: string;
  token: string;
  paymentId: string;
  signature: string;
}): Promise<ActionResult<StoreOrder>> {
  const host = await storeHost();
  return attempt(async () => {
    const data = await request<{ confirmOrderPayment: StoreOrder }>(
      `mutation Confirm($host: String!, $input: ConfirmPaymentInput!) {
        confirmOrderPayment(host: $host, input: $input) { ${ORDER_FIELDS} }
      }`,
      { host, input },
    );
    return data.confirmOrderPayment;
  });
}

/** Development only: pays on the fake gateway and returns a signature to confirm with. */
export async function simulateTestPayment(input: {
  orderId: string;
  token: string;
}): Promise<ActionResult<{ paymentId: string; signature: string }>> {
  const host = await storeHost();
  return attempt(async () => {
    const data = await request<{ simulateTestPayment: { paymentId: string; signature: string } }>(
      `mutation Simulate($host: String!, $input: OrderAccessInput!) {
        simulateTestPayment(host: $host, input: $input) { paymentId signature }
      }`,
      { host, input },
    );
    return data.simulateTestPayment;
  });
}

/** Current price, stock and names for the products in a cart; lines that no longer exist are dropped. */
export async function refreshCart(lines: Pick<CartLine, "variantId" | "handle">[]): Promise<ActionResult<CartLine[]>> {
  const host = await storeHost();
  const handles = [...new Set(lines.map((l) => l.handle))].slice(0, 50);
  return attempt(async () => {
    const products = await Promise.all(
      handles.map((handle) =>
        request<{ storefrontProduct: Product | null }>(
          `query P($host: String!, $handle: String!) {
            storefrontProduct(host: $host, handle: $handle) {
              title handle images variants { id title price stock }
            }
          }`,
          { host, handle },
        ).then((d) => d.storefrontProduct),
      ),
    );
    const variants = new Map<string, CartLine>();
    for (const product of products) {
      if (!product) continue;
      for (const v of product.variants) {
        variants.set(v.id, {
          variantId: v.id,
          handle: product.handle,
          title: product.title,
          variantTitle: v.title,
          image: product.images[0] ?? null,
          price: v.price,
          stock: v.stock,
          quantity: 0,
        });
      }
    }
    return lines.flatMap((line) => {
      const current = variants.get(line.variantId);
      return current ? [current] : [];
    });
  });
}

export async function resumePayment(input: { orderId: string; token: string }): Promise<ActionResult<PaymentRequest>> {
  const host = await storeHost();
  return attempt(async () => {
    const data = await request<{ resumeOrderPayment: PaymentRequest }>(
      `mutation Resume($host: String!, $input: OrderAccessInput!) {
        resumeOrderPayment(host: $host, input: $input) { gateway keyId gatewayOrderId amount }
      }`,
      { host, input },
    );
    return data.resumeOrderPayment;
  });
}
