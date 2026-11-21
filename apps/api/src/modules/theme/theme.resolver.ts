import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, GqlJwtAuthGuard, type JwtPayload } from '@arhaminnovations/nestjs-identity';
import { CurrentShop } from '../../common/current-shop.decorator';
import type { ShopContext } from '../../common/request.util';
import { ShopAccessGuard } from '../../common/shop-access.guard';
import { AiFeature, Theme } from '../../entities';
import { AI_CREDIT_COSTS } from '../ai/ai.service';
import { ThemeService } from './theme.service';
import {
  CreateThemeFromTemplateInput,
  CreateThemePreviewInput,
  GenerateThemeInput,
  ThemeIdInput,
  ThemePreview,
  ThemePreviewDraftInput,
  ThemeTemplateInfo,
  UpdateThemeInput,
} from './theme.types';

@Resolver()
export class ThemeResolver {
  constructor(private readonly themeService: ThemeService) {}

  @Query(() => [ThemeTemplateInfo])
  themeTemplates(): ThemeTemplateInfo[] {
    return this.themeService.listTemplates();
  }

  @Query(() => Int, { description: 'AI credits charged for one store generation' })
  aiStoreGenerationCost(): number {
    return AI_CREDIT_COSTS[AiFeature.STORE_GENERATION];
  }

  @Query(() => [Theme])
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  themes(@CurrentShop() { shop }: ShopContext): Promise<Theme[]> {
    return this.themeService.listThemes(shop.id);
  }

  @Query(() => Theme)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  theme(@CurrentShop() { shop }: ShopContext, @Args('id', { type: () => ID }, ParseUUIDPipe) id: string): Promise<Theme> {
    return this.themeService.getTheme(shop.id, id);
  }

  @Mutation(() => Theme, { description: 'Saves design edits; edits to the live design go live immediately' })
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  updateTheme(@CurrentShop() { shop }: ShopContext, @Args('input') input: UpdateThemeInput): Promise<Theme> {
    return this.themeService.update(shop, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  deleteTheme(@CurrentShop() { shop }: ShopContext, @Args('input') input: ThemeIdInput): Promise<boolean> {
    return this.themeService.archive(shop, input.themeId);
  }

  @Mutation(() => Theme)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  createThemeFromTemplate(
    @CurrentShop() { shop }: ShopContext,
    @Args('input') input: CreateThemeFromTemplateInput,
  ): Promise<Theme> {
    return this.themeService.createFromTemplate(shop, input.templateKey);
  }

  @Mutation(() => Theme, { description: 'Uses AI credits' })
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  generateThemeWithAi(
    @CurrentUser() user: JwtPayload,
    @CurrentShop() { shop }: ShopContext,
    @Args('input') input: GenerateThemeInput,
  ): Promise<Theme> {
    return this.themeService.generateWithAi(shop, user.id, input.description);
  }

  @Mutation(() => Theme)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  publishTheme(@CurrentShop() { shop }: ShopContext, @Args('input') input: ThemeIdInput): Promise<Theme> {
    return this.themeService.publish(shop, input.themeId);
  }

  @Mutation(() => ThemePreview)
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  createThemePreview(
    @CurrentShop() { shop }: ShopContext,
    @Args('input') input: CreateThemePreviewInput,
  ): Promise<ThemePreview> {
    return this.themeService.createPreview(shop, input.themeId, input.withDraft ?? false);
  }

  @Mutation(() => Boolean, { description: 'Shows unsaved editor changes in a draft preview; nothing is saved' })
  @UseGuards(GqlJwtAuthGuard, ShopAccessGuard)
  setThemePreviewDraft(
    @CurrentShop() { shop }: ShopContext,
    @Args('input') input: ThemePreviewDraftInput,
  ): Promise<boolean> {
    return this.themeService.setPreviewDraft(shop, input);
  }
}
