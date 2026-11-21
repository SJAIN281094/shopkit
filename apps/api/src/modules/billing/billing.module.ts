import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingPayment, Product, Shop } from '../../entities';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingResolver } from './billing.resolver';
import { BillingService } from './billing.service';

@Module({
  imports: [TypeOrmModule.forFeature([BillingPayment, Shop, Product])],
  controllers: [BillingWebhookController],
  providers: [BillingService, BillingResolver],
})
export class BillingModule {}
