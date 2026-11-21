import type { SectionProps } from "./types";

export function RichText({ section }: SectionProps<"rich-text">) {
  return (
    <section id={section.id} className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="sk-heading mb-4 text-3xl font-semibold">{section.settings.heading}</h2>
      {section.settings.body && <p className="sk-muted whitespace-pre-line leading-relaxed">{section.settings.body}</p>}
    </section>
  );
}
