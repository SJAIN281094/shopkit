import type { Metadata } from "next";
import { CartView } from "@/components/CartView";
import { storeFallback } from "@/components/StoreGate";
import { StoreShell } from "@/components/StoreRenderer";
import { loadStore } from "@/lib/store-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default async function CartPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const store = await loadStore((await searchParams).preview);
  if (store.kind !== "ok") return storeFallback(store);
  return (
    <StoreShell layout={store.data.layout} isPreview={store.data.isPreview} ctx={store.ctx}>
      <CartView shop={store.data.shop} previewToken={store.ctx.previewToken} />
    </StoreShell>
  );
}
