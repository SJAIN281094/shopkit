import { MessageCircle } from "lucide-react";
import type { SectionProps } from "./types";

export function WhatsappCta({ section, isPreview }: SectionProps<"whatsapp-cta">) {
  const { heading, body, buttonLabel, phone } = section.settings;
  if (!phone && !isPreview) return null;

  return (
    <section id={section.id} className="sk-soft-bg">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
        <h2 className="sk-heading text-3xl font-semibold">{heading}</h2>
        {body && <p className="sk-muted">{body}</p>}
        {phone ? (
          <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="sk-button">
            <MessageCircle className="h-5 w-5" />
            {buttonLabel}
          </a>
        ) : (
          <p className="rounded-md border border-dashed px-4 py-2 text-sm">
            Add your WhatsApp number to show this section to customers.
          </p>
        )}
      </div>
    </section>
  );
}
