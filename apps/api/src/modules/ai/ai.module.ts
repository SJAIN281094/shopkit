import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiUsage, Shop } from '../../entities';
import { AiService } from './ai.service';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { MockAiProvider } from './providers/mock.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, AiUsage])],
  providers: [
    MockAiProvider,
    {
      provide: AI_PROVIDER,
      inject: [ConfigService, MockAiProvider],
      useFactory: (config: ConfigService, mock: MockAiProvider) => {
        const name = config.get<string>('aiProvider');
        switch (name) {
          case 'mock':
            return mock;
          default:
            throw new Error(`Unknown AI_PROVIDER "${name}". Supported: mock`);
        }
      },
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
