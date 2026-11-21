import { cache } from "react";
import type { StoreLayout } from "@shopkit/themes";
import { ORDER_FIELDS, type StoreOrder } from "./orders";

export interface StorefrontShop {
  id: string;
  name: string;
  subdomain: string;
  currency: string;
  codEnabled: boolean;
  onlinePayments: boolean;
  /** Online payments use a fake gateway (development only). */
  testPayments: boolean;
  shippingFee: number;
  freeShippingAbove: number | null;
}

export interface StorefrontData {
  shop: StorefrontShop;
  layout: StoreLayout | null;
  isPreview: boolean;
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  /** In the smallest currency unit (paise). */
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  images: string[];
  collection: { name: string; handle: string } | null;
  options: { name: string; values: string[] }[];
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  optionValues: string[];
  title: string;
  price: number;
  compareAtPrice: number | null;
  /** null means unlimited. */
  stock: number | null;
}

export interface CollectionPage {
  collection: { name: string; handle: string; description: string };
  /** This page's products. */
  products: Product[];
  /** Products in the whole collection. */
  total: number;
  page: number;
  pageSize: number;
}

export type StorefrontResult =
  | { kind: "ok"; data: StorefrontData }
  | { kind: "not-found" }
  | { kind: "preview-expired" };

const PRODUCT_FIELDS = `
  id title handle description price compareAtPrice stock images
  collection { name handle }
  options { name values }
  variants { id optionValues title price compareAtPrice stock }
`;

interface GraphQLError {
  message: string;
  extensions?: { code?: string };
}

export class GraphQLRequestError extends Error {
  constructor(public readonly errors: GraphQLError[]) {
    super(errors.map((e) => e.message).join("; "));
  }
}

export async function request<T>(
  query: string,
  variables: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(process.env.API_GRAPHQL_URL ?? "http://localhost:4000/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { data?: T; errors?: GraphQLError[] };
  if (body.errors?.length) throw new GraphQLRequestError(body.errors);
  if (!res.ok) throw new Error(`Storefront API responded with ${res.status}`);
  return body.data as T;
}

export const fetchStorefront = cache(async (host: string, previewToken?: string): Promise<StorefrontResult> => {
  try {
    const data = await request<{ storefront: StorefrontData | null }>(
      `query Storefront($host: String!, $previewToken: String) {
        storefront(host: $host, previewToken: $previewToken) {
          isPreview
          layout
          shop { id name subdomain currency codEnabled onlinePayments testPayments shippingFee freeShippingAbove }
        }
      }`,
      { host, previewToken: previewToken ?? null },
    );
    return data.storefront ? { kind: "ok", data: data.storefront } : { kind: "not-found" };
  } catch (error) {
    const expired =
      previewToken &&
      error instanceof GraphQLRequestError &&
      error.errors.some((e) => e.extensions?.code === "UNAUTHENTICATED");
    if (expired) return { kind: "preview-expired" };
    throw error;
  }
});

export async function fetchProducts(
  host: string,
  collectionHandle: string | null,
  limit: number,
  sort = "newest",
): Promise<Product[]> {
  const data = await request<{ storefrontProducts: Product[] }>(
    `query Products($host: String!, $collectionHandle: String, $limit: Int!, $sort: String!) {
      storefrontProducts(host: $host, collectionHandle: $collectionHandle, limit: $limit, sort: $sort) { ${PRODUCT_FIELDS} }
    }`,
    { host, collectionHandle, limit, sort },
  );
  return data.storefrontProducts;
}

export const fetchProduct = cache(async (host: string, handle: string): Promise<Product | null> => {
  const data = await request<{ storefrontProduct: Product | null }>(
    `query Product($host: String!, $handle: String!) {
      storefrontProduct(host: $host, handle: $handle) { ${PRODUCT_FIELDS} }
    }`,
    { host, handle },
  );
  return data.storefrontProduct;
});

export const fetchCollection = cache(
  async (host: string, handle: string, page = 1, pageSize = 48, sort = "newest"): Promise<CollectionPage | null> => {
    const data = await request<{ storefrontCollection: CollectionPage | null }>(
      `query Collection($host: String!, $handle: String!, $page: Int!, $pageSize: Int!, $sort: String!) {
        storefrontCollection(host: $host, handle: $handle, page: $page, pageSize: $pageSize, sort: $sort) {
          collection { name handle description }
          products { ${PRODUCT_FIELDS} }
          total
          page
          pageSize
        }
      }`,
      { host, handle, page, pageSize, sort },
    );
    return data.storefrontCollection;
  },
);

export const fetchOrder = cache(async (host: string, input: { orderId: string; token: string }): Promise<StoreOrder | null> => {
  try {
    const data = await request<{ storefrontOrder: StoreOrder }>(
      `query Order($host: String!, $input: OrderAccessInput!) {
        storefrontOrder(host: $host, input: $input) { ${ORDER_FIELDS} }
      }`,
      { host, input },
    );
    return data.storefrontOrder;
  } catch (error) {
    if (error instanceof GraphQLRequestError) return null;
    throw error;
  }
});
