import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from '../../entities';
import { StorefrontModule } from '../storefront/storefront.module';
import { DomainCheckController } from './domain-check.controller';
import { SettingsResolver } from './settings.resolver';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shop]), StorefrontModule],
  controllers: [DomainCheckController],
  providers: [SettingsService, SettingsResolver],
})
export class SettingsModule {}
