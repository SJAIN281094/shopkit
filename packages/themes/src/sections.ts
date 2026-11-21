import type { ProductTable, ProductTableField, ProductTableSort, Section, SectionOf, SectionType } from './schema';

export const PRODUCT_TABLE_FIELD_LABELS: Record<ProductTableField, string> = {
  product: 'Product',
  price: 'Price',
  mrp: 'MRP',
  discount: 'Discount',
  availability: 'Availability',
  collection: 'Category',
  options: 'Options',
};

export const PRODUCT_TABLE_SORT_LABELS: Record<ProductTableSort, string> = {
  newest: 'Newest first',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  name: 'Name (A–Z)',
};

export const DEFAULT_PRODUCT_TABLE: ProductTable = {
  collectionHandle: '',
  limit: 10,
  fields: ['product', 'price', 'mrp', 'availability'],
  sort: 'newest',
  showImages: true,
  hideSoldOut: false,
};

export interface SectionDefinition<T extends SectionType = SectionType> {
  type: T;
  label: string;
  description: string;
  createSettings: () => SectionOf<T>['settings'];
}

type SectionLibrary = { [T in SectionType]: SectionDefinition<T> };

export const DEFAULT_FAQ: { question: string; answer: string }[] = [
  {
    question: 'Do you offer cash on delivery?',
    answer: 'Yes. You can pay by UPI, card, netbanking or cash when your order arrives.',
  },
  {
    question: 'How long does delivery take?',
    answer: 'Most orders arrive in 2–5 working days. You get a tracking link as soon as your order ships.',
  },
  {
    question: 'Can I return or exchange a product?',
    answer: 'Yes, within 7 days of delivery if the product is unused and in its original packaging. Message us to start a return.',
  },
  {
    question: 'How do I track my order?',
    answer: 'Open the link in your order confirmation message, or chat with us on WhatsApp with your order number.',
  },
];

export const SECTION_LIBRARY: SectionLibrary = {
  'announcement-bar': {
    type: 'announcement-bar',
    label: 'Announcement bar',
    description: 'A thin strip at the top for offers or delivery info.',
    createSettings: () => ({ text: 'Free shipping on all orders · COD available' }),
  },
  header: {
    type: 'header',
    label: 'Header',
    description: 'Store name and menu.',
    createSettings: () => ({
      menu: [
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/collections/all' },
      ],
    }),
  },
  hero: {
    type: 'hero',
    label: 'Hero banner',
    description: 'Large heading with an optional background image and button.',
    createSettings: () => ({
      heading: 'Welcome to our store',
      subheading: '',
      buttonLabel: 'Shop now',
      buttonHref: '/collections/all',
      imageUrl: '',
      alignment: 'center',
    }),
  },
  'product-grid': {
    type: 'product-grid',
    label: 'Product grid',
    description: 'Shows products from all products or one collection.',
    createSettings: () => ({ heading: 'Featured products', collectionHandle: '', limit: 8 }),
  },
  features: {
    type: 'features',
    label: 'Features',
    description: 'Short reasons to buy, each with an icon.',
    createSettings: () => ({
      items: [
        { icon: 'truck', title: 'Fast delivery', body: 'Shipped across India within 2–5 days.' },
        { icon: 'wallet', title: 'COD available', body: 'Pay with UPI, card, or cash on delivery.' },
      ],
    }),
  },
  'image-with-text': {
    type: 'image-with-text',
    label: 'Image with text',
    description: 'A picture next to a heading and paragraph.',
    createSettings: () => ({
      heading: 'Our story',
      body: 'Tell customers who you are and what makes your products special.',
      imageUrl: '',
      imagePosition: 'left',
      buttonLabel: '',
      buttonHref: '',
    }),
  },
  testimonials: {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Quotes from happy customers.',
    createSettings: () => ({
      heading: 'What our customers say',
      items: [{ quote: 'Loved the quality, will order again!', author: 'Happy customer', location: '' }],
    }),
  },
  'rich-text': {
    type: 'rich-text',
    label: 'Text block',
    description: 'A heading and paragraph, for policies or announcements.',
    createSettings: () => ({ heading: 'A note from us', body: '' }),
  },
  'whatsapp-cta': {
    type: 'whatsapp-cta',
    label: 'WhatsApp chat',
    description: 'A button that opens a WhatsApp chat with you.',
    createSettings: () => ({
      heading: 'Questions? Chat with us',
      body: 'We usually reply within a few minutes.',
      buttonLabel: 'Chat on WhatsApp',
      phone: '',
    }),
  },
  'parallax-banner': {
    type: 'parallax-banner',
    label: 'Parallax banner',
    description: 'A full-width picture that stays still while the page scrolls over it.',
    createSettings: () => ({
      heading: 'Made with care',
      body: 'Add a photo — it stays in place while visitors scroll for a smooth depth effect.',
      buttonLabel: '',
      buttonHref: '',
      imageUrl: '',
      height: 'medium',
      alignment: 'center',
    }),
  },
  table: {
    type: 'table',
    label: 'Table',
    description: 'Rows and columns — size charts, specs, or a live price list from your products.',
    createSettings: () => ({
      heading: 'Size guide',
      intro: '',
      columns: ['Size', 'Chest (in)', 'Length (in)'],
      rows: [
        ['S', '36', '27'],
        ['M', '38', '28'],
        ['L', '40', '29'],
      ],
      style: 'striped',
      note: '',
    }),
  },
  faq: {
    type: 'faq',
    label: 'FAQ',
    description: 'Questions and answers that open when tapped.',
    createSettings: () => ({ heading: 'Frequently asked questions', items: DEFAULT_FAQ.slice(0, 2) }),
  },
  footer: {
    type: 'footer',
    label: 'Footer',
    description: 'Short about text and links at the bottom.',
    createSettings: () => ({ aboutText: '', links: [] }),
  },
};

export const SECTION_TYPES = Object.keys(SECTION_LIBRARY) as SectionType[];

export function createSection<T extends SectionType>(type: T, existingIds: string[] = []): SectionOf<T> {
  const taken = new Set(existingIds);
  let id: string = type;
  for (let n = 2; taken.has(id); n++) id = `${type}-${n}`;
  const definition = SECTION_LIBRARY[type] as SectionDefinition<T>;
  return { id, type, settings: definition.createSettings() } as unknown as SectionOf<T>;
}

/** The first WhatsApp number set anywhere in the layout, used for "Order on WhatsApp" buttons. */
export function findWhatsappPhone(sections: Section[]): string | null {
  for (const s of sections) {
    if (s.type === 'whatsapp-cta' && s.settings.phone) return s.settings.phone;
  }
  return null;
}
