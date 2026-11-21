import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@arhaminnovations/nestjs-identity';
import { CurrentShop } from '../../common/current-shop.decorator';
import type { ShopContext } from '../../common/request.util';
import { ShopAccessGuard } from '../../common/shop-access.guard';
import { MAX_FONT_BYTES, MAX_IMAGE_BYTES, StorageService, type StoredFile } from './storage.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard, ShopAccessGuard)
export class UploadController {
  constructor(private readonly storage: StorageService) {}

  @Post('images')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  uploadImage(
    @CurrentShop() { shop }: ShopContext,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<StoredFile> {
    if (!file) throw new BadRequestException('Attach an image in the "file" field');
    return this.storage.uploadShopImage(shop.id, file.buffer);
  }

  @Post('fonts')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FONT_BYTES, files: 1 } }))
  uploadFont(
    @CurrentShop() { shop }: ShopContext,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<StoredFile> {
    if (!file) throw new BadRequestException('Attach a font file in the "file" field');
    return this.storage.uploadShopFont(shop.id, file.buffer);
  }
}
