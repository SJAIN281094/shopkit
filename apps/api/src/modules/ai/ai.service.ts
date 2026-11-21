import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { CustomLoggerService } from '@arhaminnovations/nestjs-pino-logger';
import { InvalidLayoutError, parseStoreLayout, type StoreLayout } from '@shopkit/themes';
import { AiFeature, AiUsage, Shop } from '../../entities';
import { AI_PROVIDER, type AiProvider, type AiResult, type AiUsageInfo } from './providers/ai-provider.interface';

export const AI_CREDIT_COSTS: Record<AiFeature, number> = {
  [AiFeature.STORE_GENERATION]: 10,
  [AiFeature.PRODUCT_LISTING]: 2,
};

const listingSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(5000),
  collectionName: z.string().nullable(),
});

export type GeneratedListing = z.infer<typeof listingSchema>;

export interface GeneratedLayout {
  layout: StoreLayout;
  provider: string;
  model: string;
}

@Injectable()
export class AiService {
  private readonly logger: CustomLoggerService;

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    @InjectRepository(AiUsage) private readonly usage: Repository<AiUsage>,
    logger: CustomLoggerService,
  ) {
    this.logger = logger.forContext(AiService.name);
  }

  async generateStoreLayout(shop: Shop, userId: string, description: string): Promise<GeneratedLayout> {
    const result = await this.run(
      shop,
      userId,
      AiFeature.STORE_GENERATION,
      () => this.provider.generateStoreLayout({ storeName: shop.name, description }),
      (output) => parseStoreLayout(output),
      'AI could not generate your store right now. Please try again, or start from a free template.',
    );
    return { layout: result.value, provider: this.provider.name, model: result.model };
  }

  async generateProductListing(
    shop: Shop,
    userId: string,
    input: { imageUrl: string; hint: string; collections: string[] },
  ): Promise<GeneratedListing> {
    const result = await this.run(
      shop,
      userId,
      AiFeature.PRODUCT_LISTING,
      () => this.provider.generateProductListing({ storeName: shop.name, ...input }),
      (output) => listingSchema.parse(output),
      'AI could not write this listing right now. Please try again, or fill in the details yourself.',
    );
    return result.value;
  }

  /** Reserves credits, calls the provider, validates the output, and refunds on any failure. */
  private async run<T>(
    shop: Shop,
    userId: string,
    feature: AiFeature,
    call: () => Promise<AiResult<unknown>>,
    parse: (output: unknown) => T,
    failureMessage: string,
  ): Promise<{ value: T; model: string }> {
    const cost = AI_CREDIT_COSTS[feature];
    await this.reserveCredits(shop, cost);

    try {
      const result = await call();
      const value = parse(result.output);
      await this.recordUsage(shop.id, userId, feature, result.model, cost, result.usage, true);
      return { value, model: result.model };
    } catch (error) {
      await this.refundCredits(shop.id, cost);
      await this.recordUsage(shop.id, userId, feature, 'unknown', 0, { inputTokens: 0, outputTokens: 0 }, false);
      if (error instanceof HttpException) throw error;
      const details =
        error instanceof InvalidLayoutError
          ? error.issues
          : error instanceof z.ZodError
            ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
            : [(error as Error).message];
      this.logger.logWithBindings('error', { shopId: shop.id, feature, provider: this.provider.name, details }, 'AI request failed');
      throw new ServiceUnavailableException(failureMessage);
    }
  }

  private async reserveCredits(shop: Shop, cost: number): Promise<void> {
    if (!shop.aiEnabled) {
      throw new ForbiddenException('AI features are turned off for this store');
    }
    const result = await this.shops
      .createQueryBuilder()
      .update(Shop)
      .set({ aiCreditsBalance: () => `"aiCreditsBalance" - ${cost}` })
      .where('id = :id AND "aiCreditsBalance" >= :cost', { id: shop.id, cost })
      .execute();
    if (!result.affected) {
      throw new BadRequestException(
        `Not enough AI credits (this needs ${cost}). You can still do this yourself for free, or add credits.`,
      );
    }
  }

  private async refundCredits(shopId: string, cost: number): Promise<void> {
    await this.shops.increment({ id: shopId }, 'aiCreditsBalance', cost);
  }

  private async recordUsage(
    shopId: string,
    userId: string,
    feature: AiFeature,
    model: string,
    creditsCharged: number,
    usage: AiUsageInfo,
    succeeded: boolean,
  ): Promise<void> {
    await this.usage.save(
      this.usage.create({
        shopId,
        userId,
        feature,
        provider: this.provider.name,
        model,
        creditsCharged,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        succeeded,
      }),
    );
  }
}
