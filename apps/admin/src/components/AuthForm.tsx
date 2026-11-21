"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGIN, MY_SHOPS, SIGNUP } from "@/lib/graphql";
import { session } from "@/lib/session";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const client = useApolloClient();
  const [signup, signupState] = useMutation(SIGNUP);
  const [login, loginState] = useMutation(LOGIN);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const loading = signupState.loading || loginState.loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    session.clear();
    try {
      if (mode === "signup") {
        const { data } = await signup({ variables: { input: form } });
        if (!data) return;
        session.setToken(data.signup.accessToken);
        router.push("/onboarding");
        return;
      }

      const { data } = await login({ variables: { input: { email: form.email, password: form.password } } });
      if (!data) return;
      session.setToken(data.login.accessToken);
      const shops = await client.query({ query: MY_SHOPS, fetchPolicy: "network-only" });
      const first = shops.data?.myShops[0];
      if (first) {
        session.setShopId(first.shop.id);
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === "signup" ? "Create your Shopkit account" : "Welcome back"}</CardTitle>
          <CardDescription>
            {mode === "signup"
              ? "Start selling online in minutes. No credit card needed."
              : "Log in to manage your store."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" required minLength={2} value={form.name} onChange={update("name")} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={update("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={mode === "signup" ? 8 : 1}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={form.password}
                onChange={update("password")}
              />
              {mode === "signup" && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              {mode === "signup" ? "Create account" : "Log in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New to Shopkit?{" "}
                <Link href="/signup" className="font-medium text-primary hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
