import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getRequest, type ShopContext } from './request.util';

export const CurrentShop = createParamDecorator(
  (_data: never, context: ExecutionContext): ShopContext => {
    const shopContext = getRequest(context).shopContext;
    if (!shopContext) {
      throw new Error('CurrentShop used without ShopAccessGuard');
    }
    return shopContext;
  },
);
