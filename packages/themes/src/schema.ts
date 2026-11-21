import { z } from 'zod';

export const FONT_OPTIONS = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Nunito',
  'Mukta',
  'Lora',
  'Playfair Display',
  'DM Serif Display',
] as const;

export const FEATURE_ICONS = [
  'truck',
  'shield',
  'refresh',
  'star',
  'heart',
  'leaf',
  'sparkles',
  'phone',
  'wallet',
  'gift',
] as const;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #1a2b3c');
const shortText = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().trim().min(1).max(max);
const imageUrl = z.union([z.literal(''), z.url({ protocol: /^https?$/ })]);
const href = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^(\/|#|https?:\/\/|mailto:|tel:)/i.test(v), {
    message: 'Links must start with /, #, http(s)://, mailto: or tel:',
  });

const link = z.object({
  label: requiredText(40),
  href,
});

export const MAX_CUSTOM_FONTS = 4;
export const CUSTOM_FONT_EXTENSIONS = ['woff2', 'woff', 'ttf', 'otf'] as const;

// The URL is written into a CSS url("…"), so quotes, parentheses, backslashes and whitespace are rejected.
const fontFileUrl = z
  .string()
  .regex(/^https?:\/\/[^\s"'()\\<>]+\.(woff2|woff|ttf|otf)$/i, 'Upload a WOFF2, WOFF, TTF or OTF font file');

export const customFontSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give this font a name')
    .max(40)
    .regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, 'Use letters, numbers, spaces and dashes only'),
  url: fontFileUrl,
});

const fontName = z.string().trim().min(1).max(40);

export const themeSettingsSchema = z
  .object({
    logoText: requiredText(60),
    /** Shown in the header instead of the logo text when set. */
    logoUrl: imageUrl.optional(),
    colors: z.object({
      primary: hexColor,
      accent: hexColor,
      background: hexColor,
      text: hexColor,
    }),
    /** A FONT_OPTIONS name or the name of one of `customFonts`. */
    fonts: z.object({
      heading: fontName,
      body: fontName,
    }),
    customFonts: z.array(customFontSchema).max(MAX_CUSTOM_FONTS).optional(),
    /** Store-wide look of buttons and product cards. Missing values mean "pill" and "plain". */
    style: z
      .object({
        buttons: z.enum(['pill', 'rounded', 'square']).optional(),
        cards: z.enum(['plain', 'bordered', 'shadow']).optional(),
      })
      .optional(),
  })
  .superRefine((settings, ctx) => {
    const custom = (settings.customFonts ?? []).map((f) => f.name.toLowerCase());
    custom.forEach((name, i) => {
      if (custom.indexOf(name) !== i) {
        ctx.addIssue({ code: 'custom', path: ['customFonts', i, 'name'], message: 'Another font already has this name' });
      }
    });
    for (const key of ['heading', 'body'] as const) {
      const font = settings.fonts[key];
      if (!isBuiltInFont(font) && !custom.includes(font.toLowerCase())) {
        ctx.addIssue({ code: 'custom', path: ['fonts', key], message: 'Pick a font from the list or upload it first' });
      }
    }
  });

export function isBuiltInFont(name: string): name is FontOption {
  return (FONT_OPTIONS as readonly string[]).includes(name);
}

const sectionId = z.string().trim().min(1).max(64);

export const announcementBarSection = z.object({
  id: sectionId,
  type: z.literal('announcement-bar'),
  settings: z.object({
    text: requiredText(120),
  }),
});

export const headerSection = z.object({
  id: sectionId,
  type: z.literal('header'),
  settings: z.object({
    menu: z.array(link).max(8),
    /** classic: logo left, menu right · centered: logo above a centred menu · bold: coloured bar */
    layout: z.enum(['classic', 'centered', 'bold']).optional(),
    sticky: z.boolean().optional(),
  }),
});

export const heroSection = z.object({
  id: sectionId,
  type: z.literal('hero'),
  settings: z.object({
    heading: requiredText(100),
    subheading: shortText(240),
    buttonLabel: shortText(40),
    buttonHref: href,
    imageUrl,
    alignment: z.enum(['left', 'center']),
    /** banner: text over image or colour · split: text beside image · parallax: fixed background · minimal: text only */
    variant: z.enum(['banner', 'split', 'parallax', 'minimal']).optional(),
    height: z.enum(['medium', 'tall', 'full']).optional(),
  }),
});

