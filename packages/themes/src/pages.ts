import type {
  CollectionProductsSettings,
  CollectionTemplate,
  PageTemplate,
  ProductDetailsSettings,
  Section,
  StoreLayout,
  StorePage,
} from './schema';
import { DEFAULT_FAQ } from './sections';

export const PAGE_PRESETS = ['blank', 'about', 'contact', 'shipping', 'returns', 'privacy', 'size-guide'] as const;
export type PagePreset = (typeof PAGE_PRESETS)[number];

export const PAGE_PRESET_INFO: Record<PagePreset, { title: string; handle: string; description: string }> = {
  blank: { title: 'New page', handle: 'new-page', description: 'An empty page — add any sections.' },
  about: { title: 'About us', handle: 'about', description: 'Your story, what you stand for and why buy from you.' },
  contact: { title: 'Contact us', handle: 'contact', description: 'WhatsApp button, hours and common questions.' },
  shipping: { title: 'Shipping policy', handle: 'shipping', description: 'Delivery times and charges.' },
  returns: { title: 'Returns & refunds', handle: 'returns', description: 'How returns, exchanges and refunds work.' },
  privacy: { title: 'Privacy policy', handle: 'privacy', description: 'What customer data you collect and why.' },
  'size-guide': { title: 'Size guide', handle: 'size-guide', description: 'A size chart and how to measure.' },
};

export interface PageContext {
  storeName: string;
  aboutHeading?: string;
  aboutBody?: string;
}

const text = (id: string, heading: string, body: string): Section => ({ id, type: 'rich-text', settings: { heading, body } });
const whatsapp = (heading = 'Questions? Chat with us'): Section => ({
  id: 'contact',
  type: 'whatsapp-cta',
  settings: { heading, body: 'We usually reply within a few minutes.', buttonLabel: 'Chat on WhatsApp', phone: '' },
});

function presetSections(preset: PagePreset, ctx: PageContext): Section[] {
  switch (preset) {
    case 'blank':
      return [text('intro', 'New page', 'Add sections from the list below to build this page.')];
    case 'about':
      return [
        { id: 'hero', type: 'hero', settings: { heading: ctx.aboutHeading ?? `About ${ctx.storeName}`, subheading: '', buttonLabel: '', buttonHref: '', imageUrl: '', alignment: 'center', variant: 'minimal', height: 'medium' } },
        {
          id: 'story',
          type: 'image-with-text',
          settings: {
            heading: 'Our story',
            body: ctx.aboutBody ?? 'Tell customers how you started, who makes your products and what makes them special.',
            imageUrl: '',
            imagePosition: 'left',
            buttonLabel: 'Shop the collection',
            buttonHref: '/collections/all',
          },
        },
        {
          id: 'values',
          type: 'features',
          settings: {
            variant: 'cards',
            items: [
              { icon: 'heart', title: 'Made with care', body: 'Every product is checked by hand before it ships.' },
              { icon: 'shield', title: 'Honest prices', body: 'Fair prices, no hidden charges at checkout.' },
              { icon: 'phone', title: 'Real people', body: 'Talk to us on WhatsApp — we reply fast.' },
            ],
          },
        },
        whatsapp('Say hello'),
      ];
    case 'contact':
      return [
        text('details', 'Get in touch', 'The fastest way to reach us is WhatsApp. We reply between 10 am and 7 pm, Monday to Saturday.\n\nFor order questions, keep your order number handy.'),
        whatsapp('Chat with us on WhatsApp'),
        { id: 'faq', type: 'faq', settings: { heading: 'Common questions', items: DEFAULT_FAQ } },
      ];
    case 'shipping':
      return [
        text('overview', 'Shipping policy', `${ctx.storeName} ships across India. Orders are packed and dispatched within 1–2 working days, and you get a tracking link as soon as your order ships.`),
        {
          id: 'rates',
          type: 'table',
          settings: {
            heading: 'Delivery times and charges',
            intro: '',
            columns: ['Where', 'Delivery time', 'Charge'],
            rows: [
              ['Metro cities', '2–3 days', 'Free above ₹999, else ₹49'],
              ['Rest of India', '4–6 days', '₹49'],
              ['Remote areas & North-East', '6–9 days', '₹79'],
            ],
            style: 'striped',
            note: 'Delivery times are estimates and can be longer during sales and festivals.',
          },
        },
        text('cod', 'Cash on delivery', 'Cash on delivery is available on most pin codes. Please keep the exact amount ready.'),
      ];
    case 'returns':
      return [
        text('overview', 'Returns & refunds', 'Not happy with your order? You can return or exchange it within 7 days of delivery, as long as it is unused, unwashed and in its original packaging with tags.'),
        text('how', 'How to start a return', '1. Message us on WhatsApp with your order number and a photo of the product.\n2. We arrange a pickup or share the return address.\n3. Once we receive and check the product, we process your exchange or refund.'),
        text('refunds', 'Refunds', 'Refunds go back to your original payment method within 5–7 working days of us receiving the product. Cash on delivery orders are refunded by UPI or bank transfer.'),
        whatsapp('Start a return on WhatsApp'),
      ];
    case 'privacy':
      return [
        text('overview', 'Privacy policy', `This policy explains what information ${ctx.storeName} collects when you shop with us and how we use it.`),
        text('collect', 'What we collect', 'Your name, phone number, email and delivery address when you place an order, and basic information about how you use our site.'),
        text('use', 'How we use it', 'To deliver your orders, send order updates, answer your questions and improve our store. We never sell your information.'),
        text('share', 'Who we share it with', 'Only the payment and delivery partners needed to complete your order.'),
        text('contact-us', 'Questions', 'Message us any time to see, correct or delete the information we hold about you.'),
      ];
    case 'size-guide':
      return [
        {
          id: 'chart',
          type: 'table',
          settings: {
            heading: 'Size guide',
            intro: 'Body measurements in inches. Between sizes? Pick the larger one.',
            columns: ['Size', 'Chest', 'Waist', 'Hip'],
            rows: [
              ['XS', '32', '26', '35'],
              ['S', '34', '28', '37'],
              ['M', '36', '30', '39'],
              ['L', '38', '32', '41'],
              ['XL', '40', '34', '43'],
            ],
            style: 'bordered',
            note: '',
          },
        },
        text('measure', 'How to measure', 'Chest: around the fullest part.\nWaist: around your natural waistline.\nHip: around the widest part of your hips.'),
      ];
  }
}

