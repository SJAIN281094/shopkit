import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, GqlJwtAuthGuard, type JwtPayload } from '@arhaminnovations/nestjs-identity';
import { CurrentShop } from '../../common/current-shop.decorator';
import type { ShopContext } from '../../common/request.util';
import { ShopAccessGuard } from '../../common/shop-access.guard';
import { AiFeature, Collection, Product } from '../../entities';
import { AI_CREDIT_COSTS } from '../ai/ai.service';
import { StorefrontService } from '../storefront/storefront.service';
import { CatalogService, STOREFRONT_PAGE_LIMIT } from './catalog.service';
import {
  CollectionInput,
  GenerateListingInput,
  ProductFilter,
  ProductInput,
  ProductListingSuggestion,
  StorefrontCollectionPage,
} from './catalog.types';

@Resolver()
export class CatalogResolver {
  constructor(
    private readonly catalog: CatalogService,
    private readonly storefrontService: StorefrontService,
  ) {}

  // ---- Admin ----

  @Query(() => [Collection])
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  collections(@CurrentShop() { shop }: ShopContext): Promise<Collection[]> {
    return this.catalog.listCollections(shop.id);
  }

  @Mutation(() => Collection)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  createCollection(@CurrentShop() { shop }: ShopContext, @Args('input') input: CollectionInput): Promise<Collection> {
    return this.catalog.createCollection(shop.id, input);
  }

  @Mutation(() => Collection)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  updateCollection(
    @CurrentShop() { shop }: ShopContext,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input') input: CollectionInput,
  ): Promise<Collection> {
    return this.catalog.updateCollection(shop.id, id, input);
  }

  @Mutation(() => Boolean, { description: 'Products in the collection are kept, just unassigned' })
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  deleteCollection(
    @CurrentShop() { shop }: ShopContext,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    return this.catalog.deleteCollection(shop.id, id);
  }

  @Query(() => [Product])
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  products(
    @CurrentShop() { shop }: ShopContext,
    @Args('filter', { type: () => ProductFilter, nullable: true }) filter?: ProductFilter,
  ): Promise<Product[]> {
    return this.catalog.listProducts(shop.id, filter ?? {});
  }

  @Query(() => Product)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  product(
    @CurrentShop() { shop }: ShopContext,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<Product> {
    return this.catalog.getProduct(shop.id, id);
  }

  @Mutation(() => Product)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  createProduct(@CurrentShop() { shop }: ShopContext, @Args('input') input: ProductInput): Promise<Product> {
    return this.catalog.createProduct(shop, input);
  }

  @Mutation(() => Product)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  updateProduct(
    @CurrentShop() { shop }: ShopContext,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
    @Args('input') input: ProductInput,
  ): Promise<Product> {
    return this.catalog.updateProduct(shop.id, id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  deleteProduct(
    @CurrentShop() { shop }: ShopContext,
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<boolean> {
    return this.catalog.deleteProduct(shop.id, id);
  }

  @Query(() => Int, { description: 'AI credits charged for one product listing suggestion' })
  aiProductListingCost(): number {
    return AI_CREDIT_COSTS[AiFeature.PRODUCT_LISTING];
  }

  @Mutation(() => ProductListingSuggestion, { description: 'Uses AI credits. Drafts a title and description from a photo' })
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  generateProductListing(
    @CurrentUser() user: JwtPayload,
    @CurrentShop() { shop }: ShopContext,
    @Args('input') input: GenerateListingInput,
  ): Promise<ProductListingSuggestion> {
    return this.catalog.suggestListing(shop, user.id, input);
  }

  // ---- Storefront (public) ----

  @Query(() => [Product], { description: 'Active products for a store, newest first unless sorted' })
  async storefrontProducts(
    @Args('host') host: string,
    @Args('collectionHandle', { type: () => String, nullable: true }) collectionHandle: string | null,
    @Args('limit', { type: () => Int, defaultValue: 12 }) limit: number,
    @Args('sort', { defaultValue: 'newest', description: 'newest, price-asc, price-desc or name' }) sort: string,
  ): Promise<Product[]> {
    const shopId = await this.shopIdForHost(host);
    return shopId ? (await this.catalog.storefrontProducts(shopId, collectionHandle, limit, { sort })).products : [];
  }

  @Query(() => Product, { nullable: true })
  async storefrontProduct(@Args('host') host: string, @Args('handle') handle: string): Promise<Product | null> {
    const shopId = await this.shopIdForHost(host);
    return shopId ? this.catalog.storefrontProduct(shopId, handle) : null;
  }

  @Query(() => StorefrontCollectionPage, { nullable: true, description: 'Use handle "all" for every product' })
  async storefrontCollection(
    @Args('host') host: string,
    @Args('handle') handle: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('pageSize', { type: () => Int, defaultValue: STOREFRONT_PAGE_LIMIT }) pageSize: number,
    @Args('sort', { defaultValue: 'newest', description: 'newest, price-asc, price-desc or name' }) sort: string,
  ): Promise<StorefrontCollectionPage | null> {
    const shopId = await this.shopIdForHost(host);
    if (!shopId) return null;
    const collection = await this.catalog.storefrontCollection(shopId, handle);
    if (!collection) return null;
    const size = Math.min(Math.max(pageSize, 1), STOREFRONT_PAGE_LIMIT);
    const { products, total } = await this.catalog.storefrontProducts(shopId, handle, size, { sort, page });
    return { collection, products, total, page: Math.max(page, 1), pageSize: size };
  }

  private async shopIdForHost(host: string): Promise<string | null> {
    const storefront = await this.storefrontService.resolve(host);
    return storefront?.shop.id ?? null;
  }
}
