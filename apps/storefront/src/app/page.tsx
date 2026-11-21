import type { Metadata } from "next";
import { storeFallback } from "@/components/StoreGate";
import { StoreRenderer } from "@/components/StoreRenderer";
import { loadStore } from "@/lib/store-context";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const store = await loadStore((await searchParams).preview);
  if (store.kind === "not-found" || store.kind === "preview-expired") return { title: "Store not found" };
  return {
    title: store.data.shop.name,
    robots: store.data.isPreview ? { index: false, follow: false } : undefined,
  };
}

export default async function StorePage({ searchParams }: PageProps) {
  const store = await loadStore((await searchParams).preview);
  if (store.kind !== "ok") return storeFallback(store);
  return <StoreRenderer layout={store.data.layout} isPreview={store.data.isPreview} ctx={store.ctx} />;
}
