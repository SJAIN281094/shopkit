import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseModel } from './base.entity';
import { Collection } from './collection.entity';
import { ProductVariant } from './product-variant.entity';
import { Shop } from './shop.entity';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
}

registerEnumType(ProductStatus, { name: 'ProductStatus' });

@ObjectType()
export class ProductOptionType {
  @Field()
  name: string;

  @Field(() => [String])
  values: string[];
}

@ObjectType()
@Entity('products')
@Index(['shopId', 'handle'], { unique: true })
@Index(['shopId', 'status', 'createdAt'])
export class Product extends BaseModel {
  @Column('uuid')
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @Field()
  @Column({ length: 120 })
  title: string;

  @Field({ description: 'URL slug, e.g. /products/<handle>' })
  @Column({ length: 140 })
  handle: string;

  @Field()
  @Column({ type: 'text', default: '' })
  description: string;

  @Field(() => Int, { description: 'Lowest variant price, in paise' })
  @Column({ type: 'int' })
  price: number;

  @Field(() => Int, { nullable: true, description: 'Original price of the lowest-priced variant; in paise' })
  @Column({ type: 'int', nullable: true })
  compareAtPrice: number | null;

  @Field(() => Int, { nullable: true, description: 'Total units across variants; null if any variant is not tracked' })
  @Column({ type: 'int', nullable: true })
  stock: number | null;

  @Field(() => [String])
  @Column({ type: 'jsonb', default: () => `'[]'` })
  images: string[];

  @Field(() => ProductStatus)
  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Field(() => ID, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  collectionId: string | null;

  @Field(() => Collection, { nullable: true })
  @ManyToOne(() => Collection, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'collectionId' })
  collection: Collection | null;

  @Field(() => [ProductOptionType], { description: 'e.g. Size: S, M, L. Empty for simple products' })
  @Column({ type: 'jsonb', default: () => `'[]'` })
  options: ProductOptionType[];

  @Field(() => [ProductVariant])
  @OneToMany(() => ProductVariant, (v) => v.product, { cascade: false })
  variants: ProductVariant[];

  @Field(() => Int, { nullable: true, description: 'GST %, or null to use the store default' })
  @Column({ type: 'int', nullable: true })
  gstRate: number | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 8, nullable: true })
  hsnCode: string | null;
}
