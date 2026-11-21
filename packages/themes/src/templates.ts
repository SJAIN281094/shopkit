import { createPage, type PagePreset } from './pages';
import type { FeatureIcon, Section, StoreLayout, StorePage, ThemeSettings } from './schema';
import { DEFAULT_FAQ } from './sections';

export interface TemplateTable {
  heading: string;
  intro?: string;
  columns: string[];
  rows: string[][];
  note?: string;
}

export interface TemplateContent {
  announcement: string;
  heroHeading: string;
  heroSubheading: string;
  heroButton: string;
  gridHeading: string;
  features: { icon: FeatureIcon; title: string; body: string }[];
  aboutHeading: string;
  aboutBody: string;
  testimonials: { quote: string; author: string; location: string }[];
  whatsappHeading: string;
  whatsappBody: string;
  /** Used by layouts with a table; a delivery-charges table is used when missing. */
  table?: TemplateTable;
  /** Used by layouts with an FAQ; common shipping and payment questions are used when missing. */
  faq?: { question: string; answer: string }[];
  /** The mid-page parallax banner in the parallax layout. */
  banner?: { heading: string; body: string };
}

export type LayoutKey = 'classic' | 'editorial' | 'parallax' | 'catalog' | 'playful' | 'minimal';

export interface LayoutInfo {
  key: LayoutKey;
  name: string;
  description: string;
  style: NonNullable<ThemeSettings['style']>;
}

export const TEMPLATE_LAYOUTS: Record<LayoutKey, LayoutInfo> = {
  classic: {
    key: 'classic',
    name: 'Classic',
    description: 'Banner, features, products, story and reviews.',
    style: { buttons: 'pill', cards: 'plain' },
  },
  editorial: {
    key: 'editorial',
    name: 'Editorial',
    description: 'Centred header, split hero with a photo, large spotlight reviews.',
    style: { buttons: 'square', cards: 'plain' },
  },
  parallax: {
    key: 'parallax',
    name: 'Parallax',
    description: 'Full-screen photos that stay still while the page scrolls over them.',
    style: { buttons: 'pill', cards: 'shadow' },
  },
  catalog: {
    key: 'catalog',
    name: 'Catalogue',
    description: 'Products first, a sticky coloured header, comparison table and FAQ.',
    style: { buttons: 'rounded', cards: 'bordered' },
  },
  playful: {
    key: 'playful',
    name: 'Playful',
    description: 'Split hero, feature cards, a handy table and review cards.',
    style: { buttons: 'pill', cards: 'shadow' },
  },
  minimal: {
    key: 'minimal',
    name: 'Minimal',
    description: 'Lots of white space, big product photos, no clutter.',
    style: { buttons: 'square', cards: 'plain' },
  },
};

export interface ThemeTemplate {
  key: string;
  name: string;
  description: string;
  /** Lowercase words used to match a seller's description to this template. */
  keywords: string[];
  layout: LayoutKey;
  settings: Omit<ThemeSettings, 'logoText'>;
  content: TemplateContent;
}

const commonFeatures: TemplateContent['features'] = [
  { icon: 'truck', title: 'Fast delivery', body: 'Shipped across India within 2–5 days.' },
  { icon: 'wallet', title: 'COD available', body: 'Pay with UPI, card, or cash on delivery.' },
  { icon: 'refresh', title: 'Easy returns', body: 'Hassle-free returns within 7 days.' },
];

