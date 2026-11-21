import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GqlJwtAuthGuard } from '@arhaminnovations/nestjs-identity';
import { CurrentShop } from '../../common/current-shop.decorator';
import type { ShopContext } from '../../common/request.util';
import { ShopAccessGuard } from '../../common/shop-access.guard';
import { SettingsService } from './settings.service';
import {
  BusinessSettingsInput,
  CheckoutSettingsInput,
  CustomDomainInput,
  PaymentSettingsInput,
  ShopSettings,
  StoreSettingsInput,
} from './settings.types';

@Resolver()
@UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
export class SettingsResolver {
  constructor(private readonly settings: SettingsService) {}

  @Query(() => ShopSettings)
  shopSettings(@CurrentShop() { shop }: ShopContext): ShopSettings {
    return this.settings.toSettings(shop);
  }

  @Mutation(() => ShopSettings)
  updateStoreSettings(@CurrentShop() { shop }: ShopContext, @Args('input') input: StoreSettingsInput): Promise<ShopSettings> {
    return this.settings.updateStore(shop, input);
  }

  @Mutation(() => ShopSettings)
  updateCheckoutSettings(
    @CurrentShop() { shop }: ShopContext,
    @Args('input') input: CheckoutSettingsInput,
  ): Promise<ShopSettings> {
    return this.settings.updateCheckout(shop, input);
  }

  @Mutation(() => ShopSettings)
  updatePaymentSettings(
    @CurrentShop() { shop, role }: ShopContext,
    @Args('input') input: PaymentSettingsInput,
  ): Promise<ShopSettings> {
    return this.settings.updatePayments(shop, role, input);
  }

  @Mutation(() => ShopSettings)
  updateBusinessSettings(
    @CurrentShop() { shop }: ShopContext,
    @Args('input') input: BusinessSettingsInput,
  ): Promise<ShopSettings> {
    return this.settings.updateBusiness(shop, input);
  }

  @Mutation(() => ShopSettings)
  setCustomDomain(@CurrentShop() { shop, role }: ShopContext, @Args('input') input: CustomDomainInput): Promise<ShopSettings> {
    return this.settings.setCustomDomain(shop, role, input.domain);
  }

  @Mutation(() => ShopSettings, { description: 'Checks the _shopkit TXT record' })
  verifyCustomDomain(@CurrentShop() { shop, role }: ShopContext): Promise<ShopSettings> {
    return this.settings.verifyCustomDomain(shop, role);
  }

  @Mutation(() => ShopSettings)
  removeCustomDomain(@CurrentShop() { shop, role }: ShopContext): Promise<ShopSettings> {
    return this.settings.removeCustomDomain(shop, role);
  }
}
