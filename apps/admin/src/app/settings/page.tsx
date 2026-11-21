"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@apollo/client/react";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GST_RATES, INDIAN_STATES, isValidGstin } from "@shopkit/commerce";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CURRENT_SHOP,
  REMOVE_CUSTOM_DOMAIN,
  SET_CUSTOM_DOMAIN,
  SHOP_SETTINGS,
  UPDATE_BUSINESS_SETTINGS,
  UPDATE_CHECKOUT_SETTINGS,
  UPDATE_PAYMENT_SETTINGS,
  UPDATE_STORE_SETTINGS,
  VERIFY_CUSTOM_DOMAIN,
  type ShopSettings,
} from "@/lib/graphql";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";

function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-2 py-1.5 text-xs">{value}</code>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Copy ${label}`}
          onClick={() => navigator.clipboard.writeText(value).then(() => toast.success("Copied"))}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

async function run(action: () => Promise<unknown>, success: string) {
  try {
    await action();
    toast.success(success);
  } catch (error) {
    toast.error((error as Error).message);
  }
}

function StoreCard({ settings }: { settings: ShopSettings }) {
  const [name, setName] = useState(settings.name);
  const [email, setEmail] = useState(settings.contactEmail ?? "");
  const [aiEnabled, setAiEnabled] = useState(settings.aiEnabled);
  const [save, { loading }] = useMutation(UPDATE_STORE_SETTINGS, { refetchQueries: [{ query: CURRENT_SHOP }] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Store</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Store name</Label>
            <Input id="name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email for new orders</Label>
            <Input id="email" type="email" value={email} placeholder="Defaults to your login email" onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <Toggle
          id="ai"
          checked={aiEnabled}
          onChange={setAiEnabled}
          label="Use AI features"
          description="AI writing for designs and product listings, paid with AI credits. Turn off to hide all AI buttons — everything can still be done by hand for free."
        />
        <div className="flex justify-end">
          <Button
            loading={loading}
            onClick={() =>
              run(() => save({ variables: { input: { name: name.trim(), contactEmail: email.trim() || null, aiEnabled } } }), "Store settings saved")
            }
          >
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CheckoutCard({ settings }: { settings: ShopSettings }) {
  const [cod, setCod] = useState(settings.codEnabled);
  const [fee, setFee] = useState(paiseToRupees(settings.shippingFee));
  const [freeAbove, setFreeAbove] = useState(paiseToRupees(settings.freeShippingAbove));
  const [save, { loading }] = useMutation(UPDATE_CHECKOUT_SETTINGS);

  function submit() {
    const shippingFee = fee.trim() ? rupeesToPaise(fee) : 0;
    const freeShippingAbove = freeAbove.trim() ? rupeesToPaise(freeAbove) : null;
    if (shippingFee === null) return toast.error("Enter a valid shipping fee");
    if (freeAbove.trim() && freeShippingAbove === null) return toast.error("Enter a valid amount for free shipping");
    void run(() => save({ variables: { input: { codEnabled: cod, shippingFee, freeShippingAbove } } }), "Checkout settings saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Checkout & shipping</CardTitle>
        <CardDescription>What buyers pay for delivery, and how they can pay.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Toggle id="cod" checked={cod} onChange={setCod} label="Cash on delivery" description="Buyers pay the courier in cash or UPI when the order arrives." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fee">Shipping fee (₹)</Label>
            <Input id="fee" inputMode="decimal" value={fee} placeholder="0 for free shipping" onChange={(e) => setFee(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="freeAbove">Free shipping on orders above (₹)</Label>
            <Input id="freeAbove" inputMode="decimal" value={freeAbove} placeholder="Optional, e.g. 999" onChange={(e) => setFreeAbove(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button loading={loading} onClick={submit}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentsCard({ settings }: { settings: ShopSettings }) {
  const [keyId, setKeyId] = useState(settings.razorpayKeyId ?? "");
  const [secret, setSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [testMode, setTestMode] = useState(settings.paymentsTestMode);
  const [save, { loading }] = useMutation(UPDATE_PAYMENT_SETTINGS);

  function submit() {
    void run(async () => {
      await save({
        variables: {
          input: {
            razorpayKeyId: keyId.trim() || null,
            razorpayKeySecret: secret.trim() || null,
            razorpayWebhookSecret: webhookSecret.trim() || null,
            paymentsTestMode: testMode,
          },
        },
      });
      setSecret("");
      setWebhookSecret("");
    }, "Payment settings saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Online payments (UPI, cards, netbanking)</CardTitle>
        <CardDescription>
          Money goes straight to your own Razorpay account. Get your keys from Razorpay Dashboard → Account & Settings → API keys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="flex items-center gap-1.5 text-sm">
          {settings.razorpayConfigured ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" /> Razorpay is connected
            </>
          ) : (
            <span className="text-muted-foreground">Not connected — buyers can only use cash on delivery.</span>
          )}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="keyId">Key ID</Label>
            <Input id="keyId" value={keyId} placeholder="rzp_live_…" onChange={(e) => setKeyId(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secret">Key secret</Label>
            <Input
              id="secret"
              type="password"
              autoComplete="off"
              value={secret}
              placeholder={settings.razorpayConfigured ? "Saved — type to replace" : ""}
              onChange={(e) => setSecret(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium">Webhook (recommended)</p>
          <p className="text-xs text-muted-foreground">
            Confirms payments even if the buyer closes the page. In Razorpay → Webhooks, add this URL with the events
            “payment.captured” and “order.paid”, and paste the secret you chose below.
          </p>
          <CopyField label="Webhook URL" value={settings.razorpayWebhookUrl} />
          <div className="space-y-1.5">
            <Label htmlFor="webhookSecret">Webhook secret</Label>
            <Input
              id="webhookSecret"
              type="password"
              autoComplete="off"
              value={webhookSecret}
              placeholder={settings.razorpayWebhookConfigured ? "Saved — type to replace" : ""}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
          </div>
        </div>
        {settings.testPaymentsAllowed && (
          <Toggle
            id="testMode"
            checked={testMode}
            onChange={setTestMode}
            label="Test payments (development only)"
            description="Shows a fake payment step at checkout so you can try orders without Razorpay keys."
          />
        )}
        <div className="flex justify-end">
          <Button loading={loading} onClick={submit}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessCard({ settings }: { settings: ShopSettings }) {
  const [legalName, setLegalName] = useState(settings.legalName ?? "");
  const [gstin, setGstin] = useState(settings.gstin ?? "");
  const [stateCode, setStateCode] = useState(settings.stateCode ?? "");
  const [address, setAddress] = useState(settings.businessAddress ?? "");
  const [rate, setRate] = useState(String(settings.defaultGstRate));
  const [save, { loading }] = useMutation(UPDATE_BUSINESS_SETTINGS);

  function submit() {
    const cleanGstin = gstin.trim().toUpperCase();
    if (cleanGstin && !isValidGstin(cleanGstin)) return toast.error("That GSTIN doesn't look right. Check for typos.");
    if (cleanGstin && cleanGstin.slice(0, 2) !== stateCode) return toast.error("Your GSTIN doesn't match the state you picked");
    void run(
      () =>
        save({
          variables: {
            input: {
              legalName: legalName.trim() || null,
              gstin: cleanGstin || null,
              businessAddress: address.trim() || null,
              stateCode: stateCode || null,
              defaultGstRate: Number(rate),
            },
          },
        }),
      "Business details saved",
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Business & GST</CardTitle>
        <CardDescription>
          Shown on invoices. With a GSTIN, every order gets a GST tax invoice (CGST + SGST in your state, IGST outside it).
          Without one, buyers get a simple invoice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="legalName">Legal business name</Label>
            <Input id="legalName" maxLength={120} value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" maxLength={15} value={gstin} placeholder="Optional, e.g. 27AAPFU0939F1ZV" onChange={(e) => setGstin(e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State you ship from</Label>
            <Select id="state" value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
              <option value="">Choose state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate">Default GST rate</Label>
            <Select id="rate" value={rate} onChange={(e) => setRate(e.target.value)}>
              {GST_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Business address</Label>
          <Textarea id="address" rows={2} maxLength={400} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button loading={loading} onClick={submit}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DomainCard({ settings }: { settings: ShopSettings }) {
  const [domain, setDomain] = useState("");
  const [setCustomDomain, setState] = useMutation(SET_CUSTOM_DOMAIN);
  const [verify, verifyState] = useMutation(VERIFY_CUSTOM_DOMAIN);
  const [remove, removeState] = useMutation(REMOVE_CUSTOM_DOMAIN);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Custom domain</CardTitle>
        <CardDescription>
          Your store is always at{" "}
          <a href={settings.storeUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            {settings.storeUrl.replace(/^https?:\/\//, "")}
          </a>
          . You can also use a domain you own, like shop.yourbrand.in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!settings.customDomainAllowed ? (
          <p className="text-sm">
            Custom domains come with paid plans.{" "}
            <Link href="/billing" className="font-medium text-primary hover:underline">
              See plans
            </Link>
          </p>
        ) : !settings.customDomain ? (
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-sm" value={domain} placeholder="shop.yourbrand.in" onChange={(e) => setDomain(e.target.value)} />
            <Button
              loading={setState.loading}
              onClick={() => run(() => setCustomDomain({ variables: { input: { domain: domain.trim() } } }), "Domain added — now update your DNS")}
            >
              Add domain
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {settings.customDomainVerified ? <CheckCircle2 className="h-4 w-4 text-success" /> : null}
                {settings.customDomain}
                <span className="font-normal text-muted-foreground">
                  {settings.customDomainVerified ? "· connected" : "· waiting for DNS"}
                </span>
              </p>
              <div className="flex gap-2">
                {!settings.customDomainVerified && (
                  <Button size="sm" loading={verifyState.loading} onClick={() => run(() => verify(), "Domain connected!")}>
                    Check DNS
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  loading={removeState.loading}
                  onClick={() => window.confirm("Remove this domain from your store?") && run(() => remove(), "Domain removed")}
                >
                  Remove
                </Button>
              </div>
            </div>
            {settings.domainDns && !settings.customDomainVerified && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Add these two records where you bought the domain (GoDaddy, Hostinger, Cloudflare…). DNS changes can take up to a
                  few hours.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CopyField label="CNAME name" value={settings.domainDns.cnameName} />
                  <CopyField label="CNAME points to" value={settings.domainDns.cnameTarget} />
                  <CopyField label="TXT name" value={settings.domainDns.txtName} />
                  <CopyField label="TXT value" value={settings.domainDns.txtValue} />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Settings() {
  const { data, loading } = useQuery(SHOP_SETTINGS);
  const settings = data?.shopSettings;

  if (!settings) {
    return (
      <div className="flex justify-center py-24">{loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}</div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Checkout, payments, invoices and your store address.</p>
      </div>
      <StoreCard settings={settings} />
      <CheckoutCard settings={settings} />
      <PaymentsCard settings={settings} />
      <BusinessCard settings={settings} />
      <DomainCard settings={settings} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <Settings />
    </AppShell>
  );
}
