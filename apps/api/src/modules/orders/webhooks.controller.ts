import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import type { RazorpayWebhookEvent } from '@arhaminnovations/nestjs-payment';
import { Shop } from '../../entities';
import { PaymentsService } from '../payments/payments.service';
import { OrdersService } from './orders.service';

const PAID_EVENTS = new Set(['payment.captured', 'order.paid']);

/** Sellers point their Razorpay webhook at /webhooks/razorpay/<shop id>. */
@Controller('webhooks/razorpay')
export class RazorpayWebhookController {
  constructor(
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    private readonly payments: PaymentsService,
    private readonly orders: OrdersService,
  ) {}

  @Post(':shopId')
  @HttpCode(200)
  async handle(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
  ): Promise<{ ok: true }> {
    const shop = await this.shops.findOne({ where: { id: shopId } });
    const gateway = shop ? this.payments.forShop(shop) : null;
    if (!shop || !gateway) throw new NotFoundException();
    const raw = req.rawBody?.toString('utf8');
    if (!raw || !signature) throw new BadRequestException('Missing body or signature');
    if (!gateway.verifyWebhook(raw, signature)) throw new UnauthorizedException('Invalid signature');

    const event = JSON.parse(raw) as RazorpayWebhookEvent;
    const payment = event.payload.payment?.entity;
    if (PAID_EVENTS.has(event.event) && payment?.order_id) {
      await this.orders.handleGatewayPayment(shop, payment.order_id, payment.id);
    }
    return { ok: true };
  }
}
