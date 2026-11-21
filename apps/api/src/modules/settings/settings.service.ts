import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';
import { Repository } from 'typeorm';
import { findState, gstinStateCode, isValidGstin } from '@shopkit/commerce';
import type { AppConfig } from '../../config/configuration';
import { Shop, ShopRole } from '../../entities';
import { activePlan } from '../billing/plans';
import { PaymentsService } from '../payments/payments.service';
import { StorefrontCacheService } from '../storefront/storefront-cache.service';
import { StorefrontService } from '../storefront/storefront.service';
import type {
  BusinessSettingsInput,
  CheckoutSettingsInput,
  PaymentSettingsInput,
  ShopSettings,
  StoreSettingsInput,
} from './settings.types';

const PG_UNIQUE_VIOLATION = '23505';
const DOMAIN_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const TXT_PREFIX = '_shopkit';

@Injectable()
export class SettingsService {
  private readonly apiPublicUrl: string;
  private readonly rootDomain: string;
  private readonly cnameTarget: string;

  constructor(
    @InjectRepository(Shop) private readonly shops: Repository<Shop>,
    private readonly payments: PaymentsService,
    private readonly storefront: StorefrontService,
    private readonly cache: StorefrontCacheService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.apiPublicUrl = config.get('apiPublicUrl', { infer: true });
    this.rootDomain = config.get('storefrontRootDomain', { infer: true });
    this.cnameTarget = config.get('customDomainTarget', { infer: true });
  }

  toSettings(shop: Shop): ShopSettings {
    const plan = activePlan(shop);
    return {
      name: shop.name,
      subdomain: shop.subdomain,
      storeUrl: this.storefront.storeUrl(shop),
      contactEmail: shop.contactEmail,
      aiEnabled: shop.aiEnabled,
      codEnabled: shop.codEnabled,
      shippingFee: shop.shippingFee,
      freeShippingAbove: shop.freeShippingAbove,
      razorpayKeyId: shop.razorpayKeyId,
      razorpayConfigured: !!(shop.razorpayKeyId && shop.razorpayKeySecretEnc),
      razorpayWebhookConfigured: !!shop.razorpayWebhookSecretEnc,
      razorpayWebhookUrl: `${this.apiPublicUrl}/webhooks/razorpay/${shop.id}`,
      paymentsTestMode: shop.paymentsTestMode && this.payments.testPaymentsAllowed,
      testPaymentsAllowed: this.payments.testPaymentsAllowed,
      legalName: shop.legalName,
      gstin: shop.gstin,
      businessAddress: shop.businessAddress,
      stateCode: shop.stateCode,
      defaultGstRate: shop.defaultGstRate,
      customDomain: shop.customDomain,
      customDomainVerified: !!shop.customDomainVerifiedAt,
      customDomainAllowed: plan.customDomain,
      domainDns:
        shop.customDomain && shop.domainVerificationToken
          ? {
              cnameName: shop.customDomain,
              cnameTarget: this.cnameTarget,
              txtName: `${TXT_PREFIX}.${shop.customDomain}`,
              txtValue: `shopkit-verify=${shop.domainVerificationToken}`,
            }
          : null,
      plan: plan.plan,
    };
  }

  async updateStore(shop: Shop, input: StoreSettingsInput): Promise<ShopSettings> {
    return this.save(shop, {
      name: input.name.trim(),
      contactEmail: input.contactEmail?.trim().toLowerCase() || null,
      aiEnabled: input.aiEnabled,
    });
  }

  async updateCheckout(shop: Shop, input: CheckoutSettingsInput): Promise<ShopSettings> {
    return this.save(shop, {
      codEnabled: input.codEnabled,
      shippingFee: input.shippingFee,
      freeShippingAbove: input.freeShippingAbove ?? null,
    });
  }

  async updatePayments(shop: Shop, role: ShopRole, input: PaymentSettingsInput): Promise<ShopSettings> {
    requireManager(role);
    const keyId = input.razorpayKeyId?.trim() || null;
    const changes: Partial<Shop> = { paymentsTestMode: input.paymentsTestMode && this.payments.testPaymentsAllowed };

    if (!keyId) {
      Object.assign(changes, { razorpayKeyId: null, razorpayKeySecretEnc: null, razorpayWebhookSecretEnc: null });
    } else {
      const keyChanged = keyId !== shop.razorpayKeyId;
      if (keyChanged && !input.razorpayKeySecret) {
        throw new BadRequestException('Enter the key secret that goes with this key id');
      }
      changes.razorpayKeyId = keyId;
      if (input.razorpayKeySecret) changes.razorpayKeySecretEnc = this.payments.encrypt(input.razorpayKeySecret.trim());
      if (input.razorpayWebhookSecret) {
        changes.razorpayWebhookSecretEnc = this.payments.encrypt(input.razorpayWebhookSecret.trim());
      } else if (keyChanged) {
        changes.razorpayWebhookSecretEnc = null;
      }
    }
    return this.save(shop, changes);
  }

