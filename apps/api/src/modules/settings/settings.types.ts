import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { GST_RATES } from '@shopkit/commerce';
import { ShopPlan } from '../../entities';

const MAX_FEE = 10_000_000;

@ObjectType()
export class ShopSettings {
  @Field()
  name: string;

  @Field()
  subdomain: string;

  @Field({ description: 'Where buyers find the store' })
  storeUrl: string;

  @Field(() => String, { nullable: true, description: 'Order emails go here; defaults to the owner' })
  contactEmail: string | null;

  @Field()
  aiEnabled: boolean;

  @Field()
  codEnabled: boolean;

  @Field(() => Int)
  shippingFee: number;

  @Field(() => Int, { nullable: true })
  freeShippingAbove: number | null;

  @Field(() => String, { nullable: true })
  razorpayKeyId: string | null;

  @Field()
  razorpayConfigured: boolean;

  @Field()
  razorpayWebhookConfigured: boolean;

  @Field({ description: 'Paste into Razorpay → Webhooks; events payment.captured and order.paid' })
  razorpayWebhookUrl: string;

  @Field()
  paymentsTestMode: boolean;

  @Field()
  testPaymentsAllowed: boolean;

  @Field(() => String, { nullable: true })
  legalName: string | null;

  @Field(() => String, { nullable: true })
  gstin: string | null;

  @Field(() => String, { nullable: true })
  businessAddress: string | null;

  @Field(() => String, { nullable: true })
  stateCode: string | null;

  @Field(() => Int)
  defaultGstRate: number;

  @Field(() => String, { nullable: true })
  customDomain: string | null;

  @Field()
  customDomainVerified: boolean;

  @Field({ description: 'Whether the current plan includes a custom domain' })
  customDomainAllowed: boolean;

  @Field(() => DomainDnsRecords, { nullable: true })
  domainDns: DomainDnsRecords | null;

  @Field(() => ShopPlan)
  plan: ShopPlan;
}

@ObjectType()
export class DomainDnsRecords {
  @Field()
  cnameName: string;

  @Field()
  cnameTarget: string;

  @Field()
  txtName: string;

  @Field()
  txtValue: string;
}

@InputType()
export class StoreSettingsInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  contactEmail?: string | null;

  @Field()
  @IsBoolean()
  aiEnabled: boolean;
}

@InputType()
export class CheckoutSettingsInput {
  @Field()
  @IsBoolean()
  codEnabled: boolean;

  @Field(() => Int, { description: 'Paise' })
  @IsInt()
  @Min(0)
  @Max(MAX_FEE)
  shippingFee: number;

  @Field(() => Int, { nullable: true, description: 'Paise; leave empty to always charge shipping' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  freeShippingAbove?: number | null;
}

@InputType()
export class PaymentSettingsInput {
  @Field(() => String, { nullable: true, description: 'Empty to remove Razorpay' })
  @IsOptional()
  @Matches(/^rzp_(test|live)_[A-Za-z0-9]{8,32}$/, { message: 'Razorpay key ids look like rzp_live_XXXXXXXXXXXX' })
  razorpayKeyId?: string | null;

  @Field(() => String, { nullable: true, description: 'Leave empty to keep the saved secret' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(100)
  razorpayKeySecret?: string | null;

  @Field(() => String, { nullable: true, description: 'Leave empty to keep the saved secret' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  razorpayWebhookSecret?: string | null;

  @Field()
  @IsBoolean()
  paymentsTestMode: boolean;
}

@InputType()
export class BusinessSettingsInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  legalName?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  gstin?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  businessAddress?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(/^[0-9]{2}$/)
  stateCode?: string | null;

  @Field(() => Int)
  @IsIn(GST_RATES)
  defaultGstRate: number;
}

@InputType()
export class CustomDomainInput {
  @Field({ description: 'e.g. shop.example.com' })
  @IsString()
  @MaxLength(253)
  domain: string;
}
