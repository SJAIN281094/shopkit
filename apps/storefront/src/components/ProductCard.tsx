import type { Product } from "@/lib/api";
import { formatPrice, storeHref, type StoreContext } from "@/lib/store-context";

export function ProductCard({ product, ctx }: { product: Product; ctx: StoreContext }) {
  const soldOut = product.stock === 0;
  const image = product.images[0];

  return (
    <a href={storeHref(`/products/${product.handle}`, ctx)} className="sk-card group block space-y-2">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="sk-placeholder h-full w-full" />
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-medium text-white">
            Sold out
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
      <p className="flex items-baseline gap-2 text-sm">
        <span className="font-semibold">
          {product.variants.some((v) => v.price !== product.price) && "from "}
          {formatPrice(product.price, ctx.currency)}
        </span>
        {product.compareAtPrice && (
          <span className="sk-muted text-xs line-through">{formatPrice(product.compareAtPrice, ctx.currency)}</span>
        )}
      </p>
    </a>
  );
}

export const GRID_COLUMNS: Record<2 | 3 | 4, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

export function ProductGridList({
  products,
  ctx,
  columns = 4,
  layout = "grid",
}: {
  products: Product[];
  ctx: StoreContext;
  columns?: 2 | 3 | 4;
  layout?: "grid" | "scroll";
}) {
  if (layout === "scroll") {
    return (
      <div className="sk-scroll-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
        {products.map((p) => (
          <div key={p.id} className="w-[44%] shrink-0 sm:w-[30%] lg:w-[22%]">
            <ProductCard product={p} ctx={ctx} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={`grid gap-x-4 gap-y-8 ${GRID_COLUMNS[columns]} ${columns === 2 ? "sm:gap-x-8" : ""}`}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} ctx={ctx} />
      ))}
    </div>
  );
}
