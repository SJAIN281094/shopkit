import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ preview?: string }>;
}

/** Older designs link policies at /policies/<name>; they are now regular pages. */
export default async function PolicyRedirect({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const { preview } = await searchParams;
  redirect(`/pages/${encodeURIComponent(handle)}${preview ? `?preview=${encodeURIComponent(preview)}` : ""}`);
}
