const protocol = process.env.NEXT_PUBLIC_STOREFRONT_PROTOCOL ?? "http";
const rootDomain = process.env.NEXT_PUBLIC_STOREFRONT_ROOT_DOMAIN ?? "localhost:3020";

export function storefrontUrl(subdomain: string, previewToken?: string, path = "/"): string {
  const base = `${protocol}://${subdomain}.${rootDomain}`;
  return previewToken ? `${base}${path}?preview=${encodeURIComponent(previewToken)}` : path === "/" ? base : `${base}${path}`;
}

export function storefrontHostLabel(subdomain: string): string {
  return `${subdomain}.${rootDomain}`;
}
