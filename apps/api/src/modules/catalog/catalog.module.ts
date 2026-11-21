import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Collection, Product } from '../../entities';
import { AiModule } from '../ai/ai.module';
import { StorefrontModule } from '../storefront/storefront.module';
import { CatalogResolver } from './catalog.resolver';
import { CatalogService } from './catalog.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Collection]), StorefrontModule, AiModule],
  providers: [CatalogService, CatalogResolver],
  exports: [CatalogService],
})
export class CatalogModule {}
