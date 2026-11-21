import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from './base.entity';
import { Shop } from './shop.entity';

@ObjectType()
@Entity('collections')
@Index(['shopId', 'handle'], { unique: true })
export class Collection extends BaseModel {
  @Column('uuid')
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @Field()
  @Column({ length: 80 })
  name: string;

  @Field({ description: 'URL slug, e.g. /collections/<handle>' })
  @Column({ length: 80 })
  handle: string;

  @Field()
  @Column({ type: 'text', default: '' })
  description: string;
}
