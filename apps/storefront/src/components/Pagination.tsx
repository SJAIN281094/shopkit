import { ChevronLeft, ChevronRight } from "lucide-react";

/** Page numbers to show: first, last, and the current page with its neighbours; null marks a gap. */
function pageList(page: number, totalPages: number): (number | null)[] {
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? [null, p] : [p]));
}

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const link = "flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-sm";
  return (
    <nav aria-label="Pages" className="mt-12 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <a href={hrefFor(page - 1)} rel="prev" className={`${link} sk-border border`} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </a>
      ) : (
        <span className={`${link} sk-border border opacity-40`} aria-hidden>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}
      {pageList(page, totalPages).map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="sk-muted px-1">
            …
          </span>
        ) : p === page ? (
          <span key={p} aria-current="page" className={`${link} sk-primary-bg font-semibold`}>
            {p}
          </span>
        ) : (
          <a key={p} href={hrefFor(p)} className={`${link} sk-border border hover:opacity-80`}>
            {p}
          </a>
        ),
      )}
      {page < totalPages ? (
        <a href={hrefFor(page + 1)} rel="next" className={`${link} sk-border border`} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </a>
      ) : (
        <span className={`${link} sk-border border opacity-40`} aria-hidden>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
