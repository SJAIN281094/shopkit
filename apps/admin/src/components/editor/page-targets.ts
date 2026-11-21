import {
  EMPTY_PAGE_TEMPLATE,
  isSharedSectionType,
  MAX_PAGE_SECTIONS,
  MAX_TEMPLATE_SECTIONS,
  SECTION_TYPES,
  type CollectionProductsSettings,
  type PageTemplateKey,
  type ProductDetailsSettings,
  type Section,
  type SectionType,
  type StoreLayout,
  type StorePage,
} from "@shopkit/themes";

/** Which page the editor is working on. */
export type PageTarget =
  | { kind: "home" }
  | { kind: "page"; id: string }
  | { kind: "template"; key: PageTemplateKey }
  /** One collection with its own layout. */
  | { kind: "collection"; handle: string };

export const ALL_PRODUCTS_HANDLE = "all";

export const HOME: PageTarget = { kind: "home" };

export const TEMPLATE_INFO: Record<PageTemplateKey, { label: string; main: string; hint: string; category: string }> = {
  product: {
    label: "Product page",
    main: "Product details",
    hint: "Used for every product. Add sections above or below the product details — like related products, a size guide or FAQ.",
    category: "Same category as the product",
  },
  collection: {
    label: "Collection page",
    main: "Collection products",
    hint: "Used for every collection that doesn't have its own layout, and for “Shop all”. Add a banner above the products or extra sections below.",
    category: "This collection",
  },
};

/** The fixed block and category wording for product, collection and single-collection pages. */
export function mainBlockInfo(target: PageTarget): { main: string; category: string } | null {
  if (target.kind === "template") return TEMPLATE_INFO[target.key];
  if (target.kind === "collection") return TEMPLATE_INFO.collection;
  return null;
}

/** Where the main block's settings live, e.g. ["templates", "collections", "kurtas", "main"]. */
export function mainPath(target: PageTarget): (string | number)[] | null {
  if (target.kind === "template") return ["templates", target.key, "main"];
  if (target.kind === "collection") return ["templates", "collections", target.handle, "main"];
  return null;
}

/**
 * A page's sections as one or more lists. Home and custom pages have one; product and
 * collection pages have two, either side of the fixed content.
 */
export interface PageSlots {
  lists: Section[][];
  /** Error path of each list, e.g. ["pages", 2, "sections"]. */
  paths: (string | number)[][];
  maxPerList: number;
  /** Types that can be added to this page. */
  addable: SectionType[];
}

const PAGE_TYPES = SECTION_TYPES.filter((t) => !isSharedSectionType(t));

export function targetKey(target: PageTarget): string {
  if (target.kind === "home") return "home";
  if (target.kind === "page") return `page:${target.id}`;
  if (target.kind === "collection") return `collection:${target.handle}`;
  return `template:${target.key}`;
}

export function parseTargetKey(key: string): PageTarget {
  if (key.startsWith("page:")) return { kind: "page", id: key.slice(5) };
  if (key.startsWith("collection:")) return { kind: "collection", handle: key.slice(11) };
  if (key === "template:product" || key === "template:collection") return { kind: "template", key: key.slice(9) as PageTemplateKey };
  return HOME;
}

export function findPage(layout: StoreLayout, id: string): { page: StorePage; index: number } | null {
  const index = (layout.pages ?? []).findIndex((p) => p.id === id);
  return index === -1 ? null : { page: layout.pages![index], index };
}

export function slotsFor(layout: StoreLayout, target: PageTarget): PageSlots | null {
  if (target.kind === "home") {
    return { lists: [layout.sections], paths: [["sections"]], maxPerList: 30, addable: SECTION_TYPES };
  }
  if (target.kind === "page") {
    const found = findPage(layout, target.id);
    if (!found) return null;
    return { lists: [found.page.sections], paths: [["pages", found.index, "sections"]], maxPerList: MAX_PAGE_SECTIONS, addable: PAGE_TYPES };
  }
  if (target.kind === "collection") {
    const own = layout.templates?.collections?.[target.handle];
    if (!own) return null;
    const base = ["templates", "collections", target.handle];
    return {
      lists: [own.above, own.below],
      paths: [
        [...base, "above"],
        [...base, "below"],
      ],
      maxPerList: MAX_TEMPLATE_SECTIONS,
      addable: PAGE_TYPES,
    };
  }
  const template = layout.templates?.[target.key] ?? EMPTY_PAGE_TEMPLATE;
  return {
    lists: [template.above, template.below],
    paths: [
      ["templates", target.key, "above"],
      ["templates", target.key, "below"],
    ],
    maxPerList: MAX_TEMPLATE_SECTIONS,
    addable: PAGE_TYPES,
  };
}

