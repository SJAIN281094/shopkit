import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Shop, ShopRole } from '../../entities';

@InputType()
export class CreateShopInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  subdomain: string;
}

@ObjectType()
export class MyShop {
  @Field(() => Shop)
  shop: Shop;

  @Field(() => ShopRole)
  role: ShopRole;
}

@ObjectType()
export class SubdomainAvailability {
  @Field()
  available: boolean;

  @Field(() => String, { nullable: true })
  reason: string | null;
}
