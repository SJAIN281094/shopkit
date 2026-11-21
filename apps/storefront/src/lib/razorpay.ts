const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return loading;
}

/** Opens Razorpay Checkout. Resolves with the signed payment, or null if the buyer closes the window. */
export async function openRazorpay(options: {
  keyId: string;
  orderId: string;
  amount: number;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}): Promise<{ paymentId: string; signature: string } | null> {
  await loadScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Couldn't load the payment window.");
  return new Promise((resolve) => {
    new Razorpay({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amount,
      currency: "INR",
      name: options.name,
      description: options.description,
      prefill: options.prefill,
      handler: (res: RazorpaySuccess) => resolve({ paymentId: res.razorpay_payment_id, signature: res.razorpay_signature }),
      modal: { ondismiss: () => resolve(null) },
    }).open();
  });
}
