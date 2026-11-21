import { PRODUCT_LIST_SORTS, type ProductListSort } from "@shopkit/themes";
import { fetchProducts, type Product } from "./api";
import type { PageScope } from "@/sections/types";

/** The most products a list fetches when it needs to filter before trimming. */
const PRODUCT_POOL = 48;

export function isProductSort(value: unknown): value is ProductListSort {
  return typeof value === "string" && (PRODUCT_LIST_SORTS as readonly string[]).includes(value);
}

/**
 * Products for a grid or table: from the page's category when `scope` is "current" and the page
 * has one, otherwise from `collectionHandle` (empty = all). The product being viewed is left out.
 */
export async function loadScopedProducts(
  host: string,
  { scope, collectionHandle }: { scope?: "fixed" | "current"; collectionHandle: string },
  page: PageScope | undefined,
  limit: number,
  options: { sort?: ProductListSort; hideSoldOut?: boolean } = {},
): Promise<{ products: Product[]; handle: string | null }> {
  const handle = scope === "current" && page ? page.collectionHandle : collectionHandle || null;
  const fetchLimit = options.hideSoldOut ? PRODUCT_POOL : limit + (page?.productId ? 1 : 0);
  let products = await fetchProducts(host, handle, fetchLimit, options.sort);
  if (page?.productId) products = products.filter((p) => p.id !== page.productId);
  if (options.hideSoldOut) products = products.filter((p) => p.stock !== 0);
  return { products: products.slice(0, limit), handle };
}
