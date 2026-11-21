"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductListSort } from "@shopkit/themes";

export function SortMenu({ value, labels }: { value: ProductListSort; labels: Record<ProductListSort, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function change(sort: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sk-muted">Sort by</span>
      <select
        id="collection-sort"
        value={value}
        onChange={(e) => change(e.target.value)}
        className="sk-border rounded-md border bg-transparent px-2 py-1.5"
      >
        {(Object.keys(labels) as ProductListSort[]).map((sort) => (
          <option key={sort} value={sort}>
            {labels[sort]}
          </option>
        ))}
      </select>
    </label>
  );
}
