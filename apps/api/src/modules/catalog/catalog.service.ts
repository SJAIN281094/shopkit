import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsOrder, FindOptionsWhere, ILike, In, Like, Repository } from 'typeorm';
import { variantKey, variantTitle } from '@shopkit/commerce';
import type { ProductListSort } from '@shopkit/themes';
import { Collection, Product, ProductStatus, ProductVariant, Shop } from '../../entities';
import { AiService } from '../ai/ai.service';
import { activePlan } from '../billing/plans';
import { StorageService } from '../storage/storage.service';
import type {
  CollectionInput,
  GenerateListingInput,
  ProductFilter,
  ProductInput,
  ProductListingSuggestion,
} from './catalog.types';
import { toHandle, uniqueHandle } from './handle.util';

const ADMIN_LIST_LIMIT = 200;
export const STOREFRONT_PAGE_LIMIT = 48;
export const ALL_PRODUCTS_HANDLE = 'all';

const PRODUCT_RELATIONS = { collection: true, variants: true } as const;
const SORT_ORDERS: Record<ProductListSort, FindOptionsOrder<Product>> = {
  newest: { createdAt: 'DESC' },
  'price-asc': { price: 'ASC', createdAt: 'DESC' },
  'price-desc': { price: 'DESC', createdAt: 'DESC' },
  name: { title: 'ASC' },
};
const VARIANT_ORDER = { variants: { position: 'ASC' } } as const;

type VariantFields = Pick<ProductVariant, 'optionValues' | 'title' | 'price' | 'compareAtPrice' | 'stock' | 'sku' | 'position'>;

