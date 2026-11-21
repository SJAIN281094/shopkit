import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import type { RazorpayWebhookEvent } from '@arhaminnovations/nestjs-payment';
import { PaymentsService } from '../payments/payments.service';
import { BillingService } from './billing.service';

/** The platform Razorpay account's webhook: plan and credit purchases. */
@Controller('webhooks/razorpay-platform')
export class BillingWebhookController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly billing: BillingService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
  ): Promise<{ ok: true }> {
    const gateway = this.payments.forPlatform();
    if (!gateway || gateway.name !== 'razorpay') throw new NotFoundException();
    const raw = req.rawBody?.toString('utf8');
    if (!raw || !signature) throw new BadRequestException('Missing body or signature');
    if (!gateway.verifyWebhook(raw, signature)) throw new UnauthorizedException('Invalid signature');

    const event = JSON.parse(raw) as RazorpayWebhookEvent;
    const payment = event.payload.payment?.entity;
    if ((event.event === 'payment.captured' || event.event === 'order.paid') && payment?.order_id) {
      await this.billing.handleGatewayPayment(payment.order_id, payment.id);
    }
    return { ok: true };
  }
}
