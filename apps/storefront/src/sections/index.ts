import type { SectionType } from "@shopkit/themes";
import { AnnouncementBar } from "./AnnouncementBar";
import { Features } from "./Features";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Hero } from "./Hero";
import { ImageWithText } from "./ImageWithText";
import { ProductGrid } from "./ProductGrid";
import { RichText } from "./RichText";
import { Testimonials } from "./Testimonials";
import { WhatsappCta } from "./WhatsappCta";
import { ParallaxBanner } from "./ParallaxBanner";
import { Table } from "./Table";
import { Faq } from "./Faq";
import type { SectionProps } from "./types";

export const SECTION_COMPONENTS: { [T in SectionType]: React.ComponentType<SectionProps<T>> } = {
  "announcement-bar": AnnouncementBar,
  header: Header,
  hero: Hero,
  "product-grid": ProductGrid,
  features: Features,
  "image-with-text": ImageWithText,
  testimonials: Testimonials,
  "rich-text": RichText,
  "whatsapp-cta": WhatsappCta,
  "parallax-banner": ParallaxBanner,
  table: Table,
  faq: Faq,
  footer: Footer,
};
