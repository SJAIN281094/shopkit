import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { AesService } from '@arhaminnovations/nestjs-crypto';
import { RazorpayService } from '@arhaminnovations/nestjs-payment';
import type { AppConfig } from '../../config/configuration';
import type { Shop } from '../../entities';
import { RazorpayGateway, TestGateway, type PaymentGateway } from './payment-gateway';

@Injectable()
export class PaymentsService {
  private readonly testGateway: TestGateway;
  private readonly testAllowed: boolean;
  private readonly platformKeyId: string;

  constructor(
    private readonly aes: AesService,
    private readonly platformRazorpay: RazorpayService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.testAllowed = config.get('testPaymentsAllowed', { infer: true });
    this.platformKeyId = config.get('razorpay', { infer: true }).keyId;
    const secret = createHash('sha256').update(`test-gateway:${config.get('jwtSecret', { infer: true })}`).digest('hex');
    this.testGateway = new TestGateway(secret);
  }

  get testPaymentsAllowed(): boolean {
    return this.testAllowed;
  }

  encrypt(value: string): string {
    return this.aes.encrypt(value);
  }

  /** The gateway a store's buyers pay through, or null when the store only takes cash on delivery. */
  forShop(shop: Shop): PaymentGateway | null {
    if (shop.paymentsTestMode && this.testAllowed) return this.testGateway;
    if (shop.razorpayKeyId && shop.razorpayKeySecretEnc) {
      return RazorpayGateway.create(
        shop.razorpayKeyId,
        this.aes.decrypt(shop.razorpayKeySecretEnc),
        shop.razorpayWebhookSecretEnc ? this.aes.decrypt(shop.razorpayWebhookSecretEnc) : undefined,
      );
    }
    return null;
  }

  /** The gateway sellers pay shopkit through. */
  forPlatform(): PaymentGateway | null {
    if (this.platformRazorpay.isConfigured()) return new RazorpayGateway(this.platformRazorpay, this.platformKeyId);
    return this.testAllowed ? this.testGateway : null;
  }

  /** Development only: completes a payment on the test gateway. */
  simulateTestPayment(gatewayOrderId: string): { paymentId: string; signature: string } {
    return this.testGateway.simulatePayment(gatewayOrderId);
  }
}
