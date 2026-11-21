"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BILLING_OVERVIEW,
  BUY_AI_CREDITS,
  BUY_PLAN,
  CONFIRM_BILLING_PAYMENT,
  CURRENT_SHOP,
  SIMULATE_BILLING_PAYMENT,
  type BillingCheckout,
  type PlanInfo,
} from "@/lib/graphql";
import { formatInr } from "@/lib/money";
import { openRazorpay } from "@/lib/razorpay";
import { cn } from "@/lib/utils";

function planFeatures(plan: PlanInfo): string[] {
  return [
    `Up to ${plan.maxProducts.toLocaleString("en-IN")} products`,
    plan.customDomain ? "Your own domain" : "yourstore subdomain",
    plan.aiCredits ? `${plan.aiCredits} AI credits each month you pay` : "Buy AI credits when you need them",
    "Free templates, COD, online payments, GST invoices",
  ];
}

function Billing() {
  const { data, loading } = useQuery(BILLING_OVERVIEW, { fetchPolicy: "cache-and-network" });
  const [buyPlan] = useMutation(BUY_PLAN);
  const [buyCredits] = useMutation(BUY_AI_CREDITS);
  const [simulate] = useMutation(SIMULATE_BILLING_PAYMENT);
  const [confirm] = useMutation(CONFIRM_BILLING_PAYMENT, { refetchQueries: [{ query: CURRENT_SHOP }] });
  const [pending, setPending] = useState<string | null>(null);
  const overview = data?.billingOverview;

  async function pay(key: string, start: () => Promise<BillingCheckout | undefined>, success: string) {
    setPending(key);
    try {
      const checkout = await start();
      if (!checkout) return;
      let result: { paymentId: string; signature: string } | null;
      if (checkout.gateway === "test") {
        if (!window.confirm(`Test mode: no real money is charged. Pretend to pay for ${checkout.description}?`)) return;
        const simulated = (await simulate({ variables: { input: { billingPaymentId: checkout.billingPaymentId } } })).data
          ?.simulateBillingPayment;
        result = simulated ? { paymentId: simulated.paymentId, signature: simulated.signature } : null;
      } else {
        if (!checkout.keyId) throw new Error("Payments are not set up yet");
        result = await openRazorpay({
          keyId: checkout.keyId,
          orderId: checkout.gatewayOrderId,
          amount: checkout.amount,
          name: "Shopkit",
          description: checkout.description,
        });
      }
      if (!result) return;
      await confirm({
        variables: { input: { billingPaymentId: checkout.billingPaymentId, paymentId: result.paymentId, signature: result.signature } },
      });
      toast.success(success);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(null);
    }
  }

  if (!overview) {
    return <div className="flex justify-center py-24">{loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}</div>;
  }

  const current = overview.plan.plan;
  const expires = overview.planExpiresAt ? new Date(overview.planExpiresAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : null;

  return (
    <div className="mx-auto mt-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Plan & AI credits</h1>
        <p className="text-sm text-muted-foreground">
          You&apos;re on <span className="font-medium text-foreground">{overview.plan.name}</span>
          {expires && ` until ${expires}`} · {overview.productCount} of {overview.plan.maxProducts.toLocaleString("en-IN")} products used.
          Plans are paid for 30 days at a time — nothing renews automatically.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {overview.plans.map((plan) => {
          const isCurrent = plan.plan === current;
          return (
            <Card key={plan.plan} className={cn(isCurrent && "border-primary ring-1 ring-primary")}>
              <CardHeader>
                <CardDescription>{plan.name}</CardDescription>
                <CardTitle className="text-2xl">
                  {plan.price ? formatInr(plan.price) : "Free"}
                  {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground"> / 30 days</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5 text-sm">
                  {planFeatures(plan).map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                {plan.price === 0 ? (
                  <p className="text-xs text-muted-foreground">{isCurrent ? "Your current plan" : "Paid plans fall back to Free when they end."}</p>
                ) : (
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    loading={pending === plan.plan}
                    disabled={!!pending}
                    onClick={() =>
                      pay(
                        plan.plan,
                        async () => (await buyPlan({ variables: { input: { plan: plan.plan } } })).data?.buyPlan,
                        `${plan.name} plan active`,
                      )
                    }
                  >
                    {isCurrent ? "Add 30 more days" : `Switch to ${plan.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> AI credits: {overview.aiCreditsBalance}
          </CardTitle>
          <CardDescription>
            Credits pay for AI-written designs and product listings. They never expire. You never need AI — everything can be done by hand.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {overview.creditPacks.map((pack) => (
            <Button
              key={pack.key}
              variant="outline"
              loading={pending === pack.key}
              disabled={!!pending}
              onClick={() =>
                pay(
                  pack.key,
                  async () => (await buyCredits({ variables: { input: { packKey: pack.key } } })).data?.buyAiCredits,
                  `${pack.credits} AI credits added`,
                )
              }
            >
              {pack.credits} credits · {formatInr(pack.price)}
            </Button>
          ))}
        </CardContent>
      </Card>

      {overview.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {overview.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-6 py-2.5 text-sm">
                <span>
                  {p.kind === "PLAN" ? `${p.plan?.charAt(0)}${p.plan?.slice(1).toLowerCase()} plan` : `${p.credits} AI credits`}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(p.paidAt ?? p.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{p.status === "PAID" ? "Paid" : p.status === "FAILED" ? "Failed" : "Not completed"}</span>
                  <span className="font-medium">{formatInr(p.amount)}</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <AppShell>
      <Billing />
    </AppShell>
  );
}
