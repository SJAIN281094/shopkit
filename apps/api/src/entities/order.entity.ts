import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Column, Entity, Index } from 'typeorm';
import { BaseModel } from './base.entity';

export enum OrderStatus {
  /** Online payment started but not completed; stock is held until it expires. */
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PLACED = 'PLACED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  COD = 'COD',
  ONLINE = 'ONLINE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

registerEnumType(OrderStatus, { name: 'OrderStatus' });
registerEnumType(PaymentMethod, { name: 'PaymentMethod' });
registerEnumType(PaymentStatus, { name: 'PaymentStatus' });

@ObjectType()
export class OrderCustomer {
  @Field()
  name: string;

  @Field({ description: '91XXXXXXXXXX' })
  phone: string;

  @Field(() => String, { nullable: true })
  email: string | null;
}

@ObjectType()
export class OrderAddress {
  @Field()
  line1: string;

  @Field()
  line2: string;

  @Field()
  city: string;

  @Field()
  stateCode: string;

  @Field()
  state: string;

  @Field()
  pincode: string;
}

@ObjectType()
export class OrderItem {
  @Field(() => ID, { nullable: true })
  productId: string | null;

  @Field(() => ID, { nullable: true })
  variantId: string | null;

  @Field()
  handle: string;

  @Field()
  title: string;

  @Field()
  variantTitle: string;

  @Field(() => String, { nullable: true })
  image: string | null;

  @Field(() => Int)
  unitPrice: number;

  @Field(() => Int)
  quantity: number;

  @Field(() => Int)
  lineTotal: number;

  @Field(() => Int)
  gstRate: number;

  @Field(() => String, { nullable: true })
  hsnCode: string | null;
}

@ObjectType()
export class OrderTax {
  @Field(() => Int)
  taxable: number;

  @Field(() => Int)
  cgst: number;

  @Field(() => Int)
  sgst: number;

  @Field(() => Int)
  igst: number;
}

@ObjectType()
@Entity('orders')
@Index(['shopId', 'number'], { unique: true })
@Index(['shopId', 'createdAt'])
@Index(['status', 'expiresAt'])
export class Order extends BaseModel {
  @Column('uuid')
  shopId: string;

  @Field(() => Int, { description: 'Per-store order number shown to buyers, e.g. #1001' })
  @Column({ type: 'int' })
  number: number;

  @Field(() => OrderStatus)
  @Column({ type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @Field(() => PaymentMethod)
  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Field(() => PaymentStatus)
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Field(() => OrderCustomer)
  @Column({ type: 'jsonb' })
  customer: OrderCustomer;

  @Field(() => OrderAddress)
  @Column({ type: 'jsonb' })
  shippingAddress: OrderAddress;

  @Field(() => [OrderItem])
  @Column({ type: 'jsonb' })
  items: OrderItem[];

  @Field(() => Int)
  @Column({ type: 'int' })
  subtotal: number;

  @Field(() => Int)
  @Column({ type: 'int' })
  shippingFee: number;

  @Field(() => Int)
  @Column({ type: 'int' })
  total: number;

  @Field(() => OrderTax, { nullable: true, description: 'Only when the store has a GSTIN' })
  @Column({ type: 'jsonb', nullable: true })
  tax: OrderTax | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 32, nullable: true })
  invoiceNumber: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  /** "razorpay" or "test". */
  @Column({ type: 'varchar', length: 16, nullable: true })
  gateway: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  gatewayOrderId: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  gatewayPaymentId: string | null;

  /** Secret the buyer uses to see this order and its invoice without an account. */
  @Field({ description: 'Lets the buyer view this order; keep private' })
  @Index({ unique: true })
  @Column({ length: 64 })
  accessToken: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 80, nullable: true })
  trackingNumber: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  trackingUrl: string | null;

  @Field(() => Date, { nullable: true, description: 'Unpaid online orders are cancelled and restocked after this' })
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  shippedAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;
}
