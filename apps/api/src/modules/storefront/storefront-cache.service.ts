import { Injectable } from '@nestjs/common';
import { RedisService } from '@arhaminnovations/nestjs-redis';
import type { StoreLayout } from '@shopkit/themes';
import type { StorefrontPayload } from './storefront.types';

const TTL_SECONDS = 300;
const DOMAIN_MISS_TTL_SECONDS = 30;

interface PreviewDraft {
  themeId: string;
  layout: StoreLayout;
}

@Injectable()
export class StorefrontCacheService {
  constructor(private readonly redis: RedisService) {}

  getOrLoad(
    subdomain: string,
    load: () => Promise<StorefrontPayload | null>,
  ): Promise<StorefrontPayload | null> {
    return this.redis.cache(this.key(subdomain), load, { ttl: TTL_SECONDS });
  }

  async invalidate(subdomain: string): Promise<void> {
    await this.redis.del(this.key(subdomain));
  }

  /** Custom domain -> subdomain. Misses are cached briefly so unknown hosts don't hit the database each time. */
  async getOrLoadDomain(hostname: string, load: () => Promise<string | null>): Promise<string | null> {
    const key = this.domainKey(hostname);
    const cached = await this.redis.get<string>(key);
    if (cached !== null) return cached || null;
    const subdomain = await load();
    await this.redis.set(key, subdomain ?? '', { EX: subdomain ? TTL_SECONDS : DOMAIN_MISS_TTL_SECONDS });
    return subdomain;
  }

  async invalidateDomain(hostname: string): Promise<void> {
    await this.redis.del(this.domainKey(hostname));
  }

  /** Unsaved editor changes, shown only through the matching preview link. */
  async setPreviewDraft(shopId: string, draftId: string, draft: PreviewDraft, ttlSeconds: number): Promise<void> {
    await this.redis.setJson(this.draftKey(shopId, draftId), draft, ttlSeconds);
  }

  async getPreviewDraft(shopId: string, draftId: string, themeId: string): Promise<StoreLayout | null> {
    const draft = await this.redis.getJson<PreviewDraft>(this.draftKey(shopId, draftId));
    return draft?.themeId === themeId ? draft.layout : null;
  }

  private key(subdomain: string): string {
    return `storefront:v2:${subdomain}`;
  }

  private domainKey(hostname: string): string {
    return `storefront:domain:${hostname}`;
  }

  private draftKey(shopId: string, draftId: string): string {
    return `storefront:preview-draft:${shopId}:${draftId}`;
  }
}
