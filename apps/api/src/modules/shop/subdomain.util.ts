const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'admin', 'api', 'dashboard', 'store', 'stores', 'shop', 'shops', 'shopkit',
  'mail', 'email', 'smtp', 'ftp', 'cdn', 'static', 'assets', 'media', 'img', 'images',
  'help', 'support', 'docs', 'blog', 'status', 'billing', 'checkout', 'pay', 'payments',
  'login', 'signup', 'auth', 'account', 'accounts', 'dev', 'staging', 'test', 'demo', 'preview',
]);

export const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

export function normalizeSubdomain(value: string): string {
  return value.trim().toLowerCase();
}

/** Returns a human-readable reason when the subdomain cannot be used, otherwise null. */
export function subdomainProblem(subdomain: string): string | null {
  if (!SUBDOMAIN_PATTERN.test(subdomain)) {
    return 'Use 3–32 lowercase letters, numbers or hyphens, starting and ending with a letter or number';
  }
  if (subdomain.includes('--')) return 'Hyphens cannot be repeated';
  if (RESERVED_SUBDOMAINS.has(subdomain)) return 'This name is reserved';
  return null;
}