@Injectable()
export class CatalogService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Collection) private readonly collections: Repository<Collection>,
    private readonly storage: StorageService,
    private readonly ai: AiService,
  ) {}

  // ---- Collections ----

  listCollections(shopId: string): Promise<Collection[]> {
    return this.collections.find({ where: { shopId }, order: { name: 'ASC' } });
  }

  async createCollection(shopId: string, input: CollectionInput): Promise<Collection> {
    const name = input.name.trim();
    const base = toHandle(name, 'collection');
    if (base === ALL_PRODUCTS_HANDLE) throw new BadRequestException('"All" is reserved. Pick another name.');
    const handle = uniqueHandle(base, await this.takenHandles(this.collections, shopId, base));
    return this.collections.save(
      this.collections.create({ shopId, name, handle, description: input.description.trim() }),
    );
  }

  async updateCollection(shopId: string, id: string, input: CollectionInput): Promise<Collection> {
    const collection = await this.getCollection(shopId, id);
    collection.name = input.name.trim();
    collection.description = input.description.trim();
    return this.collections.save(collection);
  }

  async deleteCollection(shopId: string, id: string): Promise<boolean> {
    const result = await this.collections.delete({ id, shopId });
    if (!result.affected) throw new NotFoundException('Collection not found');
    return true;
  }

  private async getCollection(shopId: string, id: string): Promise<Collection> {
    const collection = await this.collections.findOne({ where: { id, shopId } });
    if (!collection) throw new NotFoundException('Collection not found');
    return collection;
  }

  // ---- Products ----

  listProducts(shopId: string, filter: ProductFilter = {}): Promise<Product[]> {
    const where: FindOptionsWhere<Product> = { shopId };
    if (filter.status) where.status = filter.status;
    if (filter.collectionId) where.collectionId = filter.collectionId;
    const search = filter.search?.trim();
    if (search) where.title = ILike(`%${search.replace(/[%_\\]/g, '\\$&')}%`);
    return this.products.find({
      where,
      relations: PRODUCT_RELATIONS,
      order: { createdAt: 'DESC', ...VARIANT_ORDER },
      take: ADMIN_LIST_LIMIT,
    });
  }

  async getProduct(shopId: string, id: string): Promise<Product> {
    const product = await this.products.findOne({
      where: { id, shopId },
      relations: PRODUCT_RELATIONS,
      order: VARIANT_ORDER,
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(shop: Shop, input: ProductInput): Promise<Product> {
    const plan = activePlan(shop);
    if ((await this.products.count({ where: { shopId: shop.id } })) >= plan.maxProducts) {
      throw new ForbiddenException(
        `The ${plan.name} plan allows up to ${plan.maxProducts} products. Upgrade your plan to add more.`,
      );
    }
    const { fields, variants } = await this.validateProduct(shop.id, input);
    const base = toHandle(fields.title, 'product');
    const handle = uniqueHandle(base, await this.takenHandles(this.products, shop.id, base));

    const id = await this.dataSource.transaction(async (manager) => {
      const product = await manager.save(
        manager.create(Product, { shopId: shop.id, handle, ...fields, ...summarize(variants) }),
      );
      await manager.save(variants.map((v) => manager.create(ProductVariant, { ...v, productId: product.id, shopId: shop.id })));
      return product.id;
    });
    return this.getProduct(shop.id, id);
  }

  async updateProduct(shopId: string, id: string, input: ProductInput): Promise<Product> {
    const product = await this.getProduct(shopId, id);
    const { fields, variants } = await this.validateProduct(shopId, input);
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Product, { id: product.id, shopId }, { ...fields, ...summarize(variants) });
      await this.syncVariants(manager, product, variants);
    });
    return this.getProduct(shopId, id);
  }

  async deleteProduct(shopId: string, id: string): Promise<boolean> {
    const result = await this.products.delete({ id, shopId });
    if (!result.affected) throw new NotFoundException('Product not found');
    return true;
  }

  /** Keeps variant ids stable across edits by matching on option values. */
  private async syncVariants(manager: EntityManager, product: Product, next: VariantFields[]): Promise<void> {
    const existing = new Map(product.variants.map((v) => [variantKey(v.optionValues), v]));
    const keep = new Set<string>();
    for (const fields of next) {
      const match = existing.get(variantKey(fields.optionValues));
      if (match) {
        keep.add(match.id);
        await manager.update(ProductVariant, { id: match.id }, fields);
      } else {
        await manager.save(manager.create(ProductVariant, { ...fields, productId: product.id, shopId: product.shopId }));
      }
    }
    const removed = product.variants.filter((v) => !keep.has(v.id)).map((v) => v.id);
    if (removed.length) await manager.delete(ProductVariant, { id: In(removed) });
  }

  private async validateProduct(shopId: string, input: ProductInput) {
    const collectionId = input.collectionId ?? null;
    if (collectionId) await this.getCollection(shopId, collectionId);

    const images = [...new Set(input.images)];
    if (images.some((url) => !this.storage.isShopUpload(url, shopId))) {
      throw new BadRequestException('Product photos must be uploaded to this store');
    }

    const options = normalizeOptions(input);
    const variants = options.length ? optionVariants(options, input) : [simpleVariant(input)];
    for (const v of variants) {
      if (v.compareAtPrice !== null && v.compareAtPrice <= v.price) {
        const where = v.title ? ` for ${v.title}` : '';
        throw new BadRequestException(`The original price${where} must be higher than the selling price`);
      }
    }

    return {
      fields: {
        title: input.title.trim(),
        description: input.description.trim(),
        images,
        status: input.status,
        collectionId,
        options,
        gstRate: input.gstRate ?? null,
        hsnCode: input.hsnCode?.trim() || null,
      },
      variants,
    };
  }

  async suggestListing(shop: Shop, userId: string, input: GenerateListingInput): Promise<ProductListingSuggestion> {
    if (!this.storage.isShopUpload(input.imageUrl, shop.id)) {
      throw new BadRequestException('Upload the photo to this store first');
    }
    const collections = await this.listCollections(shop.id);
    const listing = await this.ai.generateProductListing(shop, userId, {
      imageUrl: input.imageUrl,
      hint: input.hint,
      collections: collections.map((c) => c.name),
    });
    const match = collections.find((c) => c.name === listing.collectionName);
    return { title: listing.title, description: listing.description, collectionId: match?.id ?? null };
  }

  // ---- Storefront (public, active products only) ----

  async storefrontProducts(
    shopId: string,
    collectionHandle: string | null,
    limit: number,
    { sort = 'newest', page = 1 }: { sort?: string; page?: number } = {},
  ): Promise<{ products: Product[]; total: number }> {
    const take = Math.min(Math.max(limit, 1), STOREFRONT_PAGE_LIMIT);
    const where: FindOptionsWhere<Product> = { shopId, status: ProductStatus.ACTIVE };
    if (collectionHandle && collectionHandle !== ALL_PRODUCTS_HANDLE) {
      where.collection = { handle: collectionHandle };
    }
    // Ordering by a joined column makes TypeORM page over joined rows, not products, so variants are sorted here.
    const [products, total] = await this.products.findAndCount({
      where,
      relations: PRODUCT_RELATIONS,
      order: { ...(SORT_ORDERS[sort as ProductListSort] ?? SORT_ORDERS.newest), id: 'ASC' },
      take,
      skip: (Math.max(Math.floor(page), 1) - 1) * take,
    });
    for (const product of products) product.variants?.sort((a, b) => a.position - b.position);
    return { products, total };
  }

  storefrontProduct(shopId: string, handle: string): Promise<Product | null> {
    return this.products.findOne({
      where: { shopId, handle, status: ProductStatus.ACTIVE },
      relations: PRODUCT_RELATIONS,
      order: VARIANT_ORDER,
    });
  }

  async storefrontCollection(shopId: string, handle: string): Promise<Collection | null> {
    if (handle === ALL_PRODUCTS_HANDLE) {
      return Object.assign(new Collection(), { id: shopId, name: 'All products', handle, description: '' });
    }
    return this.collections.findOne({ where: { shopId, handle } });
  }

  private async takenHandles(
    repo: Repository<Product> | Repository<Collection>,
    shopId: string,
    base: string,
  ): Promise<string[]> {
    const rows = await (repo as Repository<Collection>).find({
      select: { handle: true },
      where: { shopId, handle: Like(`${base}%`) },
    });
    return rows.map((r) => r.handle);
  }
}

