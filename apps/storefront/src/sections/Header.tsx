import { CartLink } from "@/components/CartLink";
import { storeHref } from "@/lib/store-context";
import type { SectionProps } from "./types";

export function Header({ section, logoText, logoUrl, ctx }: SectionProps<"header">) {
  const { menu, layout = "classic", sticky = false } = section.settings;
  const bold = layout === "bold";

  const logo = (
    <a
      href={storeHref("/", ctx)}
      className={`sk-heading text-2xl font-semibold ${bold ? "" : "sk-primary-text"} ${layout === "centered" ? "text-3xl" : ""}`}
    >
      {logoUrl ? <img src={logoUrl} alt={logoText} className="h-10 w-auto max-w-[200px] object-contain" /> : logoText}
    </a>
  );
  const nav = (
    <nav className="flex gap-5 overflow-x-auto text-sm font-medium">
      {menu.map((item) => (
        <a
          key={`${item.label}-${item.href}`}
          href={storeHref(item.href, ctx)}
          className="whitespace-nowrap hover:opacity-70"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
  const cart = <CartLink href={storeHref("/cart", ctx)} />;

  return (
    <header
      className={`${bold ? "sk-primary-bg" : "sk-border border-b"} ${sticky ? "sticky top-0 z-40" : ""}`}
      style={sticky && !bold ? { background: "color-mix(in srgb, var(--sk-bg) 92%, transparent)", backdropFilter: "blur(8px)" } : undefined}
    >
      {layout === "centered" ? (
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-5">
          <div className="relative flex w-full items-center justify-center">
            {logo}
            <div className="absolute right-0">{cart}</div>
          </div>
          <div className="text-xs uppercase tracking-[0.15em]">{nav}</div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          {logo}
          <div className="flex items-center gap-6">
            {nav}
            {cart}
          </div>
        </div>
      )}
    </header>
  );
}
