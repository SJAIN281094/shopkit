import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Column, Entity, Index } from 'typeorm';
import { BaseModel } from './base.entity';
import { ShopPlan } from './shop.entity';

export enum BillingKind {
  PLAN = 'PLAN',
  AI_CREDITS = 'AI_CREDITS',
}

export enum BillingStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

registerEnumType(BillingKind, { name: 'BillingKind' });
registerEnumType(BillingStatus, { name: 'BillingStatus' });

/** A seller paying shopkit: a plan period or an AI credit pack. */
@ObjectType()
@Entity('billing_payments')
@Index(['shopId', 'createdAt'])
export class BillingPayment extends BaseModel {
  @Column('uuid')
  shopId: string;

  @Column('uuid')
  userId: string;

  @Field(() => BillingKind)
  @Column({ type: 'enum', enum: BillingKind })
  kind: BillingKind;

  @Field(() => ShopPlan, { nullable: true })
  @Column({ type: 'enum', enum: ShopPlan, nullable: true })
  plan: ShopPlan | null;

  @Field(() => Int, { description: 'AI credits added when paid' })
  @Column({ type: 'int', default: 0 })
  credits: number;

  @Field(() => Int, { description: 'In paise' })
  @Column({ type: 'int' })
  amount: number;

  @Field(() => BillingStatus)
  @Column({ type: 'enum', enum: BillingStatus, default: BillingStatus.CREATED })
  status: BillingStatus;

  /** "razorpay" or "test". */
  @Column({ type: 'varchar', length: 16 })
  gateway: string;

  @Index({ unique: true })
  @Column({ length: 64 })
  gatewayOrderId: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  gatewayPaymentId: string | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}
