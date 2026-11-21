import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { JwtUtilService } from '@arhaminnovations/nestjs-identity';
import type { AppConfig } from '../../config/configuration';
import { Shop, ShopStatus, Theme, ThemeStatus } from '../../entities';
import { SUBDOMAIN_PATTERN } from '../shop/subdomain.util';
import { StorefrontCacheService } from './storefront-cache.service';
import type { StorefrontPayload } from './storefront.types';

export const THEME_PREVIEW_TOKEN_TYPE = 'theme_preview';

@Injectable()
export class StorefrontService {
  private readonly rootDomain: string;
  private readonly protocol: string;
  private readonly port: string;
  private readonly testPaymentsAllowed: boolean;

  constructor(
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    @InjectRepository(Theme) private readonly themes: Repository<Theme>,
    private readonly cache: StorefrontCacheService,
    private readonly jwt: JwtUtilService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.rootDomain = config.get('storefrontRootDomain', { infer: true });
    this.protocol = config.get('storefrontProtocol', { infer: true });
    this.port = config.get('storefrontPort', { infer: true });
    this.testPaymentsAllowed = config.get('testPaymentsAllowed', { infer: true });
  }

  async resolve(host: string, previewToken?: string | null): Promise<StorefrontPayload | null> {
    const subdomain = await this.subdomainForHost(host);
    if (!subdomain) return null;
    if (previewToken) return this.loadPreview(subdomain, previewToken);
    return this.cache.getOrLoad(subdomain, () => this.loadPublished(subdomain));
  }

  /** `kurta-house.shopkit.in:443` -> `kurta-house`; a verified custom domain -> its store's subdomain. */
  async subdomainForHost(host: string): Promise<string | null> {
    const hostname = normalizeHostname(host);
    if (!hostname) return null;
    const suffix = `.${this.rootDomain}`;
    if (hostname.endsWith(suffix)) {
      const subdomain = hostname.slice(0, -suffix.length);
      return SUBDOMAIN_PATTERN.test(subdomain) ? subdomain : null;
    }
    return this.cache.getOrLoadDomain(hostname, async () => {
      const shop = await this.shops.findOne({
        select: { id: true, subdomain: true },
        where: { customDomain: hostname, customDomainVerifiedAt: Not(IsNull()), status: ShopStatus.ACTIVE },
      });
      return shop?.subdomain ?? null;
    });
  }

  /** Public address of a store, preferring its verified custom domain. */
  storeUrl(shop: Pick<Shop, 'subdomain' | 'customDomain' | 'customDomainVerifiedAt'>): string {
    if (shop.customDomain && shop.customDomainVerifiedAt) return `https://${shop.customDomain}`;
    return `${this.protocol}://${shop.subdomain}.${this.rootDomain}${this.port}`;
  }

  private async loadPublished(subdomain: string): Promise<StorefrontPayload | null> {
    const shop = await this.shops.findOne({ where: { subdomain, status: ShopStatus.ACTIVE } });
    if (!shop) return null;
    const theme = await this.themes.findOne({
      where: { shopId: shop.id, status: ThemeStatus.PUBLISHED },
    });
    return { shop: this.toShop(shop), layout: theme?.layout ?? null, isPreview: false };
  }

  private async loadPreview(subdomain: string, token: string): Promise<StorefrontPayload | null> {
    const payload = this.jwt.verifySpecialToken(token, THEME_PREVIEW_TOKEN_TYPE);
    if (!payload?.shopId) throw new UnauthorizedException('This preview link has expired');

    const shop = await this.shops.findOne({ where: { id: payload.shopId, subdomain } });
    if (!shop) return null;
    const theme = await this.themes.findOne({ where: { id: payload.id, shopId: shop.id } });
    if (!theme) return null;
    const draft =
      typeof payload.draftId === 'string'
        ? await this.cache.getPreviewDraft(shop.id, payload.draftId, theme.id)
        : null;
    return { shop: this.toShop(shop), layout: draft ?? theme.layout, isPreview: true };
  }

  private toShop(shop: Shop): StorefrontPayload['shop'] {
    return {
      id: shop.id,
      name: shop.name,
      subdomain: shop.subdomain,
      currency: shop.currency,
      codEnabled: shop.codEnabled,
      onlinePayments: (shop.paymentsTestMode && this.testPaymentsAllowed) || !!(shop.razorpayKeyId && shop.razorpayKeySecretEnc),
      testPayments: shop.paymentsTestMode && this.testPaymentsAllowed,
      shippingFee: shop.shippingFee,
      freeShippingAbove: shop.freeShippingAbove,
    };
  }
}

export function normalizeHostname(host: string): string | null {
  const hostname = host.trim().toLowerCase().split(':')[0].replace(/\.$/, '');
  return hostname && hostname.length <= 253 ? hostname : null;
}
