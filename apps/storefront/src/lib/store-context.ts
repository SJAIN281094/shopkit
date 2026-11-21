import { headers } from "next/headers";
import { findWhatsappPhone, type StoreLayout } from "@shopkit/themes";
import { fetchStorefront, type StorefrontData } from "./api";

export interface StoreContext {
  host: string;
  /** Set while the seller previews a draft design; carried on internal links. */
  previewToken: string | null;
  currency: string;
  whatsappPhone: string | null;
}

export type LoadedStore =
  | { kind: "ok"; data: StorefrontData & { layout: StoreLayout }; ctx: StoreContext }
  | { kind: "not-ready"; data: StorefrontData }
  | { kind: "not-found" }
  | { kind: "preview-expired" };

export async function loadStore(previewToken?: string): Promise<LoadedStore> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const result = await fetchStorefront(host, previewToken);
  if (result.kind !== "ok") return result;

  const { data } = result;
  if (!data.layout) return { kind: "not-ready", data };
  return {
    kind: "ok",
    data: { ...data, layout: data.layout },
    ctx: {
      host,
      previewToken: data.isPreview && previewToken ? previewToken : null,
      currency: data.shop.currency,
      whatsappPhone: findWhatsappPhone(data.layout.sections),
    },
  };
}

export { formatPrice, storeHref } from "./format";
