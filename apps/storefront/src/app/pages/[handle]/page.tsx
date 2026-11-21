import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { storeFallback } from "@/components/StoreGate";
import { PageRenderer } from "@/components/StoreRenderer";
import { loadStore } from "@/lib/store-context";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const store = await loadStore((await searchParams).preview);
  if (store.kind !== "ok") return { title: "Page not found" };
  const { handle } = await params;
  const page = store.data.layout.pages?.find((p) => p.handle === handle);
  if (!page) return { title: "Page not found" };
  return {
    title: `${page.title} · ${store.data.shop.name}`,
    description: page.description || undefined,
    robots: store.data.isPreview ? { index: false, follow: false } : undefined,
  };
}

export default async function CustomPage({ params, searchParams }: PageProps) {
  const store = await loadStore((await searchParams).preview);
  if (store.kind !== "ok") return storeFallback(store);
  const { handle } = await params;
  const page = store.data.layout.pages?.find((p) => p.handle === handle);
  if (!page) notFound();
  return <PageRenderer storePage={page} layout={store.data.layout} isPreview={store.data.isPreview} ctx={store.ctx} />;
}
