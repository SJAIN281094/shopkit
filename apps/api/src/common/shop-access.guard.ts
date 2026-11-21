import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopMember, ShopStatus } from '../entities';
import { getRequest } from './request.util';

export const SHOP_HEADER = 'x-shop-id';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the active shop from the `x-shop-id` header and checks that the
 * authenticated user is a member. Must run after GqlJwtAuthGuard.
 */
@Injectable()
export class ShopAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(ShopMember)
    private readonly members: Repository<ShopMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = getRequest(context);
    if (!req.user?.id) throw new UnauthorizedException();

    const shopId = req.headers[SHOP_HEADER];
    if (typeof shopId !== 'string' || !UUID_PATTERN.test(shopId)) {
      throw new BadRequestException(`A valid ${SHOP_HEADER} header is required`);
    }

    const member = await this.members.findOne({
      where: { shopId, userId: req.user.id },
      relations: { shop: true },
    });
    if (!member) throw new ForbiddenException('You do not have access to this store');
    if (member.shop.status !== ShopStatus.ACTIVE) {
      throw new ForbiddenException('This store is suspended');
    }

    req.shopContext = { shop: member.shop, role: member.role };
    return true;
  }
}
