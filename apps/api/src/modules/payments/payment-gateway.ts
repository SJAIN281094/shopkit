import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { RazorpayService } from '@arhaminnovations/nestjs-payment';

export interface GatewayOrder {
  id: string;
  amount: number;
}

export interface PaymentGateway {
  readonly name: 'razorpay' | 'test';
  /** Public key the browser checkout needs; null for the test gateway. */
  readonly keyId: string | null;
  createOrder(amount: number, receipt: string, notes: Record<string, string>): Promise<GatewayOrder>;
  verifyPayment(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhook(rawBody: string, signature: string): boolean;
  refund(paymentId: string, amount: number): Promise<void>;
}

/** Real payments through the seller's (or platform's) Razorpay account. */
export class RazorpayGateway implements PaymentGateway {
  readonly name = 'razorpay' as const;

  constructor(
    private readonly razorpay: RazorpayService,
    readonly keyId: string,
  ) {}

  static create(keyId: string, keySecret: string, webhookSecret?: string): RazorpayGateway {
    return new RazorpayGateway(new RazorpayService({ razorpay: { keyId, keySecret, webhookSecret } }), keyId);
  }

  async createOrder(amount: number, receipt: string, notes: Record<string, string>): Promise<GatewayOrder> {
    const order = await this.razorpay.createOrder({ amount, currency: 'INR', receipt, notes, payment_capture: 1 });
    return { id: order.id, amount: Number(order.amount) };
  }

  verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
    return this.razorpay.verifyPaymentSignature(orderId, paymentId, signature).isValid;
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    return this.razorpay.verifyWebhookSignature(rawBody, signature);
  }

  async refund(paymentId: string, amount: number): Promise<void> {
    await this.razorpay.createRefund(paymentId, { amount, speed: 'normal' });
  }
}

/**
 * Development stand-in for Razorpay. Payments are "made" by asking the API to
 * sign a fake payment, so the whole checkout flow runs without real keys.
 */
export class TestGateway implements PaymentGateway {
  readonly name = 'test' as const;
  readonly keyId = null;

  constructor(private readonly secret: string) {}

  async createOrder(amount: number): Promise<GatewayOrder> {
    return { id: `test_order_${randomBytes(9).toString('hex')}`, amount };
  }

  /** Produces what Razorpay's checkout would hand the browser after a successful payment. */
  simulatePayment(orderId: string): { paymentId: string; signature: string } {
    const paymentId = `test_pay_${randomBytes(9).toString('hex')}`;
    return { paymentId, signature: this.sign(`${orderId}|${paymentId}`) };
  }

  verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
    return safeEqual(this.sign(`${orderId}|${paymentId}`), signature);
  }

  verifyWebhook(): boolean {
    return false;
  }

  async refund(): Promise<void> {}

  private sign(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