export const THEME_TEMPLATES: ThemeTemplate[] = [
  {
    key: 'fashion',
    layout: 'editorial',
    name: 'Fashion boutique',
    description: 'Elegant layout for clothing, ethnic wear and accessories.',
    keywords: ['fashion', 'clothing', 'clothes', 'kurta', 'kurti', 'saree', 'sari', 'lehenga', 'dress', 'apparel', 'boutique', 'ethnic', 'shirt', 'tshirt', 't-shirt', 'wear'],
    settings: {
      colors: { primary: '#7c2d4a', accent: '#d4a373', background: '#fffaf6', text: '#2b1d22' },
      fonts: { heading: 'Playfair Display', body: 'Inter' },
    },
    content: {
      announcement: 'Free shipping on orders above ₹999 · COD available',
      heroHeading: 'New season, new you',
      heroSubheading: 'Handpicked styles for every occasion — from everyday comfort to festive glam.',
      heroButton: 'Shop the collection',
      gridHeading: 'New arrivals',
      features: commonFeatures,
      aboutHeading: 'Made for the way you dress',
      aboutBody: 'We design pieces that feel as good as they look. Every fabric is chosen for comfort, and every fit is tested by real customers.',
      testimonials: [
        { quote: 'The fabric quality is amazing and the fit is perfect. Ordering again for Diwali!', author: 'Priya S.', location: 'Pune' },
        { quote: 'Fast delivery and the colours are exactly like the photos.', author: 'Ananya R.', location: 'Bengaluru' },
      ],
      whatsappHeading: 'Need help with sizing?',
      whatsappBody: 'Chat with us on WhatsApp and we will help you pick the right fit.',
      table: {
        heading: 'Size guide',
        intro: 'Measurements are of the garment, in inches. Between sizes? Pick the larger one for a relaxed fit.',
        columns: ['Size', 'Bust', 'Waist', 'Hip', 'Length'],
        rows: [
          ['XS', '32', '26', '35', '44'],
          ['S', '34', '28', '37', '44'],
          ['M', '36', '30', '39', '45'],
          ['L', '38', '32', '41', '45'],
          ['XL', '40', '34', '43', '46'],
          ['XXL', '42', '36', '45', '46'],
        ],
        note: 'Still unsure? Message us your measurements on WhatsApp.',
      },
    },
  },
  {
    key: 'jewelry',
    layout: 'parallax',
    name: 'Jewellery',
    description: 'Premium look for gold, silver and fashion jewellery.',
    keywords: ['jewelry', 'jewellery', 'gold', 'silver', 'diamond', 'earring', 'earrings', 'necklace', 'ring', 'rings', 'bangle', 'bangles', 'kundan', 'oxidised', 'oxidized'],
    settings: {
      colors: { primary: '#1f2a44', accent: '#c9a227', background: '#fbf8f1', text: '#1c1c1c' },
      fonts: { heading: 'DM Serif Display', body: 'Lora' },
    },
    content: {
      announcement: 'Certified quality · Free insured shipping',
      heroHeading: 'Timeless pieces, crafted to shine',
      heroSubheading: 'Jewellery for weddings, gifting and every day in between.',
      heroButton: 'Explore jewellery',
      gridHeading: 'Bestsellers',
      features: [
        { icon: 'shield', title: 'Certified quality', body: 'Every piece is quality-checked before dispatch.' },
        { icon: 'truck', title: 'Insured shipping', body: 'Safe, tracked delivery to your doorstep.' },
        { icon: 'gift', title: 'Gift-ready packaging', body: 'Beautiful boxes, ready to gift.' },
      ],
      aboutHeading: 'Crafted with care',
      aboutBody: 'Our artisans combine traditional techniques with modern design to create jewellery you will treasure for years.',
      testimonials: [
        { quote: 'Bought earrings for my sister’s wedding — everyone asked where they were from!', author: 'Meera K.', location: 'Jaipur' },
        { quote: 'Beautiful finish and lovely packaging. Perfect gift.', author: 'Rohit P.', location: 'Delhi' },
      ],
      whatsappHeading: 'Looking for something custom?',
      whatsappBody: 'Message us on WhatsApp for custom designs and bulk orders.',
      banner: {
        heading: 'Every piece tells a story',
        body: 'Hand-finished by artisans with decades of experience, made to be worn and passed on.',
      },
      faq: [
        { question: 'Is your jewellery certified?', answer: 'Yes. Gold and silver pieces come with purity certification, and every piece is quality-checked before dispatch.' },
        { question: 'Is shipping insured?', answer: 'Every order is shipped fully insured with tracking, at no extra cost.' },
        { question: 'Can I get a custom design?', answer: 'Yes. Message us on WhatsApp with a photo or idea and we will share options and pricing.' },
        { question: 'Do you offer cash on delivery?', answer: 'Yes, for orders up to ₹25,000. Larger orders can be paid by UPI, card or netbanking.' },
      ],
    },
  },
  {
    key: 'food',
    layout: 'playful',
    name: 'Food & sweets',
    description: 'Warm, appetising layout for snacks, sweets, spices and home kitchens.',
    keywords: ['food', 'sweets', 'sweet', 'mithai', 'snacks', 'namkeen', 'spices', 'masala', 'pickle', 'achar', 'bakery', 'cake', 'cakes', 'chocolate', 'tea', 'coffee', 'homemade', 'kitchen', 'organic'],
    settings: {
      colors: { primary: '#b4451f', accent: '#f2a541', background: '#fffbf2', text: '#2f2118' },
      fonts: { heading: 'Poppins', body: 'Nunito' },
    },
    content: {
      announcement: 'Freshly made · Delivered across India',
      heroHeading: 'Homemade taste, delivered fresh',
      heroSubheading: 'Small-batch recipes made with real ingredients and no shortcuts.',
      heroButton: 'Order now',
      gridHeading: 'Customer favourites',
      features: [
        { icon: 'leaf', title: 'Real ingredients', body: 'No preservatives, no artificial colours.' },
        { icon: 'truck', title: 'Packed fresh', body: 'Made to order and shipped quickly.' },
        { icon: 'wallet', title: 'COD available', body: 'Pay with UPI, card, or cash on delivery.' },
      ],
      aboutHeading: 'From our kitchen to yours',
      aboutBody: 'Every recipe started at home. We still make everything in small batches, the same way our family always has.',
      testimonials: [
        { quote: 'Tastes exactly like home. My kids finished the box in a day!', author: 'Sunita M.', location: 'Mumbai' },
        { quote: 'Fresh, well packed and delicious. Ordering for the whole office next time.', author: 'Arjun T.', location: 'Hyderabad' },
      ],
      whatsappHeading: 'Bulk or festive orders?',
      whatsappBody: 'Message us on WhatsApp for gifting boxes and party orders.',
      table: {
        heading: 'Pack sizes',
        columns: ['Pack', 'Weight', 'Serves', 'Best before'],
        rows: [
          ['Taster box', '250 g', '2–3', '30 days'],
          ['Family pack', '500 g', '4–6', '30 days'],
          ['Festive box', '1 kg', '8–10', '30 days'],
          ['Party tray', '2 kg', '15–20', '21 days'],
        ],
        note: 'Store in a cool, dry place. Bulk orders available on request.',
      },
    },
  },
  {
    key: 'electronics',
    layout: 'catalog',
    name: 'Electronics & gadgets',
    description: 'Clean, modern layout for gadgets, accessories and electronics.',
    keywords: ['electronics', 'gadget', 'gadgets', 'mobile', 'phone', 'phones', 'accessories', 'charger', 'cable', 'earphones', 'headphones', 'speaker', 'smartwatch', 'laptop', 'computer', 'tech'],
    settings: {
      colors: { primary: '#2563eb', accent: '#14b8a6', background: '#f8fafc', text: '#0f172a' },
      fonts: { heading: 'Montserrat', body: 'Inter' },
    },
    content: {
      announcement: '1-year warranty on all products · COD available',
      heroHeading: 'Smart tech for everyday life',
      heroSubheading: 'Reliable gadgets and accessories at honest prices.',
      heroButton: 'Shop gadgets',
      gridHeading: 'Top picks',
      features: [
        { icon: 'shield', title: 'Warranty included', body: 'Every product is covered by warranty.' },
        { icon: 'truck', title: 'Fast shipping', body: 'Dispatched within 24 hours.' },
        { icon: 'phone', title: 'Real support', body: 'Talk to a human on WhatsApp.' },
      ],
      aboutHeading: 'Tested before it reaches you',
      aboutBody: 'We test every product we sell, so you only get gadgets that work well and last.',
      testimonials: [
        { quote: 'Great build quality and the delivery was super quick.', author: 'Karan V.', location: 'Ahmedabad' },
        { quote: 'Support helped me set it up over WhatsApp in minutes.', author: 'Neha J.', location: 'Chennai' },
      ],
      whatsappHeading: 'Not sure which one to buy?',
      whatsappBody: 'Message us on WhatsApp and we will recommend the right product.',
      table: {
        heading: 'Compare bestsellers',
        intro: 'A quick look at our most popular products side by side.',
        columns: ['Product', 'Battery', 'Charging', 'Water resistance', 'Warranty'],
        rows: [
          ['Wireless earbuds', 'Up to 30 hrs', 'USB-C, fast charge', 'IPX5', '1 year'],
          ['Neckband', 'Up to 40 hrs', 'USB-C', 'IPX4', '1 year'],
          ['Smartwatch', 'Up to 7 days', 'Magnetic', 'IP68', '1 year'],
          ['Power bank 20000 mAh', '—', '22.5 W fast charge', '—', '6 months'],
        ],
        note: 'Warranty covers manufacturing defects. Keep your invoice for claims.',
      },
    },
  },
  {
    key: 'handmade',
    layout: 'minimal',
    name: 'Handmade & crafts',
    description: 'Earthy layout for handmade goods, home decor and artisan products.',
    keywords: ['handmade', 'handcrafted', 'craft', 'crafts', 'artisan', 'pottery', 'decor', 'home decor', 'candle', 'candles', 'macrame', 'painting', 'art', 'handloom', 'block print', 'wooden', 'eco'],
    settings: {
      colors: { primary: '#6b4f2a', accent: '#7a9e7e', background: '#faf7f2', text: '#2d2a26' },
      fonts: { heading: 'Lora', body: 'Nunito' },
    },
    content: {
      announcement: 'Handmade in India · Every piece is unique',
      heroHeading: 'Made by hand, made with love',
      heroSubheading: 'Thoughtfully crafted pieces that bring warmth to your home.',
      heroButton: 'Discover the collection',
      gridHeading: 'Fresh from the studio',
      features: [
        { icon: 'heart', title: 'Handmade', body: 'Crafted by skilled artisans.' },
        { icon: 'leaf', title: 'Sustainable', body: 'Natural materials, mindful packaging.' },
        { icon: 'gift', title: 'Perfect for gifting', body: 'Gift wrapping on request.' },
      ],
      aboutHeading: 'The hands behind every piece',
      aboutBody: 'We work directly with artisans, so every purchase supports traditional craft and fair pay.',
      testimonials: [
        { quote: 'Even more beautiful in person. You can feel the care that went into it.', author: 'Ishita B.', location: 'Kolkata' },
        { quote: 'Lovely packaging and a handwritten note — such a nice touch.', author: 'Vikram S.', location: 'Goa' },
      ],
      whatsappHeading: 'Want something made just for you?',
      whatsappBody: 'Message us on WhatsApp for custom orders and personalised gifts.',
    },
  },
  {
    key: 'beauty',
    layout: 'parallax',
    name: 'Beauty & skincare',
    description: 'Soft, fresh layout for skincare, cosmetics, haircare and ayurvedic products.',
    keywords: ['beauty', 'skincare', 'skin', 'cosmetics', 'makeup', 'lipstick', 'serum', 'cream', 'facewash', 'soap', 'soaps', 'shampoo', 'haircare', 'hair', 'ayurvedic', 'ayurveda', 'herbal', 'perfume', 'fragrance', 'nail'],
    settings: {
      colors: { primary: '#b5547a', accent: '#e8b4a0', background: '#fff7f8', text: '#3a2630' },
      fonts: { heading: 'DM Serif Display', body: 'Nunito' },
    },
    content: {
      announcement: 'Dermatologically tested · Cruelty-free · COD available',
      heroHeading: 'Glow naturally, every day',
      heroSubheading: 'Gentle skincare and beauty made with ingredients your skin will love.',
      heroButton: 'Shop beauty',
      gridHeading: 'Bestselling essentials',
      features: [
        { icon: 'leaf', title: 'Clean ingredients', body: 'No parabens, sulphates or harsh chemicals.' },
        { icon: 'heart', title: 'Cruelty-free', body: 'Never tested on animals.' },
        { icon: 'truck', title: 'Fast delivery', body: 'Shipped across India within 2–5 days.' },
      ],
      aboutHeading: 'Skincare that keeps it simple',
      aboutBody: 'We make small-batch beauty products with ingredients you can pronounce, tested for Indian skin and weather.',
      testimonials: [
        { quote: 'My skin has never felt this soft. The face serum is a must-have!', author: 'Kavya R.', location: 'Bengaluru' },
        { quote: 'Lovely fragrance, gentle on sensitive skin and beautifully packed.', author: 'Simran K.', location: 'Chandigarh' },
      ],
      whatsappHeading: 'Not sure what suits your skin?',
      whatsappBody: 'Tell us your skin type on WhatsApp and we will build a routine for you.',
      banner: {
        heading: 'Rooted in nature, backed by science',
        body: 'Ayurvedic ingredients, modern formulas and nothing your skin doesn’t need.',
      },
      faq: [
        { question: 'Are your products suitable for sensitive skin?', answer: 'Most of our range is fragrance-free and dermatologically tested. Check each product page, or ask us on WhatsApp.' },
        { question: 'Are you cruelty-free?', answer: 'Yes. We never test on animals and our ingredients are not tested on animals either.' },
        { question: 'How long do products last once opened?', answer: 'Most products are best used within 6–12 months of opening. The exact period is printed on each pack.' },
        { question: 'Do you offer cash on delivery?', answer: 'Yes. You can pay by UPI, card, netbanking or cash when your order arrives.' },
      ],
    },
  },
  {
    key: 'kids',
    layout: 'playful',
    name: 'Kids & toys',
    description: 'Bright, playful layout for toys, baby products and kidswear.',
    keywords: ['kids', 'kid', 'baby', 'babies', 'toys', 'children', 'child', 'kidswear', 'newborn', 'infant', 'diaper', 'diapers', 'school', 'games', 'puzzle', 'puzzles', 'educational'],
    settings: {
      colors: { primary: '#2f6fde', accent: '#ffb703', background: '#fffdf5', text: '#1d2939' },
      fonts: { heading: 'Poppins', body: 'Nunito' },
    },
    content: {
      announcement: 'Child-safe materials · Free shipping above ₹799',
      heroHeading: 'Little joys for little ones',
      heroSubheading: 'Safe, fun and thoughtfully designed toys and essentials for every age.',
      heroButton: 'Shop for kids',
      gridHeading: 'Most loved by kids',
      features: [
        { icon: 'shield', title: 'Child-safe', body: 'Non-toxic materials, tested for safety.' },
        { icon: 'star', title: 'Learn through play', body: 'Toys that build skills and imagination.' },
        { icon: 'gift', title: 'Gift wrapping', body: 'Perfect for birthdays and baby showers.' },
      ],
      aboutHeading: 'Made by parents, for parents',
      aboutBody: 'We are parents too, so we only sell what we would happily give our own children — safe, durable and genuinely fun.',
      testimonials: [
        { quote: 'My daughter plays with it every single day. Great quality!', author: 'Nidhi A.', location: 'Noida' },
        { quote: 'Ordered a birthday gift and it arrived beautifully wrapped. Thank you!', author: 'Sameer H.', location: 'Bhopal' },
      ],
      whatsappHeading: 'Need help picking a gift?',
      whatsappBody: 'Tell us the child’s age on WhatsApp and we will suggest something they will love.',
      table: {
        heading: 'Age guide',
        columns: ['Age', 'Good for', 'Try these'],
        rows: [
          ['0–12 months', 'Senses and grip', 'Rattles, soft toys, teethers'],
          ['1–3 years', 'Movement and words', 'Push toys, blocks, picture books'],
          ['3–5 years', 'Imagination', 'Pretend play, puzzles, art kits'],
          ['5–8 years', 'Problem solving', 'Board games, STEM kits, craft sets'],
          ['8+ years', 'Skills and focus', 'Science kits, strategy games, models'],
        ],
        note: 'Toys with small parts are not suitable for children under 3.',
      },
    },
  },
  {
    key: 'home',
    layout: 'catalog',
    name: 'Home & kitchen',
    description: 'Calm, modern layout for kitchenware, furnishings and home essentials.',
    keywords: ['home', 'kitchenware', 'cookware', 'utensils', 'bedsheet', 'bedsheets', 'curtain', 'curtains', 'cushion', 'cushions', 'furniture', 'furnishing', 'furnishings', 'storage', 'bathroom', 'towel', 'towels', 'dinnerware', 'cutlery', 'appliances'],
    settings: {
      colors: { primary: '#3f5f4a', accent: '#c58b4e', background: '#f7f5f0', text: '#22281f' },
      fonts: { heading: 'Montserrat', body: 'Inter' },
    },
    content: {
      announcement: 'Easy 7-day returns · COD available across India',
      heroHeading: 'Make your home a little better',
      heroSubheading: 'Well-made essentials for the kitchen, bedroom and every corner in between.',
      heroButton: 'Shop home',
      gridHeading: 'Home favourites',
      features: [
        { icon: 'shield', title: 'Built to last', body: 'Quality materials for daily use.' },
        { icon: 'refresh', title: 'Easy returns', body: 'Hassle-free returns within 7 days.' },
        { icon: 'truck', title: 'Safe packaging', body: 'Packed carefully so nothing breaks.' },
      ],
      aboutHeading: 'Everyday things, done right',
      aboutBody: 'We pick practical, good-looking products for Indian homes and test them in our own kitchens first.',
      testimonials: [
        { quote: 'The cookware set is sturdy and looks great on my shelf.', author: 'Lakshmi V.', location: 'Coimbatore' },
        { quote: 'Soft bedsheets, true colours and super quick delivery.', author: 'Aditya G.', location: 'Nagpur' },
      ],
      whatsappHeading: 'Setting up a new home?',
      whatsappBody: 'Message us on WhatsApp for bundle deals and bulk orders.',
      table: {
        heading: 'Bedsheet size guide',
        columns: ['Size', 'Bedsheet', 'Fits mattress', 'Pillow covers'],
        rows: [
          ['Single', '60 × 90 in', 'Up to 36 × 75 in', '1'],
          ['Double', '90 × 100 in', 'Up to 60 × 75 in', '2'],
          ['Queen', '90 × 108 in', 'Up to 60 × 78 in', '2'],
          ['King', '108 × 108 in', 'Up to 72 × 78 in', '2'],
        ],
        note: 'Fitted sheets suit mattresses up to 8 inches deep.',
      },
    },
  },
  {
    key: 'books',
    layout: 'editorial',
    name: 'Books & stationery',
    description: 'Classic, readable layout for bookstores, stationery and art supplies.',
    keywords: ['books', 'book', 'bookstore', 'novels', 'novel', 'stationery', 'notebook', 'notebooks', 'journal', 'journals', 'pens', 'pen', 'diary', 'planner', 'planners', 'comics', 'reading', 'study', 'exam'],
    settings: {
      colors: { primary: '#7a3b2e', accent: '#2f6f73', background: '#fbf8f3', text: '#2a2421' },
      fonts: { heading: 'Lora', body: 'Lora' },
    },
    content: {
      announcement: 'Free bookmark with every order · COD available',
      heroHeading: 'Find your next favourite read',
      heroSubheading: 'Handpicked books, journals and stationery for readers, writers and students.',
      heroButton: 'Browse the shelves',
      gridHeading: 'Staff picks',
      features: [
        { icon: 'star', title: 'Handpicked titles', body: 'Every book is chosen by a reader.' },
        { icon: 'truck', title: 'Packed with care', body: 'No bent corners, ever.' },
        { icon: 'gift', title: 'Gift notes', body: 'Add a personal note for free.' },
      ],
      aboutHeading: 'A little bookshop, online',
      aboutBody: 'We started as a corner bookshop. Today we ship our favourite reads and stationery to book lovers across India.',
      testimonials: [
        { quote: 'Arrived in perfect condition with a cute bookmark. Ordering again!', author: 'Tanvi M.', location: 'Pune' },
        { quote: 'Great collection of journals — the paper quality is excellent.', author: 'Harsh B.', location: 'Surat' },
      ],
      whatsappHeading: 'Looking for a particular book?',
      whatsappBody: 'Message us on WhatsApp and we will try to find it for you.',
      table: {
        heading: 'Membership plans',
        columns: ['Plan', 'Price', 'Discount', 'Extras'],
        rows: [
          ['Reader', 'Free', '—', 'Monthly reading list'],
          ['Bookworm', '₹499 / year', '10% on every order', 'Free shipping above ₹399'],
          ['Collector', '₹999 / year', '15% on every order', 'Early access to signed copies'],
        ],
        note: 'Message us on WhatsApp to join.',
      },
    },
  },
  {
    key: 'fitness',
    layout: 'parallax',
    name: 'Sports & fitness',
    description: 'Bold, energetic layout for gym gear, sportswear and supplements.',
    keywords: ['fitness', 'gym', 'sports', 'sport', 'sportswear', 'activewear', 'yoga', 'workout', 'protein', 'supplements', 'supplement', 'cricket', 'football', 'badminton', 'running', 'cycling', 'dumbbell', 'dumbbells'],
    settings: {
      colors: { primary: '#e63946', accent: '#1d3557', background: '#f8f9fa', text: '#111827' },
      fonts: { heading: 'Montserrat', body: 'Inter' },
    },
    content: {
      announcement: 'Genuine products only · Dispatched in 24 hours',
      heroHeading: 'Train harder. Play better.',
      heroSubheading: 'Performance gear and essentials for the gym, the ground and everything in between.',
      heroButton: 'Shop gear',
      gridHeading: 'Top performers',
      features: [
        { icon: 'shield', title: '100% genuine', body: 'Sourced directly from brands.' },
        { icon: 'truck', title: 'Quick dispatch', body: 'Shipped within 24 hours.' },
        { icon: 'refresh', title: 'Size exchange', body: 'Free exchange if it doesn’t fit.' },
      ],
      aboutHeading: 'Built by athletes',
      aboutBody: 'We are runners, lifters and weekend cricketers who sell only the gear we trust for our own training.',
      testimonials: [
        { quote: 'Comfortable, breathable and holds up to daily workouts.', author: 'Rohan S.', location: 'Gurugram' },
        { quote: 'Fast delivery and genuine product. My go-to store now.', author: 'Aisha F.', location: 'Kochi' },
      ],
      whatsappHeading: 'Need help choosing gear?',
      whatsappBody: 'Tell us your sport and goals on WhatsApp — we will recommend the right fit.',
      banner: {
        heading: 'No shortcuts. Just progress.',
        body: 'Gear tested by athletes who train every day — built to keep up with you.',
      },
    },
  },
  {
    key: 'plants',
    layout: 'parallax',
    name: 'Plants & gardening',
    description: 'Fresh, green layout for plant nurseries, seeds, pots and garden supplies.',
    keywords: ['plants', 'plant', 'nursery', 'garden', 'gardening', 'seeds', 'seed', 'pots', 'planters', 'planter', 'succulents', 'succulent', 'bonsai', 'indoor', 'soil', 'fertilizer', 'compost', 'flowers', 'flower'],
    settings: {
      colors: { primary: '#2d6a4f', accent: '#95d5b2', background: '#f6fbf7', text: '#1b2e24' },
      fonts: { heading: 'Lora', body: 'Mukta' },
    },
    content: {
      announcement: 'Healthy plants, safely delivered · Free care guide with every order',
      heroHeading: 'Bring a little green home',
      heroSubheading: 'Healthy plants, beautiful pots and everything you need to help them thrive.',
      heroButton: 'Shop plants',
      gridHeading: 'Easy-care favourites',
      features: [
        { icon: 'leaf', title: 'Healthy plants', body: 'Grown in our own nursery.' },
        { icon: 'truck', title: 'Safe delivery', body: 'Packed to arrive fresh and upright.' },
        { icon: 'phone', title: 'Plant care help', body: 'Ask our gardeners anytime.' },
      ],
      aboutHeading: 'From our nursery to your balcony',
      aboutBody: 'We grow most of our plants ourselves and share simple care tips, so even first-time plant parents succeed.',
      testimonials: [
        { quote: 'The plants arrived fresh and healthy. My balcony looks amazing now!', author: 'Divya P.', location: 'Mumbai' },
        { quote: 'Loved the care guide — my first money plant is thriving.', author: 'Manish K.', location: 'Jaipur' },
      ],
      whatsappHeading: 'Plant looking unhappy?',
      whatsappBody: 'Send us a photo on WhatsApp and our gardeners will help.',
      banner: {
        heading: 'Grown with patience',
        body: 'Every plant spends months in our nursery so it arrives strong, healthy and ready for its new home.',
      },
      faq: [
        { question: 'Will my plant survive delivery?', answer: 'We pack every plant upright with moisture-locked soil. If it arrives damaged, send us a photo within 48 hours for a free replacement.' },
        { question: 'Which plants are good for beginners?', answer: 'Money plant, snake plant, ZZ plant and pothos are hardy and forgiving. Look for “Easy care” on product pages.' },
        { question: 'How often should I water?', answer: 'Every plant comes with a care card. Most indoor plants like water when the top inch of soil feels dry.' },
        { question: 'Do you deliver pots and soil too?', answer: 'Yes — pots, planters, potting mix and fertiliser are all available, and can ship with your plants.' },
      ],
    },
  },
  {
    key: 'pets',
    layout: 'playful',
    name: 'Pet supplies',
    description: 'Friendly layout for pet food, accessories and grooming products.',
    keywords: ['pet', 'pets', 'dog', 'dogs', 'cat', 'cats', 'puppy', 'kitten', 'petfood', 'grooming', 'leash', 'collar', 'aquarium', 'bird', 'birds'],
    settings: {
      colors: { primary: '#d9822b', accent: '#3a86ff', background: '#fffaf3', text: '#2b2118' },
      fonts: { heading: 'Poppins', body: 'Nunito' },
    },
    content: {
      announcement: 'Vet-approved products · Free delivery above ₹999',
      heroHeading: 'Everything your pet loves',
      heroSubheading: 'Nutritious food, comfy beds and fun toys for happy, healthy pets.',
      heroButton: 'Shop for pets',
      gridHeading: 'Tail-wagging favourites',
      features: [
        { icon: 'heart', title: 'Vet-approved', body: 'Products recommended by vets.' },
        { icon: 'truck', title: 'Doorstep delivery', body: 'Never run out of pet food.' },
        { icon: 'wallet', title: 'COD available', body: 'Pay with UPI, card, or cash on delivery.' },
      ],
      aboutHeading: 'Pet parents, just like you',
      aboutBody: 'Our dogs and cats test everything first. If they don’t love it, we don’t sell it.',
      testimonials: [
        { quote: 'My Labrador goes crazy for these treats. Quick delivery too!', author: 'Nikhil R.', location: 'Bengaluru' },
        { quote: 'The cat bed is so cosy — she hasn’t left it since it arrived.', author: 'Shreya D.', location: 'Kolkata' },
      ],
      whatsappHeading: 'Questions about your pet?',
      whatsappBody: 'Message us on WhatsApp for food and product advice.',
      table: {
        heading: 'Daily feeding guide',
        intro: 'For adult dogs on our dry food. Adjust for age, activity and your vet’s advice.',
        columns: ['Dog weight', 'Food per day', 'Meals'],
        rows: [
          ['Up to 5 kg', '60–100 g', '2'],
          ['5–10 kg', '100–170 g', '2'],
          ['10–20 kg', '170–280 g', '2'],
          ['20–30 kg', '280–380 g', '2'],
          ['30 kg +', '380 g +', '2–3'],
        ],
        note: 'Always keep fresh water available.',
      },
    },
  },
  {
    key: 'grocery',
    layout: 'catalog',
    name: 'Grocery & daily needs',
    description: 'Simple, practical layout for kirana stores, groceries and daily essentials.',
    keywords: ['grocery', 'groceries', 'kirana', 'provisions', 'atta', 'rice', 'dal', 'pulses', 'oil', 'ghee', 'daily needs', 'essentials', 'supermarket', 'dairy', 'vegetables', 'fruits', 'dry fruits'],
    settings: {
      colors: { primary: '#15803d', accent: '#f59e0b', background: '#ffffff', text: '#1f2937' },
      fonts: { heading: 'Mukta', body: 'Mukta' },
    },
    content: {
      announcement: 'Same-day delivery in your area · COD available',
      heroHeading: 'Your neighbourhood store, online',
      heroSubheading: 'Daily essentials at fair prices, delivered to your door.',
      heroButton: 'Start shopping',
      gridHeading: 'Daily essentials',
      features: [
        { icon: 'truck', title: 'Quick delivery', body: 'Same or next-day delivery nearby.' },
        { icon: 'wallet', title: 'Fair prices', body: 'MRP or less, always.' },
        { icon: 'leaf', title: 'Fresh stock', body: 'Restocked every day.' },
      ],
      aboutHeading: 'Serving our neighbourhood since day one',
      aboutBody: 'We are your local store, now online. Order on your phone and we will deliver it fresh, just like always.',
      testimonials: [
        { quote: 'Ordering monthly groceries is so easy now. Always on time.', author: 'Geeta S.', location: 'Lucknow' },
        { quote: 'Fresh stock and honest prices. Saves me a trip every week.', author: 'Prakash N.', location: 'Mysuru' },
      ],
      whatsappHeading: 'Send us your list',
      whatsappBody: 'Message your grocery list on WhatsApp and we will pack it for you.',
      table: {
        heading: 'Delivery slots & charges',
        columns: ['Order value', 'Delivery', 'Charge'],
        rows: [
          ['Below ₹299', 'Next day', '₹40'],
          ['₹299 – ₹599', 'Same day (order by 2 pm)', '₹20'],
          ['₹600 and above', 'Same day (order by 4 pm)', 'Free'],
        ],
        note: 'We deliver within 5 km of our store. Message us for bulk or monthly orders.',
      },
    },
  },
  {
    key: 'gifts',
    layout: 'editorial',
    name: 'Gifts & personalised',
    description: 'Celebratory layout for gift hampers, personalised gifts and festive boxes.',
    keywords: ['gifts', 'gifting', 'hamper', 'hampers', 'personalised', 'personalized', 'customised', 'customized', 'custom', 'festive', 'diwali', 'rakhi', 'wedding', 'return gifts', 'corporate gifts', 'anniversary', 'birthday'],
    settings: {
      colors: { primary: '#9d174d', accent: '#f4a261', background: '#fff8f5', text: '#2a1a22' },
      fonts: { heading: 'Playfair Display', body: 'Poppins' },
    },
    content: {
      announcement: 'Free gift wrapping · Add a personal message at checkout',
      heroHeading: 'Gifts they will remember',
      heroSubheading: 'Personalised gifts and curated hampers for birthdays, weddings and festivals.',
      heroButton: 'Find a gift',
      gridHeading: 'Popular gifts',
      features: [
        { icon: 'gift', title: 'Free gift wrap', body: 'Every order arrives ready to gift.' },
        { icon: 'sparkles', title: 'Personalised', body: 'Add names, photos and messages.' },
        { icon: 'truck', title: 'On-time delivery', body: 'Never miss a special day.' },
      ],
      aboutHeading: 'Making moments special',
      aboutBody: 'We help you say what matters with thoughtful, personalised gifts — crafted, wrapped and delivered with love.',
      testimonials: [
        { quote: 'The personalised hamper made my parents’ anniversary so special.', author: 'Riya J.', location: 'Delhi' },
        { quote: 'Ordered 50 corporate gifts — beautifully done and delivered on time.', author: 'Varun M.', location: 'Hyderabad' },
      ],
      whatsappHeading: 'Planning bulk or corporate gifts?',
      whatsappBody: 'Message us on WhatsApp for custom hampers and bulk pricing.',
      table: {
        heading: 'Hamper sizes',
        columns: ['Hamper', 'Items', 'Best for', 'Price'],
        rows: [
          ['Little joy', '3–4', 'Birthdays, thank-yous', 'From ₹799'],
          ['Celebration', '6–8', 'Festivals, anniversaries', 'From ₹1,799'],
          ['Grand', '10–12', 'Weddings, family gifting', 'From ₹3,499'],
          ['Corporate', 'Custom', 'Teams and clients', 'On request'],
        ],
        note: 'Every hamper includes a personalised message card.',
      },
    },
  },
  {
    key: 'general',
    layout: 'classic',
    name: 'General store',
    description: 'A versatile layout that works for any kind of product.',
    keywords: [],
    settings: {
      colors: { primary: '#ea580c', accent: '#0ea5e9', background: '#ffffff', text: '#18181b' },
      fonts: { heading: 'Poppins', body: 'Inter' },
    },
    content: {
      announcement: 'Free shipping on your first order · COD available',
      heroHeading: 'Quality products, delivered to your door',
      heroSubheading: 'Shop our latest collection with secure payments and easy returns.',
      heroButton: 'Shop now',
      gridHeading: 'Featured products',
      features: commonFeatures,
      aboutHeading: 'Why shop with us',
      aboutBody: 'We are a small team that cares about quality, fair prices and keeping our customers happy.',
      testimonials: [
        { quote: 'Smooth ordering and quick delivery. Highly recommend!', author: 'Rahul D.', location: 'Lucknow' },
        { quote: 'Great quality for the price. Will shop again.', author: 'Pooja N.', location: 'Indore' },
      ],
      whatsappHeading: 'Questions? We are on WhatsApp',
      whatsappBody: 'Message us anytime for order help or product questions.',
    },
  },
];

