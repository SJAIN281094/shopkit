import { Quote, Star } from "lucide-react";
import type { SectionProps } from "./types";

export function Testimonials({ section }: SectionProps<"testimonials">) {
  const { heading, items, variant = "cards" } = section.settings;

  if (variant === "spotlight") {
    return (
      <section className="sk-soft-bg">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="sk-heading mb-12 text-3xl font-semibold">{heading}</h2>
          <div className="space-y-14">
            {items.map((item) => (
              <figure key={`${item.author}-${item.quote.slice(0, 20)}`} className="flex flex-col items-center gap-5">
                <Quote className="sk-primary-text h-8 w-8 opacity-60" />
                <blockquote className="sk-heading text-2xl leading-snug sm:text-3xl">{item.quote}</blockquote>
                <figcaption className="text-sm font-medium uppercase tracking-[0.15em]">
                  {item.author}
                  {item.location && <span className="sk-muted"> · {item.location}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="sk-heading mb-8 text-center text-3xl font-semibold">{heading}</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <figure key={`${item.author}-${item.quote.slice(0, 20)}`} className="sk-border rounded-xl border p-6">
            <div className="sk-primary-text mb-3 flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="leading-relaxed">“{item.quote}”</blockquote>
            <figcaption className="sk-muted mt-4 text-sm">
              — {item.author}
              {item.location && `, ${item.location}`}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
