import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Theme } from '../../entities';
import { AiModule } from '../ai/ai.module';
import { StorefrontModule } from '../storefront/storefront.module';
import { ThemeResolver } from './theme.resolver';
import { ThemeService } from './theme.service';

@Module({
  imports: [TypeOrmModule.forFeature([Theme]), AiModule, StorefrontModule],
  providers: [ThemeService, ThemeResolver],
})
export class ThemeModule {}
