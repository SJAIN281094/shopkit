import type { SectionProps } from "./types";

export function AnnouncementBar({ section }: SectionProps<"announcement-bar">) {
  return (
    <div className="sk-primary-bg px-4 py-2 text-center text-xs font-medium tracking-wide sm:text-sm">
      {section.settings.text}
    </div>
  );
}
