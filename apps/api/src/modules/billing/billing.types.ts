import { Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsString, IsUUID, MaxLength } from 'class-validator';
import { BillingPayment, ShopPlan } from '../../entities';

@ObjectType()
export class PlanInfo {
  @Field(() => ShopPlan)
  plan: ShopPlan;

  @Field()
  name: string;

  @Field(() => Int, { description: 'Paise per 30 days' })
  price: number;

  @Field(() => Int)
  maxProducts: number;

  @Field()
  customDomain: boolean;

  @Field(() => Int)
  aiCredits: number;
}

@ObjectType()
export class CreditPackInfo {
  @Field()
  key: string;

  @Field(() => Int)
  credits: number;

  @Field(() => Int)
  price: number;
}

@ObjectType()
export class BillingOverview {
  @Field(() => PlanInfo)
  plan: PlanInfo;

  @Field(() => Date, { nullable: true })
  planExpiresAt: Date | null;

  @Field(() => Int)
  aiCreditsBalance: number;

  @Field(() => Int)
  productCount: number;

  @Field(() => [PlanInfo])
  plans: PlanInfo[];

  @Field(() => [CreditPackInfo])
  creditPacks: CreditPackInfo[];

  @Field(() => [BillingPayment])
  payments: BillingPayment[];
}

@ObjectType()
export class BillingCheckout {
  @Field(() => ID)
  billingPaymentId: string;

  @Field()
  gateway: string;

  @Field(() => String, { nullable: true })
  keyId: string | null;

  @Field()
  gatewayOrderId: string;

  @Field(() => Int)
  amount: number;

  @Field()
  description: string;
}

@InputType()
export class BuyPlanInput {
  @Field(() => ShopPlan)
  @IsEnum(ShopPlan)
  plan: ShopPlan;
}

@InputType()
export class BuyCreditsInput {
  @Field()
  @IsString()
  @MaxLength(40)
  packKey: string;
}

@InputType()
export class ConfirmBillingPaymentInput {
  @Field(() => ID)
  @IsUUID()
  billingPaymentId: string;

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
export class BillingPaymentIdInput {
  @Field(() => ID)
  @IsUUID()
  billingPaymentId: string;
}
