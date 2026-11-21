import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop, Theme } from '../../entities';
import { StorefrontCacheService } from './storefront-cache.service';
import { StorefrontResolver } from './storefront.resolver';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, Theme])],
  providers: [StorefrontService, StorefrontCacheService, StorefrontResolver],
  exports: [StorefrontService, StorefrontCacheService],
})
export class StorefrontModule {}
