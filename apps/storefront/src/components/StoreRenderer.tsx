import type { CSSProperties, ReactNode } from "react";
import { isBuiltInFont, type PageTemplate, type Section, type StoreLayout, type StorePage } from "@shopkit/themes";
import type { StoreContext } from "@/lib/store-context";
import { SECTION_COMPONENTS } from "@/sections";
import { PreviewRefresh } from "./PreviewRefresh";
import type { PageScope, SectionProps } from "@/sections/types";

/** Sections kept around product and collection pages. */
const CHROME_TOP = new Set<Section["type"]>(["announcement-bar", "header"]);
const CHROME_BOTTOM = new Set<Section["type"]>(["footer"]);

function googleFontsHref(fonts: string[]): string {
  const families = [...new Set(fonts)]
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

interface RenderProps {
  layout: StoreLayout;
  isPreview: boolean;
  ctx: StoreContext;
  page?: PageScope;
}

function renderSections(sections: Section[], { layout, isPreview, ctx, page }: RenderProps) {
  return sections.map((section) => {
    const Component = SECTION_COMPONENTS[section.type] as React.ComponentType<SectionProps<Section["type"]>>;
    return (
      <Component
        key={section.id}
        section={section}
        isPreview={isPreview}
        logoText={layout.settings.logoText}
        logoUrl={layout.settings.logoUrl || undefined}
        ctx={ctx}
        page={page}
      />
    );
  });
}

const FONT_FORMATS: Record<string, string> = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" };

/** @font-face rules for uploaded fonts in use. Names and URLs are restricted by the theme schema, so they're CSS-safe. */
function customFontFaces(settings: StoreLayout["settings"]): string {
  const used = new Set([settings.fonts.heading, settings.fonts.body]);
  return (settings.customFonts ?? [])
    .filter((font) => used.has(font.name))
    .map((font) => {
      const ext = font.url.slice(font.url.lastIndexOf(".") + 1).toLowerCase();
      return `@font-face{font-family:"${font.name}";src:url("${font.url}") format("${FONT_FORMATS[ext] ?? ext}");font-display:swap;}`;
    })
    .join("");
}

function StoreFrame({ layout, isPreview, children }: { layout: StoreLayout; isPreview: boolean; children: ReactNode }) {
  const { colors, fonts, style: storeStyle } = layout.settings;
  const googleFonts = [fonts.heading, fonts.body].filter(isBuiltInFont);
  const fontFaces = customFontFaces(layout.settings);
  const style = {
    "--sk-primary": colors.primary,
    "--sk-accent": colors.accent,
    "--sk-bg": colors.background,
    "--sk-text": colors.text,
    "--sk-heading-font": `"${fonts.heading}"`,
    "--sk-body-font": `"${fonts.body}"`,
  } as CSSProperties;

  return (
    <div
      className="sk-store flex min-h-screen flex-col"
      style={style}
      data-buttons={storeStyle?.buttons ?? "pill"}
      data-cards={storeStyle?.cards ?? "plain"}
    >
      {googleFonts.length > 0 && <link rel="stylesheet" href={googleFontsHref(googleFonts)} precedence="default" />}
      {fontFaces && <style>{fontFaces}</style>}
      {isPreview && (
        <>
          <PreviewRefresh />
          <div className="sticky top-0 z-50 bg-zinc-900 px-4 py-2 text-center text-xs font-medium text-white">
            Preview — only you can see this version.
          </div>
        </>
      )}
      {children}
    </div>
  );
}

/** The full home page: every section in the layout. */
export function StoreRenderer(props: RenderProps) {
  return (
    <StoreFrame layout={props.layout} isPreview={props.isPreview}>
      {renderSections(props.layout.sections, props)}
    </StoreFrame>
  );
}

/**
 * Any other page: the store's announcement bar, header and footer around `children`,
 * with the seller's extra sections for this kind of page above and below.
 */
export function StoreShell({
  children,
  around,
  ...props
}: RenderProps & { children: ReactNode; around?: PageTemplate }) {
  const { sections } = props.layout;
  const shared = { ...props, page: undefined };
  return (
    <StoreFrame layout={props.layout} isPreview={props.isPreview}>
      {renderSections(sections.filter((s) => CHROME_TOP.has(s.type)), shared)}
      <main className="flex-1">
        {around && renderSections(around.above, props)}
        {children}
        {around && renderSections(around.below, props)}
      </main>
      {renderSections(sections.filter((s) => CHROME_BOTTOM.has(s.type)), shared)}
    </StoreFrame>
  );
}

/** A custom page: shared header and footer around the page's own sections. */
export function PageRenderer({ storePage, ...props }: RenderProps & { storePage: StorePage }) {
  return (
    <StoreShell {...props}>
      {storePage.sections.length > 0 ? (
        renderSections(storePage.sections, props)
      ) : (
        <h1 className="sk-heading mx-auto max-w-4xl px-4 py-16 text-4xl font-semibold">{storePage.title}</h1>
      )}
    </StoreShell>
  );
}
