import type { SectionOf, SectionType } from "@shopkit/themes";
import type { StoreContext } from "@/lib/store-context";

/** What "this page's category" means where a section is shown. */
export interface PageScope {
  /** The collection being browsed, or the category of the product being viewed. */
  collectionHandle: string | null;
  /** The product being viewed, left out of product lists on its own page. */
  productId?: string;
}

export interface SectionProps<T extends SectionType> {
  section: SectionOf<T>;
  isPreview: boolean;
  logoText: string;
  logoUrl?: string;
  ctx: StoreContext;
  page?: PageScope;
}