function normalizeOptions(input: ProductInput): Product['options'] {
  const seenNames = new Set<string>();
  return input.options.map((option) => {
    const name = option.name.trim();
    if (!name) throw new BadRequestException('Option names cannot be empty');
    if (seenNames.has(name.toLowerCase())) throw new BadRequestException(`The option "${name}" is listed twice`);
    seenNames.add(name.toLowerCase());

    const seenValues = new Set<string>();
    const values = option.values.map((v) => v.trim()).filter(Boolean);
    for (const value of values) {
      if (seenValues.has(value.toLowerCase())) throw new BadRequestException(`"${value}" is listed twice in ${name}`);
      seenValues.add(value.toLowerCase());
    }
    if (!values.length) throw new BadRequestException(`Add at least one value for ${name}`);
    return { name, values };
  });
}

function simpleVariant(input: ProductInput): VariantFields {
  if (input.price === null || input.price === undefined) throw new BadRequestException('Enter a price');
  return {
    optionValues: [],
    title: '',
    price: input.price,
    compareAtPrice: input.compareAtPrice ?? null,
    stock: input.stock ?? null,
    sku: input.variants[0]?.sku?.trim() || null,
    position: 0,
  };
}

function optionVariants(options: Product['options'], input: ProductInput): VariantFields[] {
  if (!input.variants.length) throw new BadRequestException('Add at least one variant');
  const seen = new Set<string>();
  return input.variants.map((variant, position) => {
    if (variant.optionValues.length !== options.length) {
      throw new BadRequestException('Each variant needs a value for every option');
    }
    const optionValues = variant.optionValues.map((raw, i) => {
      const value = options[i].values.find((v) => v.toLowerCase() === raw.trim().toLowerCase());
      if (!value) throw new BadRequestException(`"${raw}" is not one of the ${options[i].name} values`);
      return value;
    });
    const key = variantKey(optionValues);
    if (seen.has(key)) throw new BadRequestException(`${variantTitle(optionValues)} is listed twice`);
    seen.add(key);
    return {
      optionValues,
      title: variantTitle(optionValues),
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      stock: variant.stock ?? null,
      sku: variant.sku?.trim() || null,
      position,
    };
  });
}

/** Product-level price and stock shown in lists: the cheapest variant, and total stock. */
export function summarize(variants: Pick<ProductVariant, 'price' | 'compareAtPrice' | 'stock'>[]) {
  const cheapest = variants.reduce((min, v) => (v.price < min.price ? v : min), variants[0]);
  const stock = variants.some((v) => v.stock === null) ? null : variants.reduce((sum, v) => sum + (v.stock ?? 0), 0);
  return { price: cheapest.price, compareAtPrice: cheapest.compareAtPrice, stock };
}
