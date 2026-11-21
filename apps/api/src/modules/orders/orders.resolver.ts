import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Context, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../../config/configuration';
import { GqlJwtAuthGuard } from '@arhaminnovations/nestjs-identity';
import { CurrentShop } from '../../common/current-shop.decorator';
import type { ShopContext } from '../../common/request.util';
import { ShopAccessGuard } from '../../common/shop-access.guard';
import { Order } from '../../entities';
import { OrdersService } from './orders.service';
import {
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

export const CLIENT_IP_HEADER = 'x-shopkit-client-ip';
export const STOREFRONT_KEY_HEADER = 'x-shopkit-storefront-key';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

@Resolver()
export class OrdersResolver {
  private readonly storefrontKey: string;

  constructor(
    private readonly ordersService: OrdersService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.storefrontKey = config.get('storefrontApiKey', { infer: true });
  }

  /** The storefront calls us from its server, so it passes the buyer's IP along with a shared key. */
  private clientIp(req: Request): string {
    const forwarded = req.headers[CLIENT_IP_HEADER];
    const key = req.headers[STOREFRONT_KEY_HEADER];
    if (typeof forwarded === 'string' && typeof key === 'string' && safeEqual(key, this.storefrontKey)) {
      return forwarded.slice(0, 64);
    }
    return req.ip ?? 'unknown';
  }

  // ---- Buyer (public, by store host) ----

  @Mutation(() => PlaceOrderResult)
  placeOrder(
    @Args('host') host: string,
    @Args('input') input: PlaceOrderInput,
    @Context('req') req: Request,
  ): Promise<PlaceOrderResult> {
    return this.ordersService.placeOrder(host, input, this.clientIp(req));
  }

  @Mutation(() => Order, { description: 'Verifies the Razorpay signature and marks the order paid' })
  confirmOrderPayment(@Args('host') host: string, @Args('input') input: ConfirmPaymentInput): Promise<Order> {
    return this.ordersService.confirmPayment(host, input);
  }

  @Mutation(() => TestPaymentResult, { description: 'Development only: pays an order on the test gateway' })
  simulateTestPayment(@Args('host') host: string, @Args('input') input: OrderAccessInput): Promise<TestPaymentResult> {
    return this.ordersService.simulateTestPayment(host, input);
  }

  @Mutation(() => PaymentRequest, { description: 'Payment details for an order still awaiting payment' })
  resumeOrderPayment(@Args('host') host: string, @Args('input') input: OrderAccessInput): Promise<PaymentRequest> {
    return this.ordersService.resumePayment(host, input);
  }

  @Query(() => Order)
  storefrontOrder(@Args('host') host: string, @Args('input') input: OrderAccessInput): Promise<Order> {
    return this.ordersService.storefrontOrder(host, input);
  }

  // ---- Seller ----

  @Query(() => [Order])
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  orders(
    @CurrentShop() { shop }: ShopContext,
    @Args('filter', { type: () => OrderFilter, nullable: true }) filter?: OrderFilter,
  ): Promise<Order[]> {
    return this.ordersService.listOrders(shop.id, filter ?? {});
  }

  @Query(() => Order)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  order(@CurrentShop() { shop }: ShopContext, @Args('id', { type: () => ID }, ParseUUIDPipe) id: string): Promise<Order> {
    return this.ordersService.getOrder(shop.id, id);
  }

  @Query(() => OrderCounts)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  orderCounts(@CurrentShop() { shop }: ShopContext): Promise<OrderCounts> {
    return this.ordersService.orderCounts(shop.id);
  }

  @Mutation(() => Order, { description: 'Also used to update tracking details' })
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  markOrderShipped(@CurrentShop() { shop }: ShopContext, @Args('input') input: ShipOrderInput): Promise<Order> {
    return this.ordersService.markShipped(shop, input);
  }

  @Mutation(() => Order, { description: 'Cash-on-delivery orders are marked paid' })
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  markOrderDelivered(
    @CurrentShop() { shop }: ShopContext,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.ordersService.markDelivered(shop, id);
  }

  @Mutation(() => Order, { description: 'Restocks items and refunds online payments' })
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  cancelOrder(
    @CurrentShop() { shop }: ShopContext,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.ordersService.cancelOrder(shop, id);
  }
}