/**
 * fixed: products from `collectionHandle` (empty = all) · current: the category of the product
 * being viewed, or the collection being browsed — elsewhere it falls back to `collectionHandle`.
 */
const productScope = z.enum(['fixed', 'current']).optional();

export const productGridSection = z.object({
  id: sectionId,
  type: z.literal('product-grid'),
  settings: z.object({
    heading: requiredText(80),
    scope: productScope,
    collectionHandle: shortText(80),
    limit: z.number().int().min(1).max(24),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
    /** grid: rows of products · scroll: one row that scrolls sideways */
    layout: z.enum(['grid', 'scroll']).optional(),
  }),
});

export const featuresSection = z.object({
  id: sectionId,
  type: z.literal('features'),
  settings: z.object({
    variant: z.enum(['inline', 'cards', 'centered']).optional(),
    items: z
      .array(
        z.object({
          icon: z.enum(FEATURE_ICONS),
          title: requiredText(60),
          body: shortText(160),
        }),
      )
      .min(1)
      .max(6),
  }),
});

export const imageWithTextSection = z.object({
  id: sectionId,
  type: z.literal('image-with-text'),
  settings: z.object({
    heading: requiredText(100),
    body: shortText(1000),
    imageUrl,
    imagePosition: z.enum(['left', 'right']),
    buttonLabel: shortText(40),
    buttonHref: href,
  }),
});

export const testimonialsSection = z.object({
  id: sectionId,
  type: z.literal('testimonials'),
  settings: z.object({
    heading: requiredText(80),
    /** cards: a grid of reviews · spotlight: large centred quotes */
    variant: z.enum(['cards', 'spotlight']).optional(),
    items: z
      .array(
        z.object({
          quote: requiredText(300),
          author: requiredText(60),
          location: shortText(60),
        }),
      )
      .min(1)
      .max(6),
  }),
});

export const richTextSection = z.object({
  id: sectionId,
  type: z.literal('rich-text'),
  settings: z.object({
    heading: requiredText(100),
    body: shortText(2000),
  }),
});

export const whatsappCtaSection = z.object({
  id: sectionId,
  type: z.literal('whatsapp-cta'),
  settings: z.object({
    heading: requiredText(100),
    body: shortText(240),
    buttonLabel: requiredText(40),
    phone: z.union([z.literal(''), z.string().regex(/^\d{10,15}$/, 'Digits only, with country code')]),
  }),
});

export const parallaxBannerSection = z.object({
  id: sectionId,
  type: z.literal('parallax-banner'),
  settings: z.object({
    heading: requiredText(100),
    body: shortText(300),
    buttonLabel: shortText(40),
    buttonHref: href,
    /** Stays still while the page scrolls over it. Without one, a pattern in the store colours is used. */
    imageUrl,
    height: z.enum(['medium', 'tall']),
    alignment: z.enum(['left', 'center']),
  }),
});

export const MAX_TABLE_COLUMNS = 6;
export const MAX_TABLE_ROWS = 30;

/** Product details a table can show, in display order. */
export const PRODUCT_TABLE_FIELDS = ['product', 'price', 'mrp', 'discount', 'availability', 'collection', 'options'] as const;
export const PRODUCT_LIST_SORTS = ['newest', 'price-asc', 'price-desc', 'name'] as const;
export const PRODUCT_TABLE_SORTS = PRODUCT_LIST_SORTS;

export const productTableSchema = z.object({
  scope: productScope,
  /** Empty means all products. */
  collectionHandle: shortText(80),
  limit: z.number().int().min(1).max(MAX_TABLE_ROWS),
  fields: z
    .array(z.enum(PRODUCT_TABLE_FIELDS))
    .min(1, 'Pick at least one detail to show')
    .max(MAX_TABLE_COLUMNS)
    .refine((fields) => new Set(fields).size === fields.length, 'Each detail can only be shown once'),
  sort: z.enum(PRODUCT_TABLE_SORTS),
  showImages: z.boolean(),
  hideSoldOut: z.boolean(),
});

