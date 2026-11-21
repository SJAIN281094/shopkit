import { GRID_COLUMNS, ProductGridList } from "@/components/ProductCard";
import { loadScopedProducts } from "@/lib/products";
import { storeHref } from "@/lib/store-context";
import type { SectionProps } from "./types";

export async function ProductGrid({ section, isPreview, ctx, page }: SectionProps<"product-grid">) {
  const { heading, limit, columns = 4, layout = "grid" } = section.settings;
  const { products, handle } = await loadScopedProducts(ctx.host, section.settings, page, limit);
  if (products.length === 0 && !isPreview) return null;

  return (
    <section id={section.id} className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="sk-heading text-3xl font-semibold">{heading}</h2>
        {products.length > 0 && (
          <a
            href={storeHref(`/collections/${handle || "all"}`, ctx)}
            className="sk-primary-text whitespace-nowrap text-sm font-medium hover:underline"
          >
            View all
          </a>
        )}
      </div>
      {products.length > 0 ? (
        <ProductGridList products={products} ctx={ctx} columns={columns} layout={layout} />
      ) : (
        <>
          <p className="sk-muted -mt-6 mb-8 text-sm">Your products will appear here once you add them.</p>
          <div className={`grid gap-4 ${GRID_COLUMNS[columns]}`}>
            {Array.from({ length: Math.min(limit, columns) }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className="sk-placeholder aspect-[3/4] rounded-lg" />
                <div className="sk-soft-bg h-4 w-3/4 rounded" />
                <div className="sk-soft-bg h-4 w-1/3 rounded" />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
