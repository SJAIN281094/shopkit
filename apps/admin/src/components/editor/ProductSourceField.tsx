"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@apollo/client/react";
import { COLLECTIONS } from "@/lib/graphql";
import { SelectField } from "./fields";

/**
 * What "this page's category" means on the page being edited, e.g. "Same category as the product",
 * or null on pages that have no category (Home, custom pages).
 */
export const PageCategoryLabel = createContext<string | null>(null);

const CURRENT = "__current__";

type Source = { scope?: "fixed" | "current"; collectionHandle: string };

/** "Show products from": the page's own category, all products, or one collection. */
export function ProductSourceField({ value, onChange }: { value: Source; onChange: (next: Source) => void }) {
  const { data } = useQuery(COLLECTIONS);
  const categoryLabel = useContext(PageCategoryLabel);
  const current = value.scope === "current";
  const options = [
    ...(categoryLabel || current ? [{ value: CURRENT, label: categoryLabel ?? "Same category as the page" }] : []),
    { value: "", label: "All products" },
    ...(data?.collections ?? []).map((c) => ({ value: c.handle, label: c.name })),
  ];
  if (!current && value.collectionHandle && !options.some((o) => o.value === value.collectionHandle)) {
    options.push({ value: value.collectionHandle, label: `${value.collectionHandle} (deleted)` });
  }
  return (
    <>
      <SelectField
        label="Show products from"
        value={current ? CURRENT : value.collectionHandle}
        onChange={(next) =>
          onChange(next === CURRENT ? { scope: "current", collectionHandle: "" } : { scope: "fixed", collectionHandle: next })
        }
        options={options}
      />
      {current && !categoryLabel && (
        <p className="text-xs text-muted-foreground">This page has no category, so all products are shown.</p>
      )}
    </>
  );
}
