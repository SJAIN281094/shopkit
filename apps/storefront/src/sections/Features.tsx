import {
  Gift,
  Heart,
  Leaf,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { FeatureIcon } from "@shopkit/themes";
import type { SectionProps } from "./types";

const ICONS: Record<FeatureIcon, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  refresh: RefreshCw,
  star: Star,
  heart: Heart,
  leaf: Leaf,
  sparkles: Sparkles,
  phone: Phone,
  wallet: Wallet,
  gift: Gift,
};

export function Features({ section }: SectionProps<"features">) {
  const { items, variant = "inline" } = section.settings;

  if (variant === "cards") {
    return (
      <section className="sk-soft-bg">
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-14 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <div key={item.title} className="sk-card-surface space-y-3 p-6">
                <span className="sk-primary-bg inline-flex rounded-xl p-3">
                  <Icon className="h-6 w-6" />
                </span>
                <p className="sk-heading text-lg font-semibold">{item.title}</p>
                {item.body && <p className="sk-muted text-sm leading-relaxed">{item.body}</p>}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (variant === "centered") {
    return (
      <section>
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <div key={item.title} className="flex flex-col items-center gap-3 text-center">
                <span className="sk-primary-text sk-border flex h-14 w-14 items-center justify-center rounded-full border">
                  <Icon className="h-6 w-6" />
                </span>
                <p className="sk-heading text-lg font-semibold">{item.title}</p>
                {item.body && <p className="sk-muted max-w-xs text-sm">{item.body}</p>}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="sk-border border-b">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <div key={item.title} className="flex items-start gap-3">
              <span className="sk-soft-bg sk-primary-text rounded-full p-2.5">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">{item.title}</p>
                {item.body && <p className="sk-muted text-sm">{item.body}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
