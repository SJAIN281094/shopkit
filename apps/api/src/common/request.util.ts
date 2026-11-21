import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';
import type { JwtPayload } from '@arhaminnovations/nestjs-identity';
import type { Shop, ShopRole } from '../entities';

export interface ShopContext {
  shop: Shop;
  role: ShopRole;
}

export interface AppRequest extends Request {
  user?: JwtPayload;
  shopContext?: ShopContext;
}

export function getRequest(context: ExecutionContext): AppRequest {
  if ((context.getType() as string) === 'graphql') {
    return GqlExecutionContext.create(context).getContext<{ req: AppRequest }>().req;
  }
  return context.switchToHttp().getRequest<AppRequest>();
}
