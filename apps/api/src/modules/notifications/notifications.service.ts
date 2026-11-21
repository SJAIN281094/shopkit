import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomLoggerService } from '@arhaminnovations/nestjs-pino-logger';
import { formatIndianPhone, formatInr } from '@shopkit/commerce';
import { Order, PaymentMethod, Shop, User } from '../../entities';
import { StorefrontService } from '../storefront/storefront.service';
import { NotifyrClient } from './notifyr.client';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function paragraphs(lines: string[]): string {
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
}

/** Order emails and WhatsApp messages. Failures are logged and never block the order. */
@Injectable()
export class NotificationsService {
  private readonly logger: CustomLoggerService;

  constructor(
    private readonly notifyr: NotifyrClient,
    private readonly storefront: StorefrontService,
    @InjectRepository(User) private readonly users: Repository<User>,
    logger: CustomLoggerService,
  ) {
    this.logger = logger.forContext(NotificationsService.name);
  }

  orderPlaced(shop: Shop, order: Order): void {
    const link = this.orderLink(shop, order);
    const payment = order.paymentMethod === PaymentMethod.COD ? 'Pay cash on delivery.' : 'Payment received.';
    const items = order.items.map((i) => `${i.quantity} × ${i.title}${i.variantTitle ? ` (${i.variantTitle})` : ''}`);
    const buyerLines = [
      `Hi ${order.customer.name}, thank you for your order #${order.number} from ${shop.name}.`,
      ...items,
      `Total: ${formatInr(order.total)}. ${payment}`,
      `Track your order: ${link}`,
    ];
    this.toBuyer(shop, order, `Order #${order.number} confirmed — ${shop.name}`, buyerLines);

    const sellerLines = [
      `New order #${order.number} from ${order.customer.name} (${formatIndianPhone(order.customer.phone)}).`,
      ...items,
      `Total: ${formatInr(order.total)} · ${order.paymentMethod === PaymentMethod.COD ? 'Cash on delivery' : 'Paid online'}`,
      `Ship to: ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.pincode}`,
    ];
    this.run('order-placed-seller', order, async () => {
      const email = await this.sellerEmail(shop);
      if (!email) return;
      await this.notifyr.sendEmail({
        to: email,
        subject: `New order #${order.number} — ${formatInr(order.total)}`,
        html: paragraphs(sellerLines),
        text: sellerLines.join('\n'),
        fromName: 'Shopkit',
        tags: ['shopkit', 'order-placed-seller'],
      });
    });
  }

  orderShipped(shop: Shop, order: Order): void {
    const lines = [
      `Hi ${order.customer.name}, your order #${order.number} from ${shop.name} is on its way.`,
      ...(order.trackingNumber ? [`Tracking number: ${order.trackingNumber}`] : []),
      ...(order.trackingUrl ? [`Track the parcel: ${order.trackingUrl}`] : []),
      `Order details: ${this.orderLink(shop, order)}`,
    ];
    this.toBuyer(shop, order, `Order #${order.number} has shipped — ${shop.name}`, lines);
  }

  orderCancelled(shop: Shop, order: Order): void {
    const refund = order.paymentMethod === PaymentMethod.ONLINE && order.paidAt
      ? ['Your payment will be refunded to the original payment method in 5–7 working days.']
      : [];
    const lines = [`Hi ${order.customer.name}, your order #${order.number} from ${shop.name} has been cancelled.`, ...refund];
    this.toBuyer(shop, order, `Order #${order.number} cancelled — ${shop.name}`, lines);
  }

  private toBuyer(shop: Shop, order: Order, subject: string, lines: string[]): void {
    this.run('buyer-whatsapp', order, () => this.notifyr.sendWhatsApp(order.customer.phone, lines.join('\n')));
    const email = order.customer.email;
    if (!email) return;
    this.run('buyer-email', order, () =>
      this.notifyr.sendEmail({
        to: email,
        subject,
        html: paragraphs(lines),
        text: lines.join('\n'),
        fromName: shop.name,
        replyTo: shop.contactEmail,
        tags: ['shopkit', 'order'],
      }),
    );
  }

  private orderLink(shop: Shop, order: Order): string {
    return `${this.storefront.storeUrl(shop)}/orders/${order.id}?token=${order.accessToken}`;
  }

  private async sellerEmail(shop: Shop): Promise<string | null> {
    if (shop.contactEmail) return shop.contactEmail;
    const owner = await this.users.findOne({ where: { id: shop.ownerId }, select: { id: true, email: true } });
    return owner?.email ?? null;
  }

  private run(kind: string, order: Order, send: () => Promise<void>): void {
    send().catch((error: Error) =>
      this.logger.logWithBindings('error', { kind, orderId: order.id, error: error.message }, 'Notification failed'),
    );
  }
}