/** A new page from a preset, with an id and address that don't clash with existing pages. */
export function createPage(preset: PagePreset, existing: StorePage[], ctx: PageContext, title?: string): StorePage {
  const info = PAGE_PRESET_INFO[preset];
  const pageTitle = (title?.trim() || info.title).slice(0, 60);
  const base = preset === 'blank' ? pageHandleFrom(pageTitle) || info.handle : info.handle;
  const handles = new Set(existing.map((p) => p.handle));
  const ids = new Set(existing.map((p) => p.id));
  let handle = base;
  for (let n = 2; handles.has(handle); n++) handle = `${base}-${n}`;
  let id = `page-${handle}`;
  for (let n = 2; ids.has(id); n++) id = `page-${handle}-${n}`;
  const sections = presetSections(preset, ctx);
  if (preset === 'blank' && title) sections[0] = text('intro', pageTitle, 'Add sections from the list below to build this page.');
  return { id, title: pageTitle, handle, description: preset === 'blank' ? '' : info.description, sections };
}

/** "Size Guide & Fit!" -> "size-guide-fit" */
export function pageHandleFrom(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

export const EMPTY_PAGE_TEMPLATE: PageTemplate = { above: [], below: [] };

export const DEFAULT_PRODUCT_DETAILS: ProductDetailsSettings = {
  layout: 'gallery-left',
  imageShape: 'square',
  thumbnails: 'below',
  showCategory: true,
  description: 'beside',
  stickyDetails: false,
};

export const DEFAULT_COLLECTION_PRODUCTS: CollectionProductsSettings = {
  heading: 'left',
  showDescription: true,
  showCount: true,
  columns: 4,
  perPage: 24,
  sort: 'newest',
  sortMenu: true,
};

export const DEFAULT_PER_PAGE = 24;

export function productDetailsOf(layout: StoreLayout): ProductDetailsSettings {
  return layout.templates?.product?.main ?? DEFAULT_PRODUCT_DETAILS;
}

/** A collection's own layout if it has one, otherwise the shared collection page. */
export function collectionTemplateOf(layout: StoreLayout, handle?: string): CollectionTemplate | undefined {
  return (handle ? layout.templates?.collections?.[handle] : undefined) ?? layout.templates?.collection;
}

export function collectionProductsOf(layout: StoreLayout, handle?: string): CollectionProductsSettings {
  return collectionTemplateOf(layout, handle)?.main ?? DEFAULT_COLLECTION_PRODUCTS;
}

/** Gives a collection its own layout, starting as a copy of the shared collection page. */
export function customiseCollection(layout: StoreLayout, handle: string): StoreLayout {
  const shared = layout.templates?.collection;
  const copy: CollectionTemplate = structuredClone({
    above: shared?.above ?? [],
    below: shared?.below ?? [],
    main: shared?.main ?? DEFAULT_COLLECTION_PRODUCTS,
  });
  return { ...layout, templates: { ...layout.templates, collections: { ...layout.templates?.collections, [handle]: copy } } };
}

/** Puts a collection back on the shared collection page. */
export function uncustomiseCollection(layout: StoreLayout, handle: string): StoreLayout {
  const { [handle]: _removed, ...rest } = layout.templates?.collections ?? {};
  return { ...layout, templates: { ...layout.templates, collections: rest } };
}
