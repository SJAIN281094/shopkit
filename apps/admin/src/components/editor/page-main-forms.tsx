"use client";

import {
  DEFAULT_PER_PAGE,
  PRODUCT_LIST_SORTS,
  PRODUCT_TABLE_SORT_LABELS,
  type CollectionProductsSettings,
  type ProductDetailsSettings,
} from "@shopkit/themes";
import { CheckboxField, SelectField } from "./fields";

export function ProductDetailsForm({
  settings,
  onChange,
}: {
  settings: ProductDetailsSettings;
  onChange: (settings: ProductDetailsSettings) => void;
}) {
  const set = (patch: Partial<ProductDetailsSettings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <SelectField
        label="Layout"
        value={settings.layout}
        onChange={(layout) => set({ layout })}
        options={[
          { value: "gallery-left", label: "Photos left, details right" },
          { value: "gallery-right", label: "Details left, photos right" },
          { value: "stacked", label: "Photos on top, details centred below" },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Photo shape"
          value={settings.imageShape}
          onChange={(imageShape) => set({ imageShape })}
          options={[
            { value: "square", label: "Square" },
            { value: "portrait", label: "Tall (4:5)" },
            { value: "landscape", label: "Wide (4:3)" },
          ]}
        />
        <SelectField
          label="Extra photos"
          value={settings.thumbnails}
          onChange={(thumbnails) => set({ thumbnails })}
          options={[
            { value: "below", label: "Thumbnails" },
            { value: "hidden", label: "Dots" },
          ]}
        />
      </div>
      <SelectField
        label="Description"
        value={settings.description}
        onChange={(description) => set({ description })}
        options={[
          { value: "beside", label: "Under the buy buttons" },
          { value: "below", label: "Full width, below the photos" },
          { value: "hidden", label: "Don't show" },
        ]}
      />
      <CheckboxField label="Show the category above the name" checked={settings.showCategory} onChange={(showCategory) => set({ showCategory })} />
      {settings.layout !== "stacked" && (
        <CheckboxField
          label="Keep price and buy buttons in view while scrolling photos"
          checked={settings.stickyDetails}
          onChange={(stickyDetails) => set({ stickyDetails })}
        />
      )}
    </>
  );
}

export function CollectionProductsForm({
  settings,
  onChange,
}: {
  settings: CollectionProductsSettings;
  onChange: (settings: CollectionProductsSettings) => void;
}) {
  const set = (patch: Partial<CollectionProductsSettings>) => onChange({ ...settings, ...patch });
  return (
    <>
      <SelectField
        label="Title style"
        value={settings.heading}
        onChange={(heading) => set({ heading })}
        options={[
          { value: "left", label: "Left aligned" },
          { value: "center", label: "Centred" },
          { value: "banner", label: "Coloured banner" },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Per row (desktop)"
          value={String(settings.columns) as "2" | "3" | "4"}
          onChange={(v) => set({ columns: Number(v) as 2 | 3 | 4 })}
          options={[
            { value: "2", label: "2 — large photos" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
          ]}
        />
        <SelectField
          label="Order"
          value={settings.sort}
          onChange={(sort) => set({ sort })}
          options={PRODUCT_LIST_SORTS.map((value) => ({ value, label: PRODUCT_TABLE_SORT_LABELS[value] }))}
        />
      </div>
      <SelectField
        label="Products per page"
        value={String(settings.perPage ?? DEFAULT_PER_PAGE) as "12" | "24" | "48"}
        onChange={(v) => set({ perPage: Number(v) as 12 | 24 | 48 })}
        options={[
          { value: "12", label: "12 — page links appear sooner" },
          { value: "24", label: "24" },
          { value: "48", label: "48" },
        ]}
      />
      <CheckboxField label="Let shoppers change the order (“Sort by” menu)" checked={settings.sortMenu} onChange={(sortMenu) => set({ sortMenu })} />
      <CheckboxField label="Show the collection description" checked={settings.showDescription} onChange={(showDescription) => set({ showDescription })} />
      <CheckboxField label="Show how many products" checked={settings.showCount} onChange={(showCount) => set({ showCount })} />
    </>
  );
}
