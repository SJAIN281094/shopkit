import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Not, Repository } from 'typeorm';
import { JwtUtilService } from '@arhaminnovations/nestjs-identity';
import { CustomLoggerService } from '@arhaminnovations/nestjs-pino-logger';
import {
  buildLayoutFromTemplate,
  getTemplate,
  isBuiltInFont,
  parseStoreLayout,
  safeParseStoreLayout,
  TEMPLATE_LAYOUTS,
  THEME_TEMPLATES,
  type StoreLayout,
} from '@shopkit/themes';
import { Shop, Theme, ThemeSource, ThemeStatus } from '../../entities';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import { StorefrontCacheService } from '../storefront/storefront-cache.service';
import { THEME_PREVIEW_TOKEN_TYPE } from '../storefront/storefront.service';
import type { ThemePreview, ThemePreviewDraftInput, ThemeTemplateInfo, UpdateThemeInput } from './theme.types';

const PREVIEW_TTL_MINUTES = 30;

@Injectable()
export class ThemeService {
  private readonly logger: CustomLoggerService;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Theme) private readonly themes: Repository<Theme>,
    private readonly ai: AiService,
    private readonly storefrontCache: StorefrontCacheService,
    private readonly storage: StorageService,
    private readonly jwt: JwtUtilService,
    logger: CustomLoggerService,
  ) {
    this.logger = logger.forContext(ThemeService.name);
  }

  listTemplates(): ThemeTemplateInfo[] {
    return THEME_TEMPLATES.map((t) => ({
      key: t.key,
      name: t.name,
      description: t.description,
      primaryColor: t.settings.colors.primary,
      accentColor: t.settings.colors.accent,
      backgroundColor: t.settings.colors.background,
      headingFont: t.settings.fonts.heading,
      layout: t.layout,
      layoutName: TEMPLATE_LAYOUTS[t.layout].name,
      layoutDescription: TEMPLATE_LAYOUTS[t.layout].description,
    }));
  }

  listThemes(shopId: string): Promise<Theme[]> {
    return this.themes.find({
      where: { shopId, status: Not(ThemeStatus.ARCHIVED) },
      order: { createdAt: 'DESC' },
    });
  }

  async getTheme(shopId: string, themeId: string): Promise<Theme> {
    const theme = await this.themes.findOne({
      where: { id: themeId, shopId, status: Not(ThemeStatus.ARCHIVED) },
    });
    if (!theme) throw new NotFoundException('Design not found');
    return theme;
  }

  private parseShopLayout(shop: Shop, input: unknown): StoreLayout {
    const result = safeParseStoreLayout(input);
    if (!result.success) {
      throw new BadRequestException(`Some fields need fixing: ${result.issues.slice(0, 3).join('; ')}`);
    }
    const fonts = result.layout.settings.customFonts ?? [];
    if (fonts.some((f) => !this.storage.isShopUpload(f.url, shop.id))) {
      throw new BadRequestException('Fonts must be uploaded to this store');
    }
    return result.layout;
  }

  /** Saves edits. Editing the live design updates the store immediately. */
  async update(shop: Shop, input: UpdateThemeInput): Promise<Theme> {
    const theme = await this.getTheme(shop.id, input.themeId);
    theme.layout = this.parseShopLayout(shop, input.layout);
    if (input.name !== undefined) theme.name = input.name.trim();
    const saved = await this.themes.save(theme);
    if (saved.status === ThemeStatus.PUBLISHED) await this.storefrontCache.invalidate(shop.subdomain);
    return saved;
  }

  async archive(shop: Shop, themeId: string): Promise<boolean> {
    const theme = await this.getTheme(shop.id, themeId);
    if (theme.status === ThemeStatus.PUBLISHED) {
      throw new BadRequestException('This design is live. Publish another design before deleting it.');
    }
    theme.status = ThemeStatus.ARCHIVED;
    await this.themes.save(theme);
    return true;
  }

  async createFromTemplate(shop: Shop, templateKey: string): Promise<Theme> {
    const template = getTemplate(templateKey);
    if (!template) throw new BadRequestException(`Unknown template "${templateKey}"`);

    const layout = parseStoreLayout(buildLayoutFromTemplate(template, shop.name));
    return this.themes.save(
      this.themes.create({
        shopId: shop.id,
        name: template.name,
        source: ThemeSource.TEMPLATE,
        templateKey: template.key,
        layout,
      }),
    );
  }

  async generateWithAi(shop: Shop, userId: string, description: string): Promise<Theme> {
    const { layout: generated } = await this.ai.generateStoreLayout(shop, userId, description.trim());
    // Uploaded fonts and logos only come from the seller.
    const { customFonts: _fonts, logoUrl: _logo, ...settings } = generated.settings;
    const builtIn = (font: string) => (isBuiltInFont(font) ? font : 'Inter');
    const layout: StoreLayout = {
      ...generated,
      settings: { ...settings, fonts: { heading: builtIn(settings.fonts.heading), body: builtIn(settings.fonts.body) } },
    };
    return this.themes.save(
      this.themes.create({
        shopId: shop.id,
        name: 'AI-generated design',
        source: ThemeSource.AI,
        templateKey: null,
        layout,
      }),
    );
  }

  async publish(shop: Shop, themeId: string): Promise<Theme> {
    const theme = await this.dataSource.transaction(async (manager) => {
      const target = await manager.findOne(Theme, {
        where: { id: themeId, shopId: shop.id, status: Not(ThemeStatus.ARCHIVED) },
      });
      if (!target) throw new NotFoundException('Design not found');

      await manager.update(
        Theme,
        { shopId: shop.id, status: ThemeStatus.PUBLISHED },
        { status: ThemeStatus.DRAFT },
      );
      target.status = ThemeStatus.PUBLISHED;
      target.publishedAt = new Date();
      return manager.save(target);
    });

    await this.storefrontCache.invalidate(shop.subdomain);
    this.logger.logWithBindings('info', { shopId: shop.id, themeId }, 'Theme published');
    return theme;
  }

  /** `withDraft` links the preview to a private draft slot the editor can fill with unsaved changes. */
  async createPreview(shop: Shop, themeId: string, withDraft = false): Promise<ThemePreview> {
    await this.getTheme(shop.id, themeId);

    const draftId = withDraft ? randomUUID() : null;
    const token = this.jwt.generateToken(
      { id: themeId, email: '', type: THEME_PREVIEW_TOKEN_TYPE, shopId: shop.id, ...(draftId && { draftId }) },
      `${PREVIEW_TTL_MINUTES}m`,
    );
    return { token, draftId, expiresAt: new Date(Date.now() + PREVIEW_TTL_MINUTES * 60_000) };
  }

  async setPreviewDraft(shop: Shop, input: ThemePreviewDraftInput): Promise<boolean> {
    await this.getTheme(shop.id, input.themeId);
    const layout = this.parseShopLayout(shop, input.layout);
    await this.storefrontCache.setPreviewDraft(
      shop.id,
      input.draftId,
      { themeId: input.themeId, layout },
      PREVIEW_TTL_MINUTES * 60,
    );
    return true;
  }
}
