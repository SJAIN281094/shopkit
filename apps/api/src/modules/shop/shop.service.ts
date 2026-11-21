import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CustomLoggerService } from '@arhaminnovations/nestjs-pino-logger';
import { Shop, ShopMember, ShopRole } from '../../entities';
import { CreateShopInput, MyShop, SubdomainAvailability } from './shop.types';
import { normalizeSubdomain, subdomainProblem } from './subdomain.util';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ShopService {
  private readonly logger: CustomLoggerService;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    @InjectRepository(ShopMember) private readonly members: Repository<ShopMember>,
    logger: CustomLoggerService,
  ) {
    this.logger = logger.forContext(ShopService.name);
  }

  async checkSubdomain(raw: string): Promise<SubdomainAvailability> {
    const subdomain = normalizeSubdomain(raw);
    const problem = subdomainProblem(subdomain);
    if (problem) return { available: false, reason: problem };
    if (await this.shops.exists({ where: { subdomain } })) {
      return { available: false, reason: 'This name is already taken' };
    }
    return { available: true, reason: null };
  }

  async createShop(userId: string, input: CreateShopInput): Promise<Shop> {
    const subdomain = normalizeSubdomain(input.subdomain);
    const problem = subdomainProblem(subdomain);
    if (problem) throw new BadRequestException(problem);

    try {
      const shop = await this.dataSource.transaction(async (manager) => {
        const created = await manager.save(
          manager.create(Shop, { name: input.name.trim(), subdomain, ownerId: userId }),
        );
        await manager.save(
          manager.create(ShopMember, { shopId: created.id, userId, role: ShopRole.OWNER }),
        );
        return created;
      });
      this.logger.logWithBindings('info', { shopId: shop.id, userId, subdomain }, 'Shop created');
      return shop;
    } catch (error) {
      if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('This store address is already taken');
      }
      throw error;
    }
  }

  async myShops(userId: string): Promise<MyShop[]> {
    const memberships = await this.members.find({
      where: { userId },
      relations: { shop: true },
      order: { createdAt: 'ASC' },
    });
    return memberships.map((m) => ({ shop: m.shop, role: m.role }));
  }
}