export const tableSection = z.object({
  id: sectionId,
  type: z.literal('table'),
  settings: z
    .object({
      heading: requiredText(100),
      intro: shortText(300),
      /** manual: the columns and rows below · products: rows are read live from the store's products. */
      source: z.enum(['manual', 'products']).optional(),
      products: productTableSchema.optional(),
      /** Kept while showing products so switching back restores the typed table. */
      columns: z.array(requiredText(40)).min(1).max(MAX_TABLE_COLUMNS),
      rows: z.array(z.array(shortText(120)).max(MAX_TABLE_COLUMNS)).min(1).max(MAX_TABLE_ROWS),
      style: z.enum(['striped', 'bordered', 'minimal']),
      note: shortText(200),
    })
    .superRefine((table, ctx) => {
      table.rows.forEach((row, i) => {
        if (row.length !== table.columns.length) {
          ctx.addIssue({ code: 'custom', path: ['rows', i], message: 'Each row needs one cell per column' });
        }
      });
      if (table.source === 'products' && !table.products) {
        ctx.addIssue({ code: 'custom', path: ['products'], message: 'Choose which products to show' });
      }
    }),
});

export const faqSection = z.object({
  id: sectionId,
  type: z.literal('faq'),
  settings: z.object({
    heading: requiredText(100),
    items: z
      .array(
        z.object({
          question: requiredText(160),
          answer: requiredText(800),
        }),
      )
      .min(1)
      .max(12),
  }),
});

export const footerSection = z.object({
  id: sectionId,
  type: z.literal('footer'),
  settings: z.object({
    aboutText: shortText(300),
    links: z.array(link).max(10),
  }),
});

export const sectionSchema = z.discriminatedUnion('type', [
  announcementBarSection,
  headerSection,
  heroSection,
  productGridSection,
  featuresSection,
  imageWithTextSection,
  testimonialsSection,
  richTextSection,
  whatsappCtaSection,
  parallaxBannerSection,
  tableSection,
  faqSection,
  footerSection,
]);

/** Every page shows these; they live in the home page's sections and are edited there. */
export const SHARED_SECTION_TYPES = ['announcement-bar', 'header', 'footer'] as const;
export const MAX_PAGES = 20;
export const MAX_PAGE_SECTIONS = 20;
export const MAX_TEMPLATE_SECTIONS = 10;
export const MAX_COLLECTION_LAYOUTS = 20;
export const PAGE_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSharedSectionType(type: string): boolean {
  return (SHARED_SECTION_TYPES as readonly string[]).includes(type);
}

/** Sections for a page other than home: no shared sections, and ids unique so anchors (#faq) work. */
const pageSections = (max: number) =>
  z
    .array(sectionSchema)
    .max(max)
    .superRefine((sections, ctx) => {
      const ids = sections.map((s) => s.id);
      sections.forEach((section, i) => {
        if (isSharedSectionType(section.type)) {
          ctx.addIssue({ code: 'custom', path: [i, 'type'], message: 'The header, announcement bar and footer are shared — edit them on the Home page' });
        }
        if (ids.indexOf(section.id) !== i) {
          ctx.addIssue({ code: 'custom', path: [i, 'id'], message: 'Duplicate section id' });
        }
      });
    });

export const storePageSchema = z.object({
  id: sectionId,
  title: requiredText(60),
  /** The page lives at /pages/<handle>. */
  handle: z
    .string()
    .trim()
    .min(1, 'Add a page address')
    .max(60)
    .regex(PAGE_HANDLE_PATTERN, 'Use lowercase letters, numbers and dashes, like size-guide'),
  /** Shown in search results and link previews. */
  description: shortText(160),
  sections: pageSections(MAX_PAGE_SECTIONS),
});

/** The product page's own block: photos, price, options and buy buttons. */
export const productDetailsSchema = z.object({
  /** gallery-left / gallery-right: photos beside the details · stacked: photos above, details centred below */
  layout: z.enum(['gallery-left', 'gallery-right', 'stacked']),
  imageShape: z.enum(['square', 'portrait', 'landscape']),
  thumbnails: z.enum(['below', 'hidden']),
  showCategory: z.boolean(),
  /** beside: under the buy buttons · below: full width under the photos and details */
  description: z.enum(['beside', 'below', 'hidden']),
  /** Keeps the price and buy buttons in view while scrolling past long galleries. */
  stickyDetails: z.boolean(),
});

