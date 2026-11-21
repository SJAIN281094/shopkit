import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Brackets, DataSource, EntityManager, In, LessThan, Repository } from 'typeorm';
import { CustomLoggerService } from '@arhaminnovations/nestjs-pino-logger';
import { RedisService } from '@arhaminnovations/nestjs-redis';
import { findState, normalizeIndianPhone } from '@shopkit/commerce';
import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  ProductVariant,
  Shop,
  ShopStatus,
} from '../../entities';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { StorefrontService } from '../storefront/storefront.service';
import { financialYear, invoiceLines, shippingFor, taxSummary } from './order-pricing';
import type {
  CartLineInput,
  ConfirmPaymentInput,
  OrderAccessInput,
  OrderCounts,
  OrderFilter,
  PaymentRequest,
  PlaceOrderInput,
  PlaceOrderResult,
  ShipOrderInput,
  TestPaymentResult,
} from './orders.types';

const PAYMENT_WINDOW_MINUTES = 30;
const EXPIRY_SWEEP_MS = 60_000;
const ORDER_NUMBER_START = 1000;
const ADMIN_LIST_LIMIT = 100;
const ORDERS_PER_IP_PER_HOUR = 30;
const ORDERS_PER_PHONE_PER_HOUR = 10;

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: CustomLoggerService;
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    private readonly storefront: StorefrontService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
    private readonly redis: RedisService,
    logger: CustomLoggerService,
  ) {
    this.logger = logger.forContext(OrdersService.name);
  }

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => {
      this.cancelExpired().catch((error: Error) =>
        this.logger.logWithBindings('error', { error: error.message }, 'Expired order sweep failed'),
      );
    }, EXPIRY_SWEEP_MS);
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  // ---- Buyer ----

  async placeOrder(host: string, input: PlaceOrderInput, clientIp: string): Promise<PlaceOrderResult> {
    const shop = await this.shopForHost(host);
    await this.rateLimit(`orders:${shop.id}:${clientIp}`, ORDERS_PER_IP_PER_HOUR, 3600);

    const phone = normalizeIndianPhone(input.customer.phone);
    if (!phone) throw new BadRequestException('Enter a valid 10-digit mobile number');
    await this.rateLimit(`orders:${shop.id}:phone:${phone}`, ORDERS_PER_PHONE_PER_HOUR, 3600);
    const state = findState(input.address.stateCode);
    if (!state) throw new BadRequestException('Choose your state');

    const gateway = input.paymentMethod === PaymentMethod.ONLINE ? this.payments.forShop(shop) : null;
    if (input.paymentMethod === PaymentMethod.COD && !shop.codEnabled) {
      throw new BadRequestException('This store does not take cash on delivery');
    }
    if (input.paymentMethod === PaymentMethod.ONLINE && !gateway) {
      throw new BadRequestException('This store does not take online payments yet');
    }

    const lines = mergeLines(input.items);
    const online = input.paymentMethod === PaymentMethod.ONLINE;

    const order = await this.dataSource.transaction(async (manager) => {
      const items = await this.reserveStock(manager, shop, lines);
      const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
      const shippingFee = shippingFor(shop, subtotal);
      const shippingAddress = {
        line1: input.address.line1.trim(),
        line2: input.address.line2.trim(),
        city: input.address.city.trim(),
        stateCode: state.code,
        state: state.name,
        pincode: input.address.pincode,
      };
      const tax = taxSummary(invoiceLines(shop, { items, shippingFee, shippingAddress }));
      const number = ORDER_NUMBER_START + (await this.nextSeq(manager, shop.id, 'orderSeq'));

      return manager.save(
        manager.create(Order, {
          shopId: shop.id,
          number,
          status: online ? OrderStatus.PENDING_PAYMENT : OrderStatus.PLACED,
          paymentMethod: input.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          customer: { name: input.customer.name.trim(), phone, email: input.customer.email?.trim().toLowerCase() || null },
          shippingAddress,
          items,
          subtotal,
          shippingFee,
          total: subtotal + shippingFee,
          tax,
          note: input.note?.trim() || null,
          accessToken: randomBytes(24).toString('base64url'),
          invoiceNumber: online ? null : await this.nextInvoiceNumber(manager, shop.id),
          gateway: gateway?.name ?? null,
          expiresAt: online ? new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60_000) : null,
        }),
      );
    });

    this.logger.logWithBindings('info', { shopId: shop.id, orderId: order.id, number: order.number, total: order.total }, 'Order placed');

    if (!gateway) {
      this.notifications.orderPlaced(shop, order);
      return { order, payment: null };
    }

    try {
      const gatewayOrder = await gateway.createOrder(order.total, `order_${order.number}`, {
        shopId: shop.id,
        orderId: order.id,
      });
      await this.orders.update({ id: order.id }, { gatewayOrderId: gatewayOrder.id });
      order.gatewayOrderId = gatewayOrder.id;
      return {
        order,
        payment: { gateway: gateway.name, keyId: gateway.keyId, gatewayOrderId: gatewayOrder.id, amount: order.total },
      };
    } catch (error) {
      await this.cancelInternal(order.id, [OrderStatus.PENDING_PAYMENT]);
      this.logger.logWithBindings('error', { orderId: order.id, error: (error as Error).message }, 'Could not start online payment');
      throw new ServiceUnavailableException(
        shop.codEnabled
          ? 'Online payment is not available right now. Please try again or choose cash on delivery.'
          : 'Online payment is not available right now. Please try again in a few minutes.',
      );
    }
  }

  async confirmPayment(host: string, input: ConfirmPaymentInput): Promise<Order> {
    const shop = await this.shopForHost(host);
    const order = await this.buyerOrder(shop.id, input);
    if (order.paymentStatus === PaymentStatus.PAID) return order;
    const gateway = this.payments.forShop(shop);
    if (!order.gatewayOrderId || !gateway || gateway.name !== order.gateway) {
      throw new BadRequestException('This order is not waiting for an online payment');
    }
    if (!gateway.verifyPayment(order.gatewayOrderId, input.paymentId, input.signature)) {
      throw new BadRequestException('We could not verify this payment. If money was deducted, contact the store.');
    }
    return this.markPaid(shop, order.id, input.paymentId);
  }

  /** Development only: stands in for the Razorpay popup. */
  async simulateTestPayment(host: string, input: OrderAccessInput): Promise<TestPaymentResult> {
    const shop = await this.shopForHost(host);
    const order = await this.buyerOrder(shop.id, input);
    if (order.gateway !== 'test' || !order.gatewayOrderId || !this.payments.testPaymentsAllowed) {
      throw new BadRequestException('Test payments are not available for this order');
    }
    return this.payments.simulateTestPayment(order.gatewayOrderId);
  }

  /** Lets a buyer who closed the payment window pay a still-pending order. */
  async resumePayment(host: string, input: OrderAccessInput): Promise<PaymentRequest> {
    const shop = await this.shopForHost(host);
    const order = await this.buyerOrder(shop.id, input);
    const gateway = this.payments.forShop(shop);
    if (order.status !== OrderStatus.PENDING_PAYMENT || !order.gatewayOrderId || !gateway || gateway.name !== order.gateway) {
      throw new BadRequestException('This order is not waiting for payment');
    }
    return { gateway: gateway.name, keyId: gateway.keyId, gatewayOrderId: order.gatewayOrderId, amount: order.total };
  }

  async storefrontOrder(host: string, input: OrderAccessInput): Promise<Order> {
    const shop = await this.shopForHost(host);
    return this.buyerOrder(shop.id, input);
  }

  /** Called from verified Razorpay webhooks, in case the buyer closed the page before we heard back. */
  async handleGatewayPayment(shop: Shop, gatewayOrderId: string, paymentId: string): Promise<void> {
    const order = await this.orders.findOne({ where: { shopId: shop.id, gatewayOrderId } });
    if (!order || order.paymentStatus === PaymentStatus.PAID || order.paymentStatus === PaymentStatus.REFUNDED) return;
    await this.markPaid(shop, order.id, paymentId);
  }

  // ---- Seller ----

  listOrders(shopId: string, filter: OrderFilter = {}): Promise<Order[]> {
    const query = this.orders
      .createQueryBuilder('o')
      .where('o.shopId = :shopId', { shopId })
      .orderBy('o.createdAt', 'DESC')
      .take(ADMIN_LIST_LIMIT);
    if (filter.status) query.andWhere('o.status = :status', { status: filter.status });
    const search = filter.search?.trim().replace(/^#/, '');
    if (search) {
      const like = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
      query.andWhere(
        new Brackets((q) => {
          q.where(`o.customer->>'name' ILIKE :like`, { like }).orWhere(`o.customer->>'phone' LIKE :like`, { like });
          if (/^\d{1,9}$/.test(search)) q.orWhere('o.number = :number', { number: Number(search) });
        }),
      );
    }
    return query.getMany();
  }

  async getOrder(shopId: string, id: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id, shopId } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async orderCounts(shopId: string): Promise<OrderCounts> {
    const rows: { status: OrderStatus; count: string }[] = await this.orders
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.shopId = :shopId', { shopId })
      .groupBy('o.status')
      .getRawMany();
    const count = (status: OrderStatus) => Number(rows.find((r) => r.status === status)?.count ?? 0);
    return {
      toShip: count(OrderStatus.PLACED),
      shipped: count(OrderStatus.SHIPPED),
      total: rows.reduce((sum, r) => sum + Number(r.count), 0) - count(OrderStatus.PENDING_PAYMENT),
    };
  }

  async markShipped(shop: Shop, input: ShipOrderInput): Promise<Order> {
    const order = await this.transition(shop.id, input.orderId, [OrderStatus.PLACED, OrderStatus.SHIPPED], (o) => {
      o.status = OrderStatus.SHIPPED;
      o.shippedAt ??= new Date();
      o.trackingNumber = input.trackingNumber?.trim() || null;
      o.trackingUrl = input.trackingUrl?.trim() || null;
    });
    this.notifications.orderShipped(shop, order);
    return order;
  }

  markDelivered(shop: Shop, orderId: string): Promise<Order> {
    return this.transition(shop.id, orderId, [OrderStatus.SHIPPED], (o) => {
      o.status = OrderStatus.DELIVERED;
      o.deliveredAt = new Date();
      if (o.paymentMethod === PaymentMethod.COD) {
        o.paymentStatus = PaymentStatus.PAID;
        o.paidAt = new Date();
      }
    });
  }

  async cancelOrder(shop: Shop, orderId: string): Promise<Order> {
    await this.getOrder(shop.id, orderId);
    const order = await this.cancelInternal(orderId, [OrderStatus.PENDING_PAYMENT, OrderStatus.PLACED]);
    if (!order) throw new ConflictException('Only orders that have not shipped yet can be cancelled');
    const refunded = await this.refundIfPaid(shop, order);
    this.notifications.orderCancelled(shop, refunded);
    return refunded;
  }

  // ---- Internals ----

  private async shopForHost(host: string): Promise<Shop> {
    const subdomain = await this.storefront.subdomainForHost(host);
    const shop = subdomain ? await this.shops.findOne({ where: { subdomain, status: ShopStatus.ACTIVE } }) : null;
    if (!shop) throw new NotFoundException('Store not found');
    return shop;
  }

  private async buyerOrder(shopId: string, input: OrderAccessInput): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: input.orderId, shopId, accessToken: input.token } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /** Takes stock for every line in one go, or fails with a message the buyer can act on. */
  private async reserveStock(manager: EntityManager, shop: Shop, lines: CartLineInput[]): Promise<OrderItem[]> {
    const variants = await manager.find(ProductVariant, {
      where: { id: In(lines.map((l) => l.variantId)), shopId: shop.id },
      relations: { product: true },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));
    const items: OrderItem[] = [];

    for (const line of lines) {
      const variant = byId.get(line.variantId);
      if (!variant || variant.product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException('Some items in your cart are no longer available. Please review your cart.');
      }
      const label = variant.title ? `${variant.product.title} (${variant.title})` : variant.product.title;
      if (variant.stock !== null) {
        const result = await manager
          .createQueryBuilder()
          .update(ProductVariant)
          .set({ stock: () => `"stock" - ${line.quantity}` })
          .where('id = :id AND "stock" >= :quantity', { id: variant.id, quantity: line.quantity })
          .execute();
        if (!result.affected) {
          const fresh = await manager.findOne(ProductVariant, { where: { id: variant.id } });
          const left = fresh?.stock ?? 0;
          throw new ConflictException(left > 0 ? `Only ${left} left of ${label}` : `${label} is sold out`);
        }
      }
      items.push({
        productId: variant.productId,
        variantId: variant.id,
        handle: variant.product.handle,
        title: variant.product.title,
        variantTitle: variant.title,
        image: variant.product.images[0] ?? null,
        unitPrice: variant.price,
        quantity: line.quantity,
        lineTotal: variant.price * line.quantity,
        gstRate: variant.product.gstRate ?? shop.defaultGstRate,
        hsnCode: variant.product.hsnCode,
      });
    }
    await this.refreshProductStock(manager, [...new Set(variants.map((v) => v.productId))]);
    return items;
  }

  private async restock(manager: EntityManager, order: Order): Promise<void> {
    for (const item of order.items) {
      if (!item.variantId) continue;
      await manager
        .createQueryBuilder()
        .update(ProductVariant)
        .set({ stock: () => `"stock" + ${item.quantity}` })
        .where('id = :id AND "stock" IS NOT NULL', { id: item.variantId })
        .execute();
    }
    const productIds = order.items.map((i) => i.productId).filter((id): id is string => !!id);
    await this.refreshProductStock(manager, [...new Set(productIds)]);
  }

  private async refreshProductStock(manager: EntityManager, productIds: string[]): Promise<void> {
    if (!productIds.length) return;
    await manager.query(
      `UPDATE "products" p SET "stock" = CASE
         WHEN EXISTS (SELECT 1 FROM "product_variants" v WHERE v."productId" = p."id" AND v."stock" IS NULL) THEN NULL
         ELSE (SELECT COALESCE(SUM(v."stock"), 0) FROM "product_variants" v WHERE v."productId" = p."id")
       END
       WHERE p."id" = ANY($1)`,
      [productIds],
    );
  }

  private async nextSeq(manager: EntityManager, shopId: string, column: 'orderSeq' | 'invoiceSeq'): Promise<number> {
    const result = await manager.query(
      `UPDATE "shops" SET "${column}" = "${column}" + 1 WHERE "id" = $1 RETURNING "${column}" AS seq`,
      [shopId],
    );
    const rows: { seq: number }[] = Array.isArray(result[0]) ? result[0] : result;
    return rows[0].seq;
  }

  private async nextInvoiceNumber(manager: EntityManager, shopId: string): Promise<string> {
    const seq = await this.nextSeq(manager, shopId, 'invoiceSeq');
    return `${financialYear(new Date())}/${String(seq).padStart(5, '0')}`;
  }

  private async markPaid(shop: Shop, orderId: string, paymentId: string): Promise<Order> {
    const { order, outcome } = await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOneOrFail(Order, { where: { id: orderId }, lock: { mode: 'pessimistic_write' } });
      if (locked.paymentStatus === PaymentStatus.PAID) return { order: locked, outcome: 'already' as const };
      locked.paymentStatus = PaymentStatus.PAID;
      locked.paidAt = new Date();
      locked.gatewayPaymentId = paymentId;
      if (locked.status !== OrderStatus.PENDING_PAYMENT) {
        // Paid after the payment window closed and the order was cancelled.
        return { order: await manager.save(locked), outcome: 'late' as const };
      }
      locked.status = OrderStatus.PLACED;
      locked.expiresAt = null;
      locked.invoiceNumber = await this.nextInvoiceNumber(manager, shop.id);
      return { order: await manager.save(locked), outcome: 'placed' as const };
    });

    if (outcome === 'placed') {
      this.logger.logWithBindings('info', { shopId: shop.id, orderId }, 'Order paid');
      this.notifications.orderPlaced(shop, order);
    }
    if (outcome === 'late') {
      this.logger.logWithBindings('warn', { shopId: shop.id, orderId }, 'Payment arrived for a cancelled order; refunding');
      const refunded = await this.refundIfPaid(shop, order);
      this.notifications.orderCancelled(shop, refunded);
      return refunded;
    }
    return order;
  }

  private async refundIfPaid(shop: Shop, order: Order): Promise<Order> {
    if (order.paymentStatus !== PaymentStatus.PAID || order.paymentMethod !== PaymentMethod.ONLINE || !order.gatewayPaymentId) {
      return order;
    }
    const gateway = this.payments.forShop(shop);
    if (!gateway || gateway.name !== order.gateway) {
      this.logger.logWithBindings('error', { orderId: order.id }, 'Cannot refund: payment gateway is no longer set up');
      return order;
    }
    try {
      await gateway.refund(order.gatewayPaymentId, order.total);
      await this.orders.update({ id: order.id }, { paymentStatus: PaymentStatus.REFUNDED });
      return { ...order, paymentStatus: PaymentStatus.REFUNDED };
    } catch (error) {
      this.logger.logWithBindings('error', { orderId: order.id, error: (error as Error).message }, 'Refund failed');
      return order;
    }
  }

  /** Cancels and restocks if the order is still in one of `from`; returns null otherwise. */
  private async cancelInternal(orderId: string, from: OrderStatus[]): Promise<Order | null> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId }, lock: { mode: 'pessimistic_write' } });
      if (!order || !from.includes(order.status)) return null;
      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.expiresAt = null;
      await this.restock(manager, order);
      return manager.save(order);
    });
  }

  private async transition(
    shopId: string,
    orderId: string,
    from: OrderStatus[],
    apply: (order: Order) => void,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId, shopId }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException('Order not found');
      if (!from.includes(order.status)) {
        throw new ConflictException(`This order is ${order.status.toLowerCase().replace('_', ' ')} and can't be changed that way`);
      }
      apply(order);
      return manager.save(order);
    });
  }

  async cancelExpired(): Promise<number> {
    const expired = await this.orders.find({
      select: { id: true },
      where: { status: OrderStatus.PENDING_PAYMENT, expiresAt: LessThan(new Date()) },
      take: 50,
    });
    let cancelled = 0;
    for (const { id } of expired) {
      if (await this.cancelInternal(id, [OrderStatus.PENDING_PAYMENT])) cancelled++;
    }
    if (cancelled) this.logger.logWithBindings('info', { cancelled }, 'Released stock from unpaid orders');
    return cancelled;
  }

  private async rateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
    const redisKey = `ratelimit:${key}`;
    const count = await this.redis.incr(redisKey);
    if (count === 1) await this.redis.expire(redisKey, windowSeconds);
    if (count !== null && count > limit) {
      throw new HttpException('Too many orders from this device. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}

function mergeLines(lines: CartLineInput[]): CartLineInput[] {
  const merged = new Map<string, number>();
  for (const line of lines) merged.set(line.variantId, (merged.get(line.variantId) ?? 0) + line.quantity);
  // A fixed order keeps concurrent checkouts from deadlocking on the same rows.
  return [...merged].sort(([a], [b]) => a.localeCompare(b)).map(([variantId, quantity]) => ({ variantId, quantity }));
}
