import type { ReactNode } from "react";
import type { ProductDetailsSettings } from "@shopkit/themes";
import type { Product } from "@/lib/api";
import { storeHref, type StoreContext } from "@/lib/store-context";
import { ProductGallery } from "./ProductGallery";

/** The product page's main block, laid out from the seller's settings. */
export function ProductDetails({
  product,
  settings,
  ctx,
  buy,
}: {
  product: Product;
  settings: ProductDetailsSettings;
  ctx: StoreContext;
  /** Price, options and buy buttons. */
  buy: ReactNode;
}) {
  const { layout, imageShape, thumbnails, showCategory, description, stickyDetails } = settings;
  const stacked = layout === "stacked";
  const descriptionBlock = product.description ? (
    <p className="whitespace-pre-line leading-relaxed">{product.description}</p>
  ) : null;

  const details = (
    <div
      className={`space-y-5 ${stacked ? "mx-auto w-full max-w-xl text-center [&_.flex]:justify-center" : ""} ${
        stickyDetails && !stacked ? "md:sticky md:top-24 md:self-start" : ""
      }`}
    >
      {showCategory && product.collection && (
        <a
          href={storeHref(`/collections/${product.collection.handle}`, ctx)}
          className="sk-muted text-xs font-medium uppercase tracking-wider hover:underline"
        >
          {product.collection.name}
        </a>
      )}
      <h1 className="sk-heading text-3xl font-semibold sm:text-4xl">{product.title}</h1>
      {buy}
      {description === "beside" && descriptionBlock && <div className="sk-border border-t pt-5 text-left">{descriptionBlock}</div>}
    </div>
  );

  const gallery = (
    <div className={layout === "gallery-right" ? "md:order-last" : stacked ? "mx-auto w-full max-w-2xl" : ""}>
      <ProductGallery images={product.images} title={product.title} shape={imageShape} thumbnails={thumbnails} />
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className={`grid gap-10 ${stacked ? "" : "md:grid-cols-2"}`}>
        {gallery}
        {details}
      </div>
      {description === "below" && descriptionBlock && (
        <div className="sk-border mx-auto mt-12 max-w-3xl border-t pt-8">
          <h2 className="sk-heading mb-4 text-2xl font-semibold">About this product</h2>
          {descriptionBlock}
        </div>
      )}
    </div>
  );
}
