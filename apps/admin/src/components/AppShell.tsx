"use client";

import { Suspense } from "react";
import { AppHeader } from "./AppHeader";
import { RequireAuth } from "./RequireAuth";

/** Signed-in pages for the selected store: auth check, header with navigation, page body. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth requireShop>
      <AppHeader showNav />
      <main className="px-4 pb-16">
        <Suspense>{children}</Suspense>
      </main>
    </RequireAuth>
  );
}
