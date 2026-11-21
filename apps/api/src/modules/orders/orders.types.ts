import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsEnum,
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
import { Order, OrderStatus, PaymentMethod } from '../../entities';

export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 20;

@InputType()
export class CartLineInput {
  @Field(() => ID)
  @IsUUID()
  variantId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(MAX_LINE_QUANTITY)
  quantity: number;
}

@InputType()
export class CustomerInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @Field({ description: '10-digit Indian mobile number' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string | null;
}

@InputType()
export class AddressInput {
  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  line1: string;

  @Field({ defaultValue: '' })
  @IsString()
  @MaxLength(160)
  line2: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city: string;

  @Field({ description: 'GST state code, e.g. "27" for Maharashtra' })
  @Matches(/^[0-9]{2}$/)
  stateCode: string;

  @Field()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Enter a 6-digit pincode' })
  pincode: string;
}

@InputType()
export class PlaceOrderInput {
  @Field(() => [CartLineInput])
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_CART_LINES)
  @ValidateNested({ each: true })
  @Type(() => CartLineInput)
  items: CartLineInput[];

  @Field(() => CustomerInput)
  @ValidateNested()
  @Type(() => CustomerInput)
  customer: CustomerInput;

  @Field(() => AddressInput)
  @ValidateNested()
  @Type(() => AddressInput)
  address: AddressInput;

  @Field(() => PaymentMethod)
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

@InputType()
export class ConfirmPaymentInput {
  @Field(() => ID)
  @IsUUID()
  orderId: string;

  @Field()
  @IsString()
  @MaxLength(64)
  token: string;

  @Field()
  @IsString()
  @MaxLength(64)
  paymentId: string;

  @Field()
  @IsString()
  @MaxLength(128)
  signature: string;
}

@InputType()
export class OrderAccessInput {
  @Field(() => ID)
  @IsUUID()
  orderId: string;

  @Field()
  @IsString()
  @MaxLength(64)
  token: string;
}

@ObjectType()
export class PaymentRequest {
  @Field({ description: '"razorpay" or "test"' })
  gateway: string;

  @Field(() => String, { nullable: true, description: 'Razorpay key id for the checkout script' })
  keyId: string | null;

  @Field()
  gatewayOrderId: string;

  @Field(() => Int)
  amount: number;
}

@ObjectType()
export class PlaceOrderResult {
  @Field(() => Order)
  order: Order;

  @Field(() => PaymentRequest, { nullable: true, description: 'Present when the buyer still has to pay online' })
  payment: PaymentRequest | null;
}

@ObjectType()
export class TestPaymentResult {
  @Field()
  paymentId: string;

  @Field()
  signature: string;
}

@InputType()
export class OrderFilter {
  @Field(() => OrderStatus, { nullable: true })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @Field({ nullable: true, description: 'Order number, customer name or phone' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;
}

@InputType()
export class ShipOrderInput {
  @Field(() => ID)
  @IsUUID()
  orderId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  trackingNumber?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  @MaxLength(500)
  trackingUrl?: string | null;
}

@ObjectType()
export class OrderCounts {
  @Field(() => Int, { description: 'Placed and waiting to be shipped' })
  toShip: number;

  @Field(() => Int)
  shipped: number;

  @Field(() => Int)
  total: number;
}
