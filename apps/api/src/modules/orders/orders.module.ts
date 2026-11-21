import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, Shop } from '../../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorefrontModule } from '../storefront/storefront.module';
import { InvoiceController } from './invoice.controller';
import { OrdersResolver } from './orders.resolver';
import { OrdersService } from './orders.service';
import { RazorpayWebhookController } from './webhooks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Shop]), StorefrontModule, NotificationsModule],
  controllers: [RazorpayWebhookController, InvoiceController],
  providers: [OrdersService, OrdersResolver],
})
export class OrdersModule {}