export const DEFAULT_TEMPLATE_KEY = 'general';

export function getTemplate(key: string): ThemeTemplate | undefined {
  return THEME_TEMPLATES.find((t) => t.key === key);
}

const DEFAULT_TABLE: TemplateTable = {
  heading: 'Shipping & delivery',
  columns: ['Where', 'Delivery time', 'Charge'],
  rows: [
    ['Metro cities', '2–3 days', 'Free above ₹999, else ₹49'],
    ['Rest of India', '4–6 days', '₹49'],
    ['Remote areas & North-East', '6–9 days', '₹79'],
  ],
  note: 'You get a tracking link on WhatsApp as soon as your order ships.',
};

const FOOTER_LINKS = [
  { label: 'Shipping policy', href: '/pages/shipping' },
  { label: 'Returns & refunds', href: '/pages/returns' },
  { label: 'Privacy policy', href: '/pages/privacy' },
  { label: 'Contact us', href: '/pages/contact' },
];

const TEMPLATE_PAGES: PagePreset[] = ['about', 'contact', 'shipping', 'returns', 'privacy'];

/** Section builders shared by every layout; each layout picks, orders and styles them. */
function sectionsFor(content: TemplateContent) {
  return {
    announcement: (): Section => ({ id: 'announcement', type: 'announcement-bar', settings: { text: content.announcement } }),
    header: (layout: 'classic' | 'centered' | 'bold', sticky = false, extraLinks: { label: string; href: string }[] = []): Section => ({
      id: 'header',
      type: 'header',
      settings: {
        layout,
        sticky,
        menu: [
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/collections/all' },
          ...extraLinks,
          { label: 'About', href: '/pages/about' },
          { label: 'Contact', href: '/pages/contact' },
        ],
      },
    }),
    hero: (
      variant: 'banner' | 'split' | 'parallax' | 'minimal',
      alignment: 'left' | 'center',
      height: 'medium' | 'tall' | 'full' = 'medium',
    ): Section => ({
      id: 'hero',
      type: 'hero',
      settings: {
        heading: content.heroHeading,
        subheading: content.heroSubheading,
        buttonLabel: content.heroButton,
        buttonHref: '/collections/all',
        imageUrl: '',
        alignment,
        variant,
        height,
      },
    }),
    features: (variant: 'inline' | 'cards' | 'centered'): Section => ({
      id: 'features',
      type: 'features',
      settings: { variant, items: content.features },
    }),
    products: (
      columns: 2 | 3 | 4,
      layout: 'grid' | 'scroll' = 'grid',
      limit = 8,
      id = 'products',
      heading = content.gridHeading,
    ): Section => ({
      id,
      type: 'product-grid',
      settings: { heading, collectionHandle: '', limit, columns, layout },
    }),
    about: (imagePosition: 'left' | 'right'): Section => ({
      id: 'about',
      type: 'image-with-text',
      settings: {
        heading: content.aboutHeading,
        body: content.aboutBody,
        imageUrl: '',
        imagePosition,
        buttonLabel: '',
        buttonHref: '',
      },
    }),
    story: (): Section => ({
      id: 'about',
      type: 'rich-text',
      settings: { heading: content.aboutHeading, body: content.aboutBody },
    }),
    parallax: (id: string, heading: string, body: string, height: 'medium' | 'tall', button?: string): Section => ({
      id,
      type: 'parallax-banner',
      settings: {
        heading,
        body: body.slice(0, 300),
        buttonLabel: button ?? '',
        buttonHref: button ? '/collections/all' : '',
        imageUrl: '',
        height,
        alignment: 'center',
      },
    }),
    table: (style: 'striped' | 'bordered' | 'minimal', table: TemplateTable = content.table ?? DEFAULT_TABLE): Section => ({
      id: 'table',
      type: 'table',
      settings: {
        heading: table.heading,
        intro: table.intro ?? '',
        columns: table.columns,
        rows: table.rows,
        style,
        note: table.note ?? '',
      },
    }),
    faq: (): Section => ({
      id: 'faq',
      type: 'faq',
      settings: { heading: 'Frequently asked questions', items: content.faq ?? DEFAULT_FAQ },
    }),
    testimonials: (variant: 'cards' | 'spotlight'): Section => ({
      id: 'testimonials',
      type: 'testimonials',
      settings: { heading: 'What our customers say', variant, items: content.testimonials },
    }),
    whatsapp: (): Section => ({
      id: 'contact',
      type: 'whatsapp-cta',
      settings: { heading: content.whatsappHeading, body: content.whatsappBody, buttonLabel: 'Chat on WhatsApp', phone: '' },
    }),
    footer: (): Section => ({
      id: 'footer',
      type: 'footer',
      settings: { aboutText: content.aboutBody.slice(0, 300), links: FOOTER_LINKS },
    }),
  };
}

