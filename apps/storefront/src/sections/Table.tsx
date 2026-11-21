import type { ReactNode } from "react";
import { PRODUCT_TABLE_FIELD_LABELS, type ProductTable, type ProductTableField } from "@shopkit/themes";
import type { Product } from "@/lib/api";
import { loadScopedProducts } from "@/lib/products";
import { formatPrice, storeHref, type StoreContext } from "@/lib/store-context";
import type { SectionProps } from "./types";

const LOW_STOCK = 5;

export async function Table({ section, isPreview, ctx, page }: SectionProps<"table">) {
  const { heading, intro, style, note, source = "manual", products: productTable } = section.settings;

  let head: string[];
  let body: ReactNode[][];
  if (source === "products" && productTable) {
    const { products } = await loadScopedProducts(ctx.host, productTable, page, productTable.limit, {
      sort: productTable.sort,
      hideSoldOut: productTable.hideSoldOut,
    });
    if (products.length === 0 && !isPreview) return null;
    head = productTable.fields.map((f) => PRODUCT_TABLE_FIELD_LABELS[f]);
    body = products.map((p) => productTable.fields.map((f) => productCell(p, f, productTable, ctx)));
  } else {
    head = section.settings.columns;
    body = section.settings.rows;
  }

  return (
    <section id={section.id} className="mx-auto max-w-4xl px-4 py-16">
      <h2 className="sk-heading text-3xl font-semibold">{heading}</h2>
      {intro && <p className="sk-muted mt-3 max-w-2xl">{intro}</p>}
      <div className={`mt-8 overflow-x-auto ${style === "striped" ? "rounded-xl" : ""}`}>
        <table className="sk-table" data-style={style}>
          <thead>
            <tr>
              {head.map((column, i) => (
                <th key={i} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r}>
                {head.map((_, c) => (
                  <td key={c}>{row[c] ?? ""}</td>
                ))}
              </tr>
            ))}
            {body.length === 0 && (
              <tr>
                <td colSpan={head.length} className="sk-muted">
                  No products to show yet — they will appear here automatically.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {note && <p className="sk-muted mt-4 text-sm">{note}</p>}
    </section>
  );
}

function productCell(p: Product, field: ProductTableField, table: ProductTable, ctx: StoreContext): ReactNode {
  switch (field) {
    case "product":
      return (
        <a href={storeHref(`/products/${p.handle}`, ctx)} className="flex items-center gap-3 font-medium hover:underline">
          {table.showImages &&
            (p.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.images[0]} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md object-cover" />
            ) : (
              <span className="sk-placeholder h-10 w-10 shrink-0 rounded-md" />
            ))}
          {p.title}
        </a>
      );
    case "price":
      return (
        <span className="whitespace-nowrap font-semibold">
          {p.variants.some((v) => v.price !== p.price) && "from "}
          {formatPrice(p.price, ctx.currency)}
        </span>
      );
    case "mrp":
      return p.compareAtPrice ? (
        <span className="sk-muted whitespace-nowrap line-through">{formatPrice(p.compareAtPrice, ctx.currency)}</span>
      ) : (
        "—"
      );
    case "discount":
      return p.compareAtPrice && p.compareAtPrice > p.price
        ? `${Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100)}% off`
        : "—";
    case "availability":
      if (p.stock === 0) return <span className="sk-muted">Sold out</span>;
      if (p.stock !== null && p.stock <= LOW_STOCK) return `Only ${p.stock} left`;
      return "In stock";
    case "collection":
      return p.collection?.name ?? "—";
    case "options":
      return p.options.length ? p.options.map((o) => `${o.name}: ${o.values.join(", ")}`).join(" · ") : "—";
  }
}
