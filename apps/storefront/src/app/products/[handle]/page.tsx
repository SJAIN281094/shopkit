import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { productDetailsOf } from "@shopkit/themes";
import { AddToCart } from "@/components/AddToCart";
import { ProductDetails } from "@/components/ProductDetails";
import { storeFallback } from "@/components/StoreGate";
import { StoreShell } from "@/components/StoreRenderer";
import { fetchProduct, type Product } from "@/lib/api";
import { loadStore, storeHref, type StoreContext } from "@/lib/store-context";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const store = await loadStore((await searchParams).preview);
  if (store.kind !== "ok") return { title: "Product not found" };
  const product = await fetchProduct(store.ctx.host, (await params).handle);
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.title} · ${store.data.shop.name}`,
    description: product.description.slice(0, 160),
    openGraph: { images: product.images.slice(0, 1) },
    robots: store.data.isPreview ? { index: false, follow: false } : undefined,
  };
}

function productUrl(product: Product, ctx: StoreContext): string {
  const protocol = ctx.host.split(":")[0].endsWith("localhost") ? "http" : "https";
  return `${protocol}://${ctx.host}/products/${product.handle}`;
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const store = await loadStore((await searchParams).preview);
  if (store.kind !== "ok") return storeFallback(store);
  const { ctx } = store;

  const product = await fetchProduct(ctx.host, (await params).handle);
  if (!product) notFound();

  const { shop } = store.data;
  const canCheckout = shop.codEnabled || shop.onlinePayments;

  return (
    <StoreShell
      layout={store.data.layout}
      isPreview={store.data.isPreview}
      ctx={ctx}
      around={store.data.layout.templates?.product}
      page={{ collectionHandle: product.collection?.handle ?? null, productId: product.id }}
    >
      <ProductDetails
        product={product}
        settings={productDetailsOf(store.data.layout)}
        ctx={ctx}
        buy={
          <>
            <AddToCart
              product={product}
              currency={ctx.currency}
              cartHref={storeHref("/cart", ctx)}
              checkoutHref={storeHref("/checkout", ctx)}
              canCheckout={canCheckout}
              codEnabled={shop.codEnabled}
              whatsapp={ctx.whatsappPhone ? { phone: ctx.whatsappPhone, productUrl: productUrl(product, ctx) } : null}
            />
            {!canCheckout && !ctx.whatsappPhone && store.data.isPreview && (
              <p className="rounded-md border border-dashed px-4 py-3 text-sm">
                Turn on cash on delivery or online payments in Settings so buyers can order here.
              </p>
            )}
          </>
        }
      />
    </StoreShell>
  );
}