function layoutSections(layout: LayoutKey, content: TemplateContent): Section[] {
  const s = sectionsFor(content);
  switch (layout) {
    case 'editorial':
      return [
        s.announcement(),
        s.header('centered'),
        s.hero('split', 'left', 'tall'),
        s.products(3),
        s.about('right'),
        ...(content.table ? [s.table('minimal')] : []),
        s.testimonials('spotlight'),
        s.whatsapp(),
        s.footer(),
      ];
    case 'parallax': {
      const banner = content.banner ?? { heading: content.aboutHeading, body: content.aboutBody };
      return [
        s.header('classic', true),
        s.hero('parallax', 'center', 'full'),
        s.features('centered'),
        s.products(3),
        s.parallax('story-banner', banner.heading, banner.body, 'tall'),
        s.about('left'),
        s.testimonials('spotlight'),
        s.faq(),
        s.parallax('closing-banner', content.whatsappHeading, content.whatsappBody, 'medium', content.heroButton),
        s.whatsapp(),
        s.footer(),
      ];
    }
    case 'catalog':
      return [
        s.announcement(),
        s.header('bold', true, [{ label: 'Delivery', href: '#table' }]),
        s.hero('minimal', 'left'),
        s.products(4, 'grid', 8),
        s.features('inline'),
        s.products(4, 'scroll', 12, 'more-products', 'More to explore'),
        s.table('bordered'),
        s.faq(),
        s.whatsapp(),
        s.footer(),
      ];
    case 'playful':
      return [
        s.announcement(),
        s.header('classic'),
        s.hero('split', 'left', 'tall'),
        s.features('cards'),
        s.products(3),
        s.table('striped'),
        s.testimonials('cards'),
        s.about('left'),
        s.whatsapp(),
        s.footer(),
      ];
    case 'minimal':
      return [
        s.header('centered'),
        s.hero('minimal', 'center', 'tall'),
        s.products(2, 'grid', 6),
        s.story(),
        s.faq(),
        s.whatsapp(),
        s.footer(),
      ];
    case 'classic':
    default:
      return [
        s.announcement(),
        s.header('classic'),
        s.hero('banner', 'center'),
        s.features('inline'),
        s.products(4),
        s.about('left'),
        s.testimonials('cards'),
        s.whatsapp(),
        s.footer(),
      ];
  }
}

export function buildLayoutFromTemplate(
  template: ThemeTemplate,
  storeName: string,
  content: TemplateContent = template.content,
): StoreLayout {
  return {
    settings: {
      ...template.settings,
      style: template.settings.style ?? TEMPLATE_LAYOUTS[template.layout].style,
      logoText: storeName.slice(0, 60),
    },
    sections: layoutSections(template.layout, content),
    pages: TEMPLATE_PAGES.reduce<StorePage[]>(
      (pages, preset) => [
        ...pages,
        createPage(preset, pages, { storeName, aboutHeading: content.aboutHeading, aboutBody: content.aboutBody }),
      ],
      [],
    ),
    templates: {
      product: {
        above: [],
        below: [
          { id: 'product-features', type: 'features', settings: { variant: 'inline', items: content.features } },
          {
            id: 'related-products',
            type: 'product-grid',
            settings: { heading: 'You may also like', scope: 'current', collectionHandle: '', limit: 4, columns: 4, layout: 'grid' },
          },
          { id: 'product-faq', type: 'faq', settings: { heading: 'Good to know', items: (content.faq ?? DEFAULT_FAQ).slice(0, 4) } },
        ],
      },
      collection: { above: [], below: [] },
    },
  };
}
