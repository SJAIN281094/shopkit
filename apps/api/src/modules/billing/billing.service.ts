import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CustomLoggerService } from '@arhaminnovations/nestjs-pino-logger';
import { formatInr } from '@shopkit/commerce';
import {
  BillingKind,
  BillingPayment,
  BillingStatus,
  Product,
  Shop,
  ShopPlan,
  ShopRole,
} from '../../entities';
import { PaymentsService } from '../payments/payments.service';
import type { TestPaymentResult } from '../orders/orders.types';
import type { BillingCheckout, BillingOverview, ConfirmBillingPaymentInput } from './billing.types';
import { activePlan, CREDIT_PACKS, PLAN_PERIOD_DAYS, PLANS } from './plans';

const DAY_MS = 86_400_000;

@Injectable()
export class BillingService {
  private readonly logger: CustomLoggerService;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BillingPayment) private readonly billing: Repository<BillingPayment>,
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly payments: PaymentsService,
    logger: CustomLoggerService,
  ) {
    this.logger = logger.forContext(BillingService.name);
  }

  async overview(shopId: string): Promise<BillingOverview> {
    const shop = await this.shops.findOneByOrFail({ id: shopId });
    const plan = activePlan(shop);
    return {
      plan,
      planExpiresAt: plan.plan === ShopPlan.FREE ? null : shop.planExpiresAt,
      aiCreditsBalance: shop.aiCreditsBalance,
      productCount: await this.products.count({ where: { shopId } }),
      plans: Object.values(PLANS),
      creditPacks: [...CREDIT_PACKS],
      payments: await this.billing.find({
        where: { shopId, status: BillingStatus.PAID },
        order: { createdAt: 'DESC' },
        take: 50,
      }),
    };
  }

  startPlanPurchase(shop: Shop, role: ShopRole, userId: string, plan: ShopPlan): Promise<BillingCheckout> {
    if (plan === ShopPlan.FREE) throw new BadRequestException('The Free plan needs no payment');
    const definition = PLANS[plan];
    return this.start(shop, role, userId, {
      kind: BillingKind.PLAN,
      plan,
      credits: definition.aiCredits,
      amount: definition.price,
      description: `${definition.name} plan · ${PLAN_PERIOD_DAYS} days`,
    });
  }

  startCreditPurchase(shop: Shop, role: ShopRole, userId: string, packKey: string): Promise<BillingCheckout> {
    const pack = CREDIT_PACKS.find((p) => p.key === packKey);
    if (!pack) throw new BadRequestException('Unknown credit pack');
    return this.start(shop, role, userId, {
      kind: BillingKind.AI_CREDITS,
      plan: null,
      credits: pack.credits,
      amount: pack.price,
      description: `${pack.credits} AI credits`,
    });
  }

  async confirm(shopId: string, input: ConfirmBillingPaymentInput): Promise<BillingOverview> {
    const payment = await this.billing.findOne({ where: { id: input.billingPaymentId, shopId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== BillingStatus.PAID) {
      const gateway = this.payments.forPlatform();
      if (!gateway || gateway.name !== payment.gateway) throw new BadRequestException('This payment can no longer be completed');
      if (!gateway.verifyPayment(payment.gatewayOrderId, input.paymentId, input.signature)) {
        throw new BadRequestException('We could not verify this payment. If money was deducted, contact support.');
      }
      await this.applyPayment(payment.id, input.paymentId);
    }
    return this.overview(shopId);
  }

  async simulate(shopId: string, billingPaymentId: string): Promise<TestPaymentResult> {
    const payment = await this.billing.findOne({ where: { id: billingPaymentId, shopId } });
    if (!payment || payment.gateway !== 'test' || !this.payments.testPaymentsAllowed) {
      throw new BadRequestException('Test payments are not available');
    }
    return this.payments.simulateTestPayment(payment.gatewayOrderId);
  }

  /** From the platform Razorpay webhook. */
  async handleGatewayPayment(gatewayOrderId: string, paymentId: string): Promise<void> {
    const payment = await this.billing.findOne({ where: { gatewayOrderId } });
    if (payment && payment.status !== BillingStatus.PAID) await this.applyPayment(payment.id, paymentId);
  }

  private async start(
    shop: Shop,
    role: ShopRole,
    userId: string,
    purchase: Pick<BillingPayment, 'kind' | 'plan' | 'credits' | 'amount'> & { description: string },
  ): Promise<BillingCheckout> {
    if (role === ShopRole.STAFF) throw new ForbiddenException('Only the store owner or admins can buy plans and credits');
    const gateway = this.payments.forPlatform();
    if (!gateway) throw new ServiceUnavailableException('Payments are not set up yet. Please try again later.');

    let order;
    try {
      order = await gateway.createOrder(purchase.amount, `billing_${shop.subdomain}_${Date.now()}`, {
        shopId: shop.id,
        kind: purchase.kind,
      });
    } catch (error) {
      this.logger.logWithBindings('error', { shopId: shop.id, error: (error as Error).message }, 'Billing order failed');
      throw new ServiceUnavailableException('Could not start the payment. Please try again.');
    }
    const payment = await this.billing.save(
      this.billing.create({
        shopId: shop.id,
        userId,
        kind: purchase.kind,
        plan: purchase.plan,
        credits: purchase.credits,
        amount: purchase.amount,
        gateway: gateway.name,
        gatewayOrderId: order.id,
      }),
    );
    return {
      billingPaymentId: payment.id,
      gateway: gateway.name,
      keyId: gateway.keyId,
      gatewayOrderId: order.id,
      amount: purchase.amount,
      description: `${purchase.description} — ${formatInr(purchase.amount)}`,
    };
  }

  private async applyPayment(billingPaymentId: string, gatewayPaymentId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(BillingPayment, {
        where: { id: billingPaymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment || payment.status === BillingStatus.PAID) return;
      const shop = await manager.findOne(Shop, { where: { id: payment.shopId }, lock: { mode: 'pessimistic_write' } });
      if (!shop) return;

      payment.status = BillingStatus.PAID;
      payment.paidAt = new Date();
      payment.gatewayPaymentId = gatewayPaymentId;
      await manager.save(payment);

      const changes: Partial<Shop> = { aiCreditsBalance: shop.aiCreditsBalance + payment.credits };
      if (payment.kind === BillingKind.PLAN && payment.plan) {
        const now = Date.now();
        const current = activePlan(shop);
        // Renewing the same plan adds time; switching plans starts a fresh period.
        const from = current.plan === payment.plan && shop.planExpiresAt ? shop.planExpiresAt.getTime() : now;
        changes.plan = payment.plan;
        changes.planExpiresAt = new Date(Math.max(from, now) + PLAN_PERIOD_DAYS * DAY_MS);
      }
      await manager.update(Shop, { id: shop.id }, changes);
    });
    this.logger.logWithBindings('info', { billingPaymentId }, 'Billing payment applied');
  }
}
