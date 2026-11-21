export function formatPrice(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: minorUnits % 100 === 0 ? 0 : 2,
  }).format(minorUnits / 100);
}

/** Internal links keep the preview token so a seller can click around a draft design. */
export function storeHref(href: string, ctx: { previewToken: string | null }): string {
  if (!ctx.previewToken || !href.startsWith("/")) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}preview=${encodeURIComponent(ctx.previewToken)}`;
}
