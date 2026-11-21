import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import type { StoreLayout } from '@shopkit/themes';

@ObjectType()
export class StorefrontShop {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  subdomain: string;

  @Field()
  currency: string;

  @Field()
  codEnabled: boolean;

  @Field({ description: 'Buyers can pay online (UPI, cards, netbanking)' })
  onlinePayments: boolean;

  @Field({ description: 'Online payments go through a fake gateway; development only' })
  testPayments: boolean;

  @Field(() => Int, { description: 'Paise' })
  shippingFee: number;

  @Field(() => Int, { nullable: true, description: 'Paise; orders at or above this ship free' })
  freeShippingAbove: number | null;
}

@ObjectType()
export class StorefrontPayload {
  @Field(() => StorefrontShop)
  shop: StorefrontShop;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Null when the store has not published a design yet' })
  layout: StoreLayout | null;

  @Field()
  isPreview: boolean;
}
