"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CREATE_SHOP, MY_SHOPS, SUBDOMAIN_AVAILABILITY } from "@/lib/graphql";
import { session } from "@/lib/session";
import { storefrontHostLabel } from "@/lib/storefront-url";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");
}

type Availability = { state: "idle" | "checking" } | { state: "ok" } | { state: "error"; reason: string };

function CreateStoreForm() {
  const router = useRouter();
  const client = useApolloClient();
  const [createShop, { loading }] = useMutation(CREATE_SHOP, { refetchQueries: [{ query: MY_SHOPS }] });
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [availability, setAvailability] = useState<Availability>({ state: "idle" });

  useEffect(() => {
    if (!subdomainEdited) setSubdomain(slugify(name));
  }, [name, subdomainEdited]);

  useEffect(() => {
    if (subdomain.length < 3) {
      setAvailability({ state: "idle" });
      return;
    }
    setAvailability({ state: "checking" });
    const timer = setTimeout(async () => {
      try {
        const { data } = await client.query({
          query: SUBDOMAIN_AVAILABILITY,
          variables: { subdomain },
          fetchPolicy: "network-only",
        });
        const result = data?.subdomainAvailability;
        if (!result) return;
        setAvailability(result.available ? { state: "ok" } : { state: "error", reason: result.reason ?? "Not available" });
      } catch {
        setAvailability({ state: "idle" });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [subdomain, client]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await createShop({ variables: { input: { name, subdomain } } });
      if (!data) return;
      session.setShopId(data.createShop.id);
      router.push("/onboarding/design");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <Card className="mx-auto mt-12 w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create your store</CardTitle>
        <CardDescription>Pick a name and a web address. You can connect your own domain later.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Store name</Label>
            <Input
              id="name"
              required
              minLength={2}
              maxLength={60}
              placeholder="Kurta House"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subdomain">Store address</Label>
            <Input
              id="subdomain"
              required
              minLength={3}
              maxLength={32}
              placeholder="kurta-house"
              value={subdomain}
              onChange={(e) => {
                setSubdomainEdited(true);
                setSubdomain(e.target.value.toLowerCase());
              }}
            />
            <div className="flex items-center gap-1.5 text-sm">
              {availability.state === "ok" && <CheckCircle2 className="h-4 w-4 text-success" />}
              {availability.state === "error" && <XCircle className="h-4 w-4 text-destructive" />}
              <span className={availability.state === "error" ? "text-destructive" : "text-muted-foreground"}>
                {availability.state === "error"
                  ? availability.reason
                  : storefrontHostLabel(subdomain || "your-store")}
              </span>
            </div>
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={availability.state !== "ok"}>
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <AppHeader />
      <main className="px-4 pb-16">
        <CreateStoreForm />
      </main>
    </RequireAuth>
  );
}
