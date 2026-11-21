"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ADMIN_ORIGIN = process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? "http://localhost:3010";

/** Keep in sync with the admin design editor. */
const PREVIEW_REFRESH_MESSAGE = "shopkit:preview-refresh";

/** Re-renders the preview when the design editor sends new unsaved changes. */
export function PreviewRefresh() {
  const router = useRouter();

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== ADMIN_ORIGIN || event.data?.type !== PREVIEW_REFRESH_MESSAGE) return;
      router.refresh();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