/** The collection page's own block: its name and products. */
export const collectionProductsSchema = z.object({
  heading: z.enum(['left', 'center', 'banner']),
  showDescription: z.boolean(),
  showCount: z.boolean(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  /** Products per page; more pages get page links. */
  perPage: z.union([z.literal(12), z.literal(24), z.literal(48)]).optional(),
  sort: z.enum(PRODUCT_LIST_SORTS),
  /** Lets shoppers change the order themselves. */
  sortMenu: z.boolean(),
});

/** Sections around the main block of product and collection pages, plus that block's settings. */
const pageTemplate = <T extends z.ZodType>(main: T) =>
  z
    .object({
      above: pageSections(MAX_TEMPLATE_SECTIONS),
      below: pageSections(MAX_TEMPLATE_SECTIONS),
      /** Missing means the defaults. */
      main: main.optional(),
    })
    .superRefine((template, ctx) => {
      const above = new Set(template.above.map((s) => s.id));
      template.below.forEach((section, i) => {
        if (above.has(section.id)) ctx.addIssue({ code: 'custom', path: ['below', i, 'id'], message: 'Duplicate section id' });
      });
    });

export const productTemplateSchema = pageTemplate(productDetailsSchema);
export const collectionTemplateSchema = pageTemplate(collectionProductsSchema);

export const PAGE_TEMPLATE_KEYS = ['product', 'collection'] as const;

/** The home page only — what AI generates. */
export const homeLayoutSchema = z.object({
  settings: themeSettingsSchema,
  sections: z.array(sectionSchema).min(1).max(30),
});

export const storeLayoutSchema = homeLayoutSchema
  .extend({
    pages: z.array(storePageSchema).max(MAX_PAGES).optional(),
    templates: z
      .object({
        product: productTemplateSchema.optional(),
        collection: collectionTemplateSchema.optional(),
        /** Collections with their own layout instead of the shared collection page, by handle. */
        collections: z
          .record(z.string().max(120).regex(PAGE_HANDLE_PATTERN), collectionTemplateSchema)
          .refine((byHandle) => Object.keys(byHandle).length <= MAX_COLLECTION_LAYOUTS, {
            message: `Up to ${MAX_COLLECTION_LAYOUTS} collections can have their own layout`,
          })
          .optional(),
      })
      .optional(),
  })
  .superRefine((layout, ctx) => {
    const pages = layout.pages ?? [];
    const handles = pages.map((p) => p.handle);
    const ids = pages.map((p) => p.id);
    pages.forEach((page, i) => {
      if (handles.indexOf(page.handle) !== i) {
        ctx.addIssue({ code: 'custom', path: ['pages', i, 'handle'], message: 'Another page already uses this address' });
      }
      if (ids.indexOf(page.id) !== i) {
        ctx.addIssue({ code: 'custom', path: ['pages', i, 'id'], message: 'Duplicate page id' });
      }
    });
  });

export type ThemeSettings = z.infer<typeof themeSettingsSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section['type'];
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;
export type StoreLayout = z.infer<typeof storeLayoutSchema>;
export type StorePage = z.infer<typeof storePageSchema>;
export type ProductTemplate = z.infer<typeof productTemplateSchema>;
export type CollectionTemplate = z.infer<typeof collectionTemplateSchema>;
/** The section lists shared by both kinds of template. */
export type PageTemplate = Pick<ProductTemplate, 'above' | 'below'>;
export type ProductDetailsSettings = z.infer<typeof productDetailsSchema>;
export type CollectionProductsSettings = z.infer<typeof collectionProductsSchema>;
export type ProductListSort = (typeof PRODUCT_LIST_SORTS)[number];
export type PageTemplateKey = (typeof PAGE_TEMPLATE_KEYS)[number];
export type FontOption = (typeof FONT_OPTIONS)[number];
export type CustomFont = z.infer<typeof customFontSchema>;
export type FeatureIcon = (typeof FEATURE_ICONS)[number];
export type ProductTable = z.infer<typeof productTableSchema>;
export type ProductTableField = (typeof PRODUCT_TABLE_FIELDS)[number];
export type ProductTableSort = (typeof PRODUCT_TABLE_SORTS)[number];
