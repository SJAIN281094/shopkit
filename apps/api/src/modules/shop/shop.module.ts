import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop, ShopMember } from '../../entities';
import { ShopResolver } from './shop.resolver';
import { ShopService } from './shop.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, ShopMember])],
  providers: [ShopService, ShopResolver],
})
export class ShopModule {}
