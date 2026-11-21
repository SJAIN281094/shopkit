import { storeHref } from "@/lib/store-context";
import type { SectionProps } from "./types";

export function Footer({ section, logoText, ctx }: SectionProps<"footer">) {
  return (
    <footer className="sk-border border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <p className="sk-heading text-xl font-semibold">{logoText}</p>
          {section.settings.aboutText && <p className="sk-muted max-w-md text-sm">{section.settings.aboutText}</p>}
        </div>
        <ul className="space-y-2 text-sm">
          {section.settings.links.map((link) => (
            <li key={`${link.label}-${link.href}`}>
              <a href={storeHref(link.href, ctx)} className="sk-muted hover:underline">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="sk-muted sk-border border-t py-4 text-center text-xs">
        © {new Date().getFullYear()} {logoText}
      </p>
    </footer>
  );
}
