"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { session } from "@/lib/session";

interface RequireAuthProps {
  children: React.ReactNode;
  /** Also require a selected store; redirects to onboarding when missing. */
  requireShop?: boolean;
}

export function RequireAuth({ children, requireShop = false }: RequireAuthProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session.getToken()) {
      router.replace("/login");
    } else if (requireShop && !session.getShopId()) {
      router.replace("/onboarding");
    } else {
      setReady(true);
    }
  }, [router, requireShop]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <>{children}</>;
}
