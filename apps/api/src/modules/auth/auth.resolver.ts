import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, GqlJwtAuthGuard, type JwtPayload } from '@arhaminnovations/nestjs-identity';
import { User } from '../../entities';
import { AuthService } from './auth.service';
import { AuthPayload, LoginInput, SignupInput } from './auth.types';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Mutation(() => AuthPayload)
  signup(@Args('input') input: SignupInput): Promise<AuthPayload> {
    return this.auth.signup(input);
  }

  @Mutation(() => AuthPayload)
  login(@Args('input') input: LoginInput): Promise<AuthPayload> {
    return this.auth.login(input);
  }

  @Query(() => User)
  @UseGuards(GqlJwtAuthGuard)
  me(@CurrentUser() user: JwtPayload): Promise<User> {
    return this.auth.getUser(user.id);
  }
}
