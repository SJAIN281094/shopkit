import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsModule } from '@arhaminnovations/nestjs-aws';
import type { AppConfig } from '../../config/configuration';
import { StorageService } from './storage.service';
import { UploadController } from './upload.controller';

@Global()
@Module({
  imports: [
    AwsModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const { driver, aws } = config.get('storage', { infer: true });
        return {
          region: aws.region,
          accessKeyId: aws.accessKeyId,
          secretAccessKey: aws.secretAccessKey,
          s3: driver === 's3' ? { bucket: aws.bucket, endpoint: aws.endpoint } : undefined,
        };
      },
    }),
  ],
  controllers: [UploadController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
