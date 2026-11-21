import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { StoreMessage } from "@/components/StoreMessage";
import { storeFallback } from "@/components/StoreGate";
import { StoreShell } from "@/components/StoreRenderer";
import { loadStore } from "@/lib/store-context";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const store = await loadStore((await searchParams).preview);
  if (store.kind !== "ok") return storeFallback(store);
  const { shop } = store.data;
  if (!shop.codEnabled && !shop.onlinePayments) {
    return <StoreMessage title={shop.name} body="This store isn't taking orders online yet." />;
  }
  return (
    <StoreShell layout={store.data.layout} isPreview={store.data.isPreview} ctx={store.ctx}>
      <CheckoutForm shop={shop} previewToken={store.ctx.previewToken} />
    </StoreShell>
  );
}
