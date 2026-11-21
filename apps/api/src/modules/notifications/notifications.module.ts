import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities';
import { StorefrontModule } from '../storefront/storefront.module';
import { NotificationsService } from './notifications.service';
import { NotifyrClient } from './notifyr.client';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StorefrontModule],
  providers: [NotifyrClient, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
