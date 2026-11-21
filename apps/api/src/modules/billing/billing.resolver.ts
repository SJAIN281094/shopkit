import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, GqlJwtAuthGuard, type JwtPayload } from '@arhaminnovations/nestjs-identity';
import { CurrentShop } from '../../common/current-shop.decorator';
import type { ShopContext } from '../../common/request.util';
import { ShopAccessGuard } from '../../common/shop-access.guard';
import { TestPaymentResult } from '../orders/orders.types';
import { BillingService } from './billing.service';
import {
  BillingCheckout,
  BillingOverview,
  BillingPaymentIdInput,
  BuyCreditsInput,
  BuyPlanInput,
  ConfirmBillingPaymentInput,
} from './billing.types';

@Resolver()
@UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
export class BillingResolver {
  constructor(private readonly billing: BillingService) {}

  @Query(() => BillingOverview)
  billingOverview(@CurrentShop() { shop }: ShopContext): Promise<BillingOverview> {
    return this.billing.overview(shop.id);
  }

  @Mutation(() => BillingCheckout)
  buyPlan(
    @CurrentUser() user: JwtPayload,
    @CurrentShop() { shop, role }: ShopContext,
    @Args('input') input: BuyPlanInput,
  ): Promise<BillingCheckout> {
    return this.billing.startPlanPurchase(shop, role, user.id, input.plan);
  }

  @Mutation(() => BillingCheckout)
  buyAiCredits(
    @CurrentUser() user: JwtPayload,
    @CurrentShop() { shop, role }: ShopContext,
    @Args('input') input: BuyCreditsInput,
  ): Promise<BillingCheckout> {
    return this.billing.startCreditPurchase(shop, role, user.id, input.packKey);
  }

  @Mutation(() => BillingOverview)
  confirmBillingPayment(
    @CurrentShop() { shop }: ShopContext,
    @Args('input') input: ConfirmBillingPaymentInput,
  ): Promise<BillingOverview> {
    return this.billing.confirm(shop.id, input);
  }

  @Mutation(() => TestPaymentResult, { description: 'Development only' })
  simulateBillingPayment(
    @CurrentShop() { shop }: ShopContext,
    @Args('input') input: BillingPaymentIdInput,
  ): Promise<TestPaymentResult> {
    return this.billing.simulate(shop.id, input.billingPaymentId);
  }
}
