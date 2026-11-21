import { Plus } from "lucide-react";
import type { SectionProps } from "./types";

export function Faq({ section }: SectionProps<"faq">) {
  return (
    <section id={section.id} className="mx-auto max-w-3xl px-4 py-16">
      <h2 className="sk-heading mb-8 text-center text-3xl font-semibold">{section.settings.heading}</h2>
      <div className="sk-border divide-y border-y">
        {section.settings.items.map((item, i) => (
          <details key={i} className="sk-faq sk-border group py-1">
            <summary className="flex items-center justify-between gap-4 py-4 text-left font-medium">
              {item.question}
              <Plus className="sk-faq-icon sk-primary-text h-5 w-5 shrink-0 transition-transform" />
            </summary>
            <p className="sk-muted whitespace-pre-line pb-5 leading-relaxed">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
