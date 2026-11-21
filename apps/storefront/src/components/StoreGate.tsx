import { notFound } from "next/navigation";
import type { LoadedStore } from "@/lib/store-context";
import { StoreMessage } from "./StoreMessage";

/** Renders the fallback for a store that can't be shown; returns null when it can. */
export function storeFallback(store: LoadedStore) {
  if (store.kind === "not-found") notFound();
  if (store.kind === "preview-expired") {
    return (
      <StoreMessage
        title="This preview link has expired"
        body="Open the preview again from your Shopkit dashboard to get a fresh link."
      />
    );
  }
  if (store.kind === "not-ready") {
    return <StoreMessage title={store.data.shop.name} body="This store is getting ready. Please check back soon." />;
  }
  return null;
}
