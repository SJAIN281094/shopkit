import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import type { StoreLayout } from '@shopkit/themes';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from './base.entity';
import { Shop } from './shop.entity';

export enum ThemeStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ThemeSource {
  TEMPLATE = 'TEMPLATE',
  AI = 'AI',
}

registerEnumType(ThemeStatus, { name: 'ThemeStatus' });
registerEnumType(ThemeSource, { name: 'ThemeSource' });

@ObjectType()
@Entity('themes')
@Index(['shopId', 'status'])
@Index('UQ_themes_one_published_per_shop', ['shopId'], { unique: true, where: `"status" = 'PUBLISHED'` })
export class Theme extends BaseModel {
  @Column('uuid')
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @Field()
  @Column()
  name: string;

  @Field(() => ThemeSource)
  @Column({ type: 'enum', enum: ThemeSource })
  source: ThemeSource;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  templateKey: string | null;

  @Field(() => GraphQLJSON)
  @Column({ type: 'jsonb' })
  layout: StoreLayout;

  @Field(() => ThemeStatus)
  @Column({ type: 'enum', enum: ThemeStatus, default: ThemeStatus.DRAFT })
  status: ThemeStatus;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;
}
