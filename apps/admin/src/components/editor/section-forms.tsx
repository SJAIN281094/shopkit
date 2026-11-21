"use client";

import { FEATURE_ICONS, type SectionOf, type SectionType } from "@shopkit/themes";
import { SingleImageField } from "@/components/ImagePicker";
import { Label } from "@/components/ui/label";
import { CheckboxField, ItemList, NumberField, SelectField, TextField, type ErrorAt } from "./fields";
import { ProductSourceField } from "./ProductSourceField";
import { TableForm } from "./TableForm";

interface FormProps<T extends SectionType> {
  settings: SectionOf<T>["settings"];
  onChange: (settings: SectionOf<T>["settings"]) => void;
  /** Error message for a path inside `settings`. */
  errorAt: ErrorAt;
}

type Link = { label: string; href: string };

const LINK_HINT = "Use /collections/all, /products/…, a full https:// link, or #section";

function LinkList({
  label,
  links,
  onChange,
  max,
  errorAt,
  path,
}: {
  label: string;
  links: Link[];
  onChange: (links: Link[]) => void;
  max: number;
  errorAt: ErrorAt;
  path: string;
}) {
  return (
    <ItemList
      label={label}
      items={links}
      onChange={onChange}
      max={max}
      createItem={() => ({ label: "New link", href: "/" })}
      itemLabel={(l) => l.label || "Link"}
      renderItem={(link, update, i) => (
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Text" value={link.label} max={40} onChange={(label) => update({ label })} error={errorAt([path, i, "label"])} />
          <TextField label="Goes to" value={link.href} max={300} onChange={(href) => update({ href })} error={errorAt([path, i, "href"])} />
        </div>
      )}
    />
  );
}

function ButtonFields({
  label,
  href,
  onLabel,
  onHref,
  errorAt,
}: {
  label: string;
  href: string;
  onLabel: (v: string) => void;
  onHref: (v: string) => void;
  errorAt: ErrorAt;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <TextField label="Button text" value={label} max={40} onChange={onLabel} placeholder="Leave empty to hide" error={errorAt(["buttonLabel"])} />
      <TextField label="Button link" value={href} max={300} onChange={onHref} error={errorAt(["buttonHref"])} hint={LINK_HINT} />
    </div>
  );
}

function ImageField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Image</Label>
      <SingleImageField value={value} onChange={onChange} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function AnnouncementBarForm({ settings, onChange, errorAt }: FormProps<"announcement-bar">) {
  return <TextField label="Text" value={settings.text} max={120} onChange={(text) => onChange({ text })} error={errorAt(["text"])} />;
}

function HeaderForm({ settings, onChange, errorAt }: FormProps<"header">) {
  const set = (patch: Partial<typeof settings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <p className="text-xs text-muted-foreground">The store name and logo come from Store style.</p>
      <SelectField
        label="Layout"
        value={settings.layout ?? "classic"}
        onChange={(layout) => set({ layout })}
        options={[
          { value: "classic", label: "Logo left, menu right" },
          { value: "centered", label: "Logo centred, menu below" },
          { value: "bold", label: "Coloured bar" },
        ]}
      />
      <CheckboxField
        label="Stay at the top while scrolling"
        checked={settings.sticky ?? false}
        onChange={(sticky) => set({ sticky })}
      />
      <LinkList label="Menu" links={settings.menu} max={8} path="menu" errorAt={errorAt} onChange={(menu) => set({ menu })} />
    </>
  );
}

function HeroForm({ settings, onChange, errorAt }: FormProps<"hero">) {
  const set = (patch: Partial<typeof settings>) => onChange({ ...settings, ...patch });
  const variant = settings.variant ?? "banner";
  return (
    <>
      <SelectField
        label="Style"
        value={variant}
        onChange={(v) => set({ variant: v })}
        options={[
          { value: "banner", label: "Banner — text over image" },
          { value: "split", label: "Split — text beside image" },
          { value: "parallax", label: "Parallax — image stays still on scroll" },
          { value: "minimal", label: "Minimal — large text only" },
        ]}
      />
      <TextField label="Heading" value={settings.heading} max={100} onChange={(heading) => set({ heading })} error={errorAt(["heading"])} />
      <TextField label="Subheading" rows={2} value={settings.subheading} max={240} onChange={(subheading) => set({ subheading })} error={errorAt(["subheading"])} />
      <ButtonFields
        label={settings.buttonLabel}
        href={settings.buttonHref}
        onLabel={(buttonLabel) => set({ buttonLabel })}
        onHref={(buttonHref) => set({ buttonHref })}
        errorAt={errorAt}
      />
      {variant !== "minimal" && (
        <ImageField value={settings.imageUrl} onChange={(imageUrl) => set({ imageUrl })} error={errorAt(["imageUrl"])} />
      )}
      <div className="grid grid-cols-2 gap-2">
        {variant !== "split" && (
          <SelectField
            label="Text alignment"
            value={settings.alignment}
            onChange={(alignment) => set({ alignment })}
            options={[
              { value: "center", label: "Centre" },
              { value: "left", label: "Left" },
            ]}
          />
        )}
        <SelectField
          label="Height"
          value={settings.height ?? "medium"}
          onChange={(height) => set({ height })}
          options={[
            { value: "medium", label: "Medium" },
            { value: "tall", label: "Tall" },
            { value: "full", label: "Full screen" },
          ]}
        />
      </div>
    </>
  );
}

