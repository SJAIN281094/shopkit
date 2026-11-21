import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { GST_RATES, MAX_OPTION_VALUES, MAX_PRODUCT_OPTIONS, MAX_VARIANTS } from '@shopkit/commerce';
import { Collection, Product, ProductStatus } from '../../entities';

/** ₹1 crore, in paise. */
export const MAX_PRICE = 1_000_000_000;
export const MAX_PRODUCT_IMAGES = 8;
const MAX_STOCK = 1_000_000;

@InputType()
export class CollectionInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @Field({ defaultValue: '' })
  @IsString()
  @MaxLength(1000)
  description: string;
}

@InputType()
export class ProductOptionInput {
  @Field({ description: 'e.g. "Size"' })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  name: string;

  @Field(() => [String], { description: 'e.g. ["S", "M", "L"]' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_OPTION_VALUES)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  values: string[];
}

@InputType()
export class ProductVariantInput {
  @Field(() => [String], { description: 'One value per product option, in option order' })
  @IsArray()
  @IsString({ each: true })
  optionValues: string[];

  @Field(() => Int, { description: 'In paise' })
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  price: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PRICE)
  compareAtPrice?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK)
  stock?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string | null;
}

@InputType()
export class ProductInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @Field({ defaultValue: '' })
  @IsString()
  @MaxLength(5000)
  description: string;

  @Field(() => Int, { nullable: true, description: 'In paise. Required when the product has no options' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  price?: number | null;

  @Field(() => Int, { nullable: true, description: 'In paise; must be higher than price' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PRICE)
  compareAtPrice?: number | null;

  @Field(() => Int, { nullable: true, description: 'Leave empty to sell without tracking stock' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK)
  stock?: number | null;

  @Field(() => [ProductOptionInput], { defaultValue: [] })
  @IsArray()
  @ArrayMaxSize(MAX_PRODUCT_OPTIONS)
  @ValidateNested({ each: true })
  @Type(() => ProductOptionInput)
  options: ProductOptionInput[];

  @Field(() => [ProductVariantInput], { defaultValue: [], description: 'Required when the product has options' })
  @IsArray()
  @ArrayMaxSize(MAX_VARIANTS)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInput)
  variants: ProductVariantInput[];

  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @ArrayMaxSize(MAX_PRODUCT_IMAGES)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false }, { each: true })
  images: string[];

  @Field(() => ProductStatus, { defaultValue: ProductStatus.ACTIVE })
  @IsEnum(ProductStatus)
  status: ProductStatus;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  collectionId?: string | null;

  @Field(() => Int, { nullable: true, description: 'GST %; leave empty to use the store default' })
  @IsOptional()
  @IsIn(GST_RATES)
  gstRate?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(/^[0-9]{4,8}$/, { message: 'HSN code is 4 to 8 digits' })
  hsnCode?: string | null;
}

@InputType()
export class ProductFilter {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @Field(() => ProductStatus, { nullable: true })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  collectionId?: string;
}

@InputType()
export class GenerateListingInput {
  @Field({ description: 'URL returned by POST /uploads/images for this store' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  imageUrl: string;

  @Field({ defaultValue: '', description: 'Optional words about the product, e.g. "blue cotton kurta"' })
  @IsString()
  @MaxLength(300)
  hint: string;
}

@ObjectType()
export class ProductListingSuggestion {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => ID, { nullable: true, description: 'An existing collection that fits, if any' })
  collectionId: string | null;
}

@ObjectType()
export class StorefrontCollectionPage {
  @Field(() => Collection)
  collection: Collection;

  @Field(() => [Product], { description: 'Products on this page' })
  products: Product[];

  @Field(() => Int, { description: 'Products in the whole collection' })
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;
}
