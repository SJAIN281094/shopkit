import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, GqlJwtAuthGuard, type JwtPayload } from '@arhaminnovations/nestjs-identity';
import { CurrentShop } from '../../common/current-shop.decorator';
import type { ShopContext } from '../../common/request.util';
import { ShopAccessGuard } from '../../common/shop-access.guard';
import { Shop } from '../../entities';
import { ShopService } from './shop.service';
import { CreateShopInput, MyShop, SubdomainAvailability } from './shop.types';

@Resolver()
@UseGuards(GqlJwtAuthGuard)
export class ShopResolver {
  constructor(private readonly shops: ShopService) {}

  @Query(() => [MyShop])
  myShops(@CurrentUser() user: JwtPayload): Promise<MyShop[]> {
    return this.shops.myShops(user.id);
  }

  @Query(() => SubdomainAvailability)
  subdomainAvailability(@Args('subdomain') subdomain: string): Promise<SubdomainAvailability> {
    return this.shops.checkSubdomain(subdomain);
  }

  @Mutation(() => Shop)
  createShop(@CurrentUser() user: JwtPayload, @Args('input') input: CreateShopInput): Promise<Shop> {
    return this.shops.createShop(user.id, input);
  }

  @Query(() => Shop, { description: 'The store selected by the x-shop-id header' })
  @UseGuards(ShopAccessGuard)
  currentShop(@CurrentShop() { shop }: ShopContext): Shop {
    return shop;
  }
}