function ProductGridForm({ settings, onChange, errorAt }: FormProps<"product-grid">) {
  const set = (patch: Partial<typeof settings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <TextField label="Heading" value={settings.heading} max={80} onChange={(heading) => set({ heading })} error={errorAt(["heading"])} />
      <ProductSourceField value={settings} onChange={set} />
      <NumberField label="How many" value={settings.limit} min={1} max={24} onChange={(limit) => set({ limit })} error={errorAt(["limit"])} />
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Layout"
          value={settings.layout ?? "grid"}
          onChange={(layout) => set({ layout })}
          options={[
            { value: "grid", label: "Grid" },
            { value: "scroll", label: "Sideways scroll" },
          ]}
        />
        {(settings.layout ?? "grid") === "grid" && (
          <SelectField
            label="Per row (desktop)"
            value={String(settings.columns ?? 4) as "2" | "3" | "4"}
            onChange={(v) => set({ columns: Number(v) as 2 | 3 | 4 })}
            options={[
              { value: "2", label: "2 — large photos" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
            ]}
          />
        )}
      </div>
    </>
  );
}

const ICON_OPTIONS = FEATURE_ICONS.map((icon) => ({ value: icon, label: icon.charAt(0).toUpperCase() + icon.slice(1) }));

function FeaturesForm({ settings, onChange, errorAt }: FormProps<"features">) {
  return (
    <>
      <SelectField
        label="Style"
        value={settings.variant ?? "inline"}
        onChange={(variant) => onChange({ ...settings, variant })}
        options={[
          { value: "inline", label: "Compact row" },
          { value: "cards", label: "Cards" },
          { value: "centered", label: "Centred icons" },
        ]}
      />
      <ItemList
        label="Features"
        items={settings.items}
        min={1}
        max={6}
        onChange={(items) => onChange({ ...settings, items })}
        createItem={() => ({ icon: "star" as const, title: "New feature", body: "" })}
        itemLabel={(f) => f.title || "Feature"}
        renderItem={(item, update, i) => (
          <>
            <SelectField label="Icon" value={item.icon} onChange={(icon) => update({ icon })} options={ICON_OPTIONS} />
            <TextField label="Title" value={item.title} max={60} onChange={(title) => update({ title })} error={errorAt(["items", i, "title"])} />
            <TextField label="Text" value={item.body} max={160} onChange={(body) => update({ body })} error={errorAt(["items", i, "body"])} />
          </>
        )}
      />
    </>
  );
}

function ImageWithTextForm({ settings, onChange, errorAt }: FormProps<"image-with-text">) {
  const set = (patch: Partial<typeof settings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <TextField label="Heading" value={settings.heading} max={100} onChange={(heading) => set({ heading })} error={errorAt(["heading"])} />
      <TextField label="Text" rows={5} value={settings.body} max={1000} onChange={(body) => set({ body })} error={errorAt(["body"])} />
      <ImageField value={settings.imageUrl} onChange={(imageUrl) => set({ imageUrl })} error={errorAt(["imageUrl"])} />
      <SelectField
        label="Image position"
        value={settings.imagePosition}
        onChange={(imagePosition) => set({ imagePosition })}
        options={[
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ]}
      />
      <ButtonFields
        label={settings.buttonLabel}
        href={settings.buttonHref}
        onLabel={(buttonLabel) => set({ buttonLabel })}
        onHref={(buttonHref) => set({ buttonHref })}
        errorAt={errorAt}
      />
    </>
  );
}

function TestimonialsForm({ settings, onChange, errorAt }: FormProps<"testimonials">) {
  const set = (patch: Partial<typeof settings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <TextField label="Heading" value={settings.heading} max={80} onChange={(heading) => set({ heading })} error={errorAt(["heading"])} />
      <SelectField
        label="Style"
        value={settings.variant ?? "cards"}
        onChange={(variant) => set({ variant })}
        options={[
          { value: "cards", label: "Review cards" },
          { value: "spotlight", label: "Large centred quotes" },
        ]}
      />
      <ItemList
        label="Reviews"
        items={settings.items}
        min={1}
        max={6}
        onChange={(items) => set({ items })}
        createItem={() => ({ quote: "Great quality!", author: "Customer", location: "" })}
        itemLabel={(t) => t.author || "Review"}
        renderItem={(item, update, i) => (
          <>
            <TextField label="Review" rows={2} value={item.quote} max={300} onChange={(quote) => update({ quote })} error={errorAt(["items", i, "quote"])} />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Name" value={item.author} max={60} onChange={(author) => update({ author })} error={errorAt(["items", i, "author"])} />
              <TextField label="City" value={item.location} max={60} onChange={(location) => update({ location })} />
            </div>
          </>
        )}
      />
    </>
  );
}

function RichTextForm({ settings, onChange, errorAt }: FormProps<"rich-text">) {
  const set = (patch: Partial<typeof settings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <TextField label="Heading" value={settings.heading} max={100} onChange={(heading) => set({ heading })} error={errorAt(["heading"])} />
      <TextField label="Text" rows={6} value={settings.body} max={2000} onChange={(body) => set({ body })} error={errorAt(["body"])} />
    </>
  );
}

function WhatsappCtaForm({ settings, onChange, errorAt }: FormProps<"whatsapp-cta">) {
  const set = (patch: Partial<typeof settings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <TextField
        label="WhatsApp number"
        value={settings.phone}
        max={15}
        placeholder="919876543210"
        onChange={(phone) => set({ phone: phone.replace(/[^\d]/g, "") })}
        error={errorAt(["phone"])}
        hint="Digits only, with country code (91 for India). Also used for “Order on WhatsApp” on product pages."
      />
      <TextField label="Heading" value={settings.heading} max={100} onChange={(heading) => set({ heading })} error={errorAt(["heading"])} />
      <TextField label="Text" value={settings.body} max={240} onChange={(body) => set({ body })} error={errorAt(["body"])} />
      <TextField label="Button text" value={settings.buttonLabel} max={40} onChange={(buttonLabel) => set({ buttonLabel })} error={errorAt(["buttonLabel"])} />
    </>
  );
}

function ParallaxBannerForm({ settings, onChange, errorAt }: FormProps<"parallax-banner">) {
  const set = (patch: Partial<typeof settings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <TextField label="Heading" value={settings.heading} max={100} onChange={(heading) => set({ heading })} error={errorAt(["heading"])} />
      <TextField label="Text" rows={2} value={settings.body} max={300} onChange={(body) => set({ body })} error={errorAt(["body"])} />
      <ImageField value={settings.imageUrl} onChange={(imageUrl) => set({ imageUrl })} error={errorAt(["imageUrl"])} />
      <p className="-mt-1 text-xs text-muted-foreground">
        The photo stays still while the page scrolls over it. Without a photo, a pattern in your store colours is used.
        Phones show it without the effect.
      </p>
      <ButtonFields
        label={settings.buttonLabel}
        href={settings.buttonHref}
        onLabel={(buttonLabel) => set({ buttonLabel })}
        onHref={(buttonHref) => set({ buttonHref })}
        errorAt={errorAt}
      />
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Height"
          value={settings.height}
          onChange={(height) => set({ height })}
          options={[
            { value: "medium", label: "Medium" },
            { value: "tall", label: "Tall" },
          ]}
        />
        <SelectField
          label="Text alignment"
          value={settings.alignment}
          onChange={(alignment) => set({ alignment })}
          options={[
            { value: "center", label: "Centre" },
            { value: "left", label: "Left" },
          ]}
        />
      </div>
    </>
  );
}

function FaqForm({ settings, onChange, errorAt }: FormProps<"faq">) {
  const set = (patch: Partial<typeof settings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <TextField label="Heading" value={settings.heading} max={100} onChange={(heading) => set({ heading })} error={errorAt(["heading"])} />
      <ItemList
        label="Questions"
        items={settings.items}
        min={1}
        max={12}
        onChange={(items) => set({ items })}
        createItem={() => ({ question: "New question", answer: "Your answer" })}
        itemLabel={(q) => q.question || "Question"}
        renderItem={(item, update, i) => (
          <>
            <TextField label="Question" value={item.question} max={160} onChange={(question) => update({ question })} error={errorAt(["items", i, "question"])} />
            <TextField label="Answer" rows={3} value={item.answer} max={800} onChange={(answer) => update({ answer })} error={errorAt(["items", i, "answer"])} />
          </>
        )}
      />
    </>
  );
}

function FooterForm({ settings, onChange, errorAt }: FormProps<"footer">) {
  const set = (patch: Partial<typeof settings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <TextField label="About text" rows={3} value={settings.aboutText} max={300} onChange={(aboutText) => set({ aboutText })} error={errorAt(["aboutText"])} />
      <LinkList label="Links" links={settings.links} max={10} path="links" errorAt={errorAt} onChange={(links) => set({ links })} />
    </>
  );
}

export const SECTION_FORMS: { [T in SectionType]: React.ComponentType<FormProps<T>> } = {
  "announcement-bar": AnnouncementBarForm,
  header: HeaderForm,
  hero: HeroForm,
  "product-grid": ProductGridForm,
  features: FeaturesForm,
  "image-with-text": ImageWithTextForm,
  testimonials: TestimonialsForm,
  "rich-text": RichTextForm,
  "whatsapp-cta": WhatsappCtaForm,
  "parallax-banner": ParallaxBannerForm,
  table: TableForm,
  faq: FaqForm,
  footer: FooterForm,
};

export type { FormProps };
