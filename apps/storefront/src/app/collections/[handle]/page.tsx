import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { collectionProductsOf, collectionTemplateOf, DEFAULT_PER_PAGE, PRODUCT_TABLE_SORT_LABELS } from "@shopkit/themes";
import { Pagination } from "@/components/Pagination";
import { ProductGridList } from "@/components/ProductCard";
import { SortMenu } from "@/components/SortMenu";
import { storeFallback } from "@/components/StoreGate";
import { StoreShell } from "@/components/StoreRenderer";
import { fetchCollection } from "@/lib/api";
import { isProductSort } from "@/lib/products";
import { loadStore, storeHref } from "@/lib/store-context";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ preview?: string; sort?: string; page?: string }>;
}

const HEADINGS = {
  left: "",
  center: "text-center [&>p]:mx-auto",
  banner: "sk-soft-bg rounded-2xl px-6 py-12 text-center [&>p]:mx-auto",
} as const;

function pageNumber(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const query = await searchParams;
  const store = await loadStore(query.preview);
  if (store.kind !== "ok") return { title: "Collection not found" };
  const page = await fetchCollection(store.ctx.host, (await params).handle);
  if (!page) return { title: "Collection not found" };
  const n = pageNumber(query.page);
  return {
    title: `${page.collection.name}${n > 1 ? ` — Page ${n}` : ""} · ${store.data.shop.name}`,
    robots: store.data.isPreview ? { index: false, follow: false } : undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const query = await searchParams;
  const store = await loadStore(query.preview);
  if (store.kind !== "ok") return storeFallback(store);
  const { ctx } = store;

  const { handle } = await params;
  const settings = collectionProductsOf(store.data.layout, handle);
  const shopperSort = settings.sortMenu && isProductSort(query.sort) ? query.sort : null;
  const sort = shopperSort ?? settings.sort;
  const requested = pageNumber(query.page);
  const page = await fetchCollection(ctx.host, handle, requested, settings.perPage ?? DEFAULT_PER_PAGE, sort);
  if (!page) notFound();
  const { collection, products, total, pageSize } = page;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const hrefFor = (n: number) => {
    const qs = new URLSearchParams();
    if (shopperSort) qs.set("sort", shopperSort);
    if (n > 1) qs.set("page", String(n));
    return storeHref(`/collections/${collection.handle}${qs.size ? `?${qs}` : ""}`, ctx);
  };
  if (requested > totalPages) redirect(hrefFor(totalPages));

  const first = (requested - 1) * pageSize + 1;
  const countText =
    totalPages > 1
      ? `Showing ${first}–${first + products.length - 1} of ${total} products`
      : `${total} ${total === 1 ? "product" : "products"}`;

  return (
    <StoreShell
      layout={store.data.layout}
      isPreview={store.data.isPreview}
      ctx={ctx}
      around={collectionTemplateOf(store.data.layout, collection.handle)}
      page={{ collectionHandle: collection.handle === "all" ? null : collection.handle }}
    >
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className={`mb-8 ${HEADINGS[settings.heading]}`}>
          <h1 className="sk-heading text-4xl font-semibold">{collection.name}</h1>
          {settings.showDescription && collection.description && (
            <p className="sk-muted mt-3 max-w-2xl">{collection.description}</p>
          )}
        </div>
        {(settings.showCount || settings.sortMenu) && total > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="sk-muted text-sm">{settings.showCount && countText}</p>
            {settings.sortMenu && <SortMenu value={sort} labels={PRODUCT_TABLE_SORT_LABELS} />}
          </div>
        )}
        {products.length > 0 ? (
          <ProductGridList products={products} ctx={ctx} columns={settings.columns} />
        ) : (
          <p className="sk-muted py-16 text-center">No products here yet. Check back soon!</p>
        )}
        <Pagination page={requested} totalPages={totalPages} hrefFor={hrefFor} />
      </div>
    </StoreShell>
  );
}
