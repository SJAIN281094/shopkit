import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from './base.entity';
import type { Product } from './product.entity';

/** A buyable version of a product. Products without options have exactly one variant with no option values. */
@ObjectType()
@Entity('product_variants')
@Index(['productId', 'position'])
export class ProductVariant extends BaseModel {
  @Column('uuid')
  productId: string;

  @ManyToOne('Product', 'variants', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column('uuid')
  shopId: string;

  @Field(() => [String], { description: 'One value per product option, in option order' })
  @Column({ type: 'jsonb', default: () => `'[]'` })
  optionValues: string[];

  @Field({ description: 'e.g. "M / Indigo"; empty for products without options' })
  @Column({ length: 160, default: '' })
  title: string;

  @Field(() => Int, { description: 'In paise' })
  @Column({ type: 'int' })
  price: number;

  @Field(() => Int, { nullable: true, description: 'In paise' })
  @Column({ type: 'int', nullable: true })
  compareAtPrice: number | null;

  @Field(() => Int, { nullable: true, description: 'null means stock is not tracked' })
  @Column({ type: 'int', nullable: true })
  stock: number | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  sku: string | null;

  @Column({ type: 'int', default: 0 })
  position: number;
}
