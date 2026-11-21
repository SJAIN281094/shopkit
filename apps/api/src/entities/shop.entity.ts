import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Column, Entity, Index } from 'typeorm';
import { BaseModel } from './base.entity';

export enum ShopStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum ShopPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
}

registerEnumType(ShopStatus, { name: 'ShopStatus' });
registerEnumType(ShopPlan, { name: 'ShopPlan' });

@ObjectType()
@Entity('shops')
export class Shop extends BaseModel {
  @Field()
  @Column()
  name: string;

  @Field()
  @Index({ unique: true })
  @Column({ length: 32 })
  subdomain: string;

  @Field(() => ShopStatus)
  @Column({ type: 'enum', enum: ShopStatus, default: ShopStatus.ACTIVE })
  status: ShopStatus;

  @Field()
  @Column({ length: 3, default: 'INR' })
  currency: string;

  @Field()
  @Column({ default: true })
  aiEnabled: boolean;

  @Field(() => Int)
  @Column({ type: 'int', default: 50 })
  aiCreditsBalance: number;

  @Column('uuid')
  ownerId: string;

  // ---- Plan ----

  @Column({ type: 'enum', enum: ShopPlan, default: ShopPlan.FREE })
  plan: ShopPlan;

  @Column({ type: 'timestamptz', nullable: true })
  planExpiresAt: Date | null;

  // ---- Checkout ----

  @Column({ default: true })
  codEnabled: boolean;

  /** Paise. */
  @Column({ type: 'int', default: 0 })
  shippingFee: number;

  /** Paise; orders at or above this ship free. */
  @Column({ type: 'int', nullable: true })
  freeShippingAbove: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  razorpayKeyId: string | null;

  /** AES-encrypted. */
  @Column({ type: 'text', nullable: true })
  razorpayKeySecretEnc: string | null;

  /** AES-encrypted. */
  @Column({ type: 'text', nullable: true })
  razorpayWebhookSecretEnc: string | null;

  /** Development only: online payments go through a fake gateway. */
  @Column({ default: false })
  paymentsTestMode: boolean;

  /** Last order number used; incremented atomically. */
  @Column({ type: 'int', default: 0 })
  orderSeq: number;

  @Column({ type: 'int', default: 0 })
  invoiceSeq: number;

  // ---- Business and GST ----

  @Column({ type: 'varchar', length: 120, nullable: true })
  legalName: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  gstin: string | null;

  @Column({ type: 'text', nullable: true })
  businessAddress: string | null;

  /** GST state code the business ships from. */
  @Column({ type: 'varchar', length: 2, nullable: true })
  stateCode: string | null;

  @Column({ type: 'int', default: 5 })
  defaultGstRate: number;

  @Column({ type: 'varchar', length: 160, nullable: true })
  contactEmail: string | null;

  // ---- Custom domain ----

  @Index({ unique: true, where: '"customDomain" IS NOT NULL' })
  @Column({ type: 'varchar', length: 253, nullable: true })
  customDomain: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  domainVerificationToken: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  customDomainVerifiedAt: Date | null;
}
