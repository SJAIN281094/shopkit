import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { S3Service } from '@arhaminnovations/nestjs-aws';
import type { AppConfig } from '../../config/configuration';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_FONT_BYTES = 2 * 1024 * 1024;

interface FileType {
  ext: string;
  contentType: string;
  matches: (b: Buffer) => boolean;
}

const startsWith = (b: Buffer, ascii: string) => b.subarray(0, ascii.length).toString('latin1') === ascii;

// Detected from file contents, not the client-supplied type. SVG is deliberately excluded (it can carry scripts).
const IMAGE_TYPES: FileType[] = [
  { ext: 'jpg', contentType: 'image/jpeg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: 'png',
    contentType: 'image/png',
    matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    ext: 'webp',
    contentType: 'image/webp',
    matches: (b) => startsWith(b, 'RIFF') && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  { ext: 'gif', contentType: 'image/gif', matches: (b) => startsWith(b, 'GIF8') },
];

const FONT_TYPES: FileType[] = [
  { ext: 'woff2', contentType: 'font/woff2', matches: (b) => startsWith(b, 'wOF2') },
  { ext: 'woff', contentType: 'font/woff', matches: (b) => startsWith(b, 'wOFF') },
  { ext: 'otf', contentType: 'font/otf', matches: (b) => startsWith(b, 'OTTO') },
  {
    ext: 'ttf',
    contentType: 'font/ttf',
    matches: (b) => b.subarray(0, 4).equals(Buffer.from([0, 1, 0, 0])) || startsWith(b, 'true'),
  },
];

export interface StoredFile {
  key: string;
  url: string;
}

@Injectable()
export class StorageService {
  private readonly storage: AppConfig['storage'];

  constructor(
    config: ConfigService<AppConfig, true>,
    @Optional() private readonly s3?: S3Service | null,
  ) {
    this.storage = config.get('storage', { infer: true });
    if (this.storage.driver === 's3' && !this.s3) throw new Error('S3 storage selected but S3Service is not configured');
  }

  get localRoot(): string {
    return resolve(process.cwd(), this.storage.localDir);
  }

  uploadShopImage(shopId: string, data: Buffer): Promise<StoredFile> {
    if (data.length > MAX_IMAGE_BYTES) throw new BadRequestException('Images must be 5 MB or smaller');
    const type = IMAGE_TYPES.find((t) => t.matches(data));
    if (data.length && !type) throw new BadRequestException('Only JPG, PNG, WebP or GIF images are allowed');
    return this.store(shopId, data, type);
  }

  uploadShopFont(shopId: string, data: Buffer): Promise<StoredFile> {
    if (data.length > MAX_FONT_BYTES) throw new BadRequestException('Font files must be 2 MB or smaller');
    const type = FONT_TYPES.find((t) => t.matches(data));
    if (data.length && !type) throw new BadRequestException('Only WOFF2, WOFF, TTF or OTF font files are allowed');
    return this.store(shopId, data, type);
  }

  private async store(shopId: string, data: Buffer, type: FileType | undefined): Promise<StoredFile> {
    if (data.length === 0 || !type) throw new BadRequestException('The file is empty');
    const key = `shops/${shopId}/${randomUUID()}.${type.ext}`;
    if (this.storage.driver === 's3') {
      await this.s3!.upload(key, data, type.contentType);
    } else {
      const path = join(this.localRoot, key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, data);
    }
    return { key, url: this.urlFor(key) };
  }

  urlFor(key: string): string {
    return `${this.storage.publicUrl}/${key}`;
  }

  /** True when the URL points at a file this shop uploaded. */
  isShopUpload(url: string, shopId: string): boolean {
    const prefix = this.urlFor(`shops/${shopId}/`);
    return url.startsWith(prefix) && !url.slice(prefix.length).includes('/');
  }
}
