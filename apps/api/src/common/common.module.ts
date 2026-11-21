import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopMember } from '../entities';
import { ShopAccessGuard } from './shop-access.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ShopMember])],
  providers: [ShopAccessGuard],
  exports: [ShopAccessGuard, TypeOrmModule],
})
export class CommonModule {}