export function withSlots(layout: StoreLayout, target: PageTarget, lists: Section[][]): StoreLayout {
  if (target.kind === "home") return { ...layout, sections: lists[0] };
  if (target.kind === "page") {
    return { ...layout, pages: (layout.pages ?? []).map((p) => (p.id === target.id ? { ...p, sections: lists[0] } : p)) };
  }
  if (target.kind === "collection") {
    const own = layout.templates?.collections?.[target.handle];
    if (!own) return layout;
    const collections = { ...layout.templates?.collections, [target.handle]: { ...own, above: lists[0], below: lists[1] } };
    return { ...layout, templates: { ...layout.templates, collections } };
  }
  return { ...layout, templates: { ...layout.templates, [target.key]: { ...layout.templates?.[target.key], above: lists[0], below: lists[1] } } };
}

export function withProductDetails(layout: StoreLayout, main: ProductDetailsSettings): StoreLayout {
  const product = layout.templates?.product ?? EMPTY_PAGE_TEMPLATE;
  return { ...layout, templates: { ...layout.templates, product: { ...product, main } } };
}

/** Sets the product list settings of the shared collection page, or of one collection's own layout. */
export function withCollectionProducts(layout: StoreLayout, main: CollectionProductsSettings, handle?: string): StoreLayout {
  const own = handle ? layout.templates?.collections?.[handle] : undefined;
  if (handle && own) {
    return { ...layout, templates: { ...layout.templates, collections: { ...layout.templates?.collections, [handle]: { ...own, main } } } };
  }
  const collection = layout.templates?.collection ?? EMPTY_PAGE_TEMPLATE;
  return { ...layout, templates: { ...layout.templates, collection: { ...collection, main } } };
}

/** Whether a page has fields needing fixing, to flag it in the page picker. */
export function targetHasIssues(target: PageTarget, layout: StoreLayout, issuePaths: (string | number)[][]): boolean {
  if (target.kind === "home") return issuePaths.some((p) => p[0] === "sections");
  if (target.kind === "page") {
    const found = findPage(layout, target.id);
    return !!found && issuePaths.some((p) => p[0] === "pages" && p[1] === found.index);
  }
  if (target.kind === "collection") return issuePaths.some((p) => p[0] === "templates" && p[1] === "collections" && p[2] === target.handle);
  return issuePaths.some((p) => p[0] === "templates" && p[1] === target.key);
}

/** Header menu and footer links that point at a page. */
export function pageHref(handle: string): string {
  return `/pages/${handle}`;
}

type Link = { label: string; href: string };

/** Rewrites, or with `to === null` removes, header and footer links to a page. */
export function relinkPage(layout: StoreLayout, fromHref: string, to: Link | null): StoreLayout {
  const relink = (links: Link[]) =>
    to === null ? links.filter((l) => l.href !== fromHref) : links.map((l) => (l.href === fromHref ? { ...l, href: to.href } : l));
  return {
    ...layout,
    sections: layout.sections.map((s) => {
      if (s.type === "header") return { ...s, settings: { ...s.settings, menu: relink(s.settings.menu) } };
      if (s.type === "footer") return { ...s, settings: { ...s.settings, links: relink(s.settings.links) } };
      return s;
    }),
  };
}

export const MAX_MENU_LINKS = 8;

export function headerMenu(layout: StoreLayout): Link[] | null {
  const header = layout.sections.find((s) => s.type === "header");
  return header?.type === "header" ? header.settings.menu : null;
}

export function setHeaderMenu(layout: StoreLayout, menu: Link[]): StoreLayout {
  return {
    ...layout,
    sections: layout.sections.map((s) => (s.type === "header" ? { ...s, settings: { ...s.settings, menu } } : s)),
  };
}
