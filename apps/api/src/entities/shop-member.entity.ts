import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseModel } from './base.entity';
import { Shop } from './shop.entity';
import { User } from './user.entity';

export enum ShopRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
}

registerEnumType(ShopRole, { name: 'ShopRole' });

@ObjectType()
@Entity('shop_members')
@Index(['shopId', 'userId'], { unique: true })
export class ShopMember extends BaseModel {
  @Column('uuid')
  shopId: string;

  @Index()
  @Column('uuid')
  userId: string;

  @Field(() => ShopRole)
  @Column({ type: 'enum', enum: ShopRole })
  role: ShopRole;

  @Field(() => Shop)
  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
