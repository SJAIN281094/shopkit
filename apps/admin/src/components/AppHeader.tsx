"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApolloClient } from "@apollo/client/react";
import { LogOut, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { session } from "@/lib/session";

const NAV = [
  { href: "/dashboard", label: "Store", match: ["/dashboard", "/designs"] },
  { href: "/orders", label: "Orders", match: ["/orders"] },
  { href: "/products", label: "Products", match: ["/products"] },
  { href: "/collections", label: "Collections", match: ["/collections"] },
  { href: "/settings", label: "Settings", match: ["/settings"] },
  { href: "/billing", label: "Plan & credits", match: ["/billing"] },
];

export function AppHeader({ shopName, showNav = false }: { shopName?: string; showNav?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const client = useApolloClient();

  async function logout() {
    session.clear();
    await client.clearStore();
    router.replace("/login");
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Store className="h-5 w-5 text-primary" />
            Shopkit
            {shopName && <span className="font-normal text-muted-foreground">/ {shopName}</span>}
          </Link>
          {showNav && (
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => {
                const active = item.match.some((m) => pathname.startsWith(m));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 transition-colors hover:bg-accent",
                      active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={logout} icon={<LogOut />}>
          Log out
        </Button>
      </div>
    </header>
  );
}
