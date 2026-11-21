import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { User } from '../../entities';

@InputType()
export class SignupInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @Field()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MaxLength(128)
  password: string;
}

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;
}