  async updateBusiness(shop: Shop, input: BusinessSettingsInput): Promise<ShopSettings> {
    const gstin = input.gstin?.trim().toUpperCase() || null;
    const stateCode = input.stateCode || null;
    if (stateCode && !findState(stateCode)) throw new BadRequestException('Choose a valid state');
    if (gstin) {
      if (!isValidGstin(gstin)) throw new BadRequestException('This GSTIN is not valid. Check it for typos.');
      if (!stateCode) throw new BadRequestException('Choose the state your GSTIN is registered in');
      if (gstinStateCode(gstin) !== stateCode) {
        throw new BadRequestException(`This GSTIN is registered in ${findState(gstinStateCode(gstin))?.name ?? 'another state'}`);
      }
      if (!input.legalName?.trim()) throw new BadRequestException('Enter the legal business name on your GST registration');
    }
    return this.save(shop, {
      legalName: input.legalName?.trim() || null,
      gstin,
      businessAddress: input.businessAddress?.trim() || null,
      stateCode,
      defaultGstRate: input.defaultGstRate,
    });
  }

  async setCustomDomain(shop: Shop, role: ShopRole, raw: string): Promise<ShopSettings> {
    requireManager(role);
    if (!activePlan(shop).customDomain) {
      throw new ForbiddenException('Custom domains are part of the paid plans. Upgrade to connect your own domain.');
    }
    const domain = normalizeDomain(raw);
    if (!domain || !DOMAIN_PATTERN.test(domain) || isIP(domain)) {
      throw new BadRequestException('Enter a domain like shop.example.com, without http:// or slashes');
    }
    if (domain === this.rootDomain || domain.endsWith(`.${this.rootDomain}`)) {
      throw new BadRequestException('Use a domain you own, not a shopkit address');
    }
    if (domain === shop.customDomain) return this.toSettings(shop);

    if (shop.customDomain) await this.cache.invalidateDomain(shop.customDomain);
    try {
      return await this.save(shop, {
        customDomain: domain,
        domainVerificationToken: randomBytes(16).toString('hex'),
        customDomainVerifiedAt: null,
      });
    } catch (error) {
      if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
        throw new ConflictException('This domain is already connected to another store');
      }
      throw error;
    }
  }

  async verifyCustomDomain(shop: Shop, role: ShopRole): Promise<ShopSettings> {
    requireManager(role);
    if (!shop.customDomain || !shop.domainVerificationToken) throw new BadRequestException('Add a domain first');
    if (shop.customDomainVerifiedAt) return this.toSettings(shop);

    const name = `${TXT_PREFIX}.${shop.customDomain}`;
    const expected = `shopkit-verify=${shop.domainVerificationToken}`;
    let records: string[] = [];
    try {
      records = (await dns.resolveTxt(name)).map((chunks) => chunks.join(''));
    } catch {
      records = [];
    }
    if (!records.includes(expected)) {
      throw new BadRequestException(
        `We could not find the TXT record on ${name} yet. DNS changes can take up to an hour; try again later.`,
      );
    }
    const settings = await this.save(shop, { customDomainVerifiedAt: new Date() });
    await this.cache.invalidateDomain(shop.customDomain);
    return settings;
  }

  async removeCustomDomain(shop: Shop, role: ShopRole): Promise<ShopSettings> {
    requireManager(role);
    if (shop.customDomain) await this.cache.invalidateDomain(shop.customDomain);
    return this.save(shop, { customDomain: null, domainVerificationToken: null, customDomainVerifiedAt: null });
  }

  /** For on-demand TLS at the edge: is this a host we serve? */
  async isServedHost(host: string): Promise<boolean> {
    return !!(await this.storefront.subdomainForHost(host));
  }

  private async save(shop: Shop, changes: Partial<Shop>): Promise<ShopSettings> {
    await this.shops.update({ id: shop.id }, changes);
    const updated = await this.shops.findOneByOrFail({ id: shop.id });
    await this.cache.invalidate(updated.subdomain);
    return this.toSettings(updated);
  }
}

function requireManager(role: ShopRole): void {
  if (role === ShopRole.STAFF) throw new ForbiddenException('Only the store owner or admins can change this');
}

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
}
