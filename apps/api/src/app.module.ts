import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { CryptoModule } from '@arhaminnovations/nestjs-crypto';
import { IdentityModule } from '@arhaminnovations/nestjs-identity';
import { PaymentModule } from '@arhaminnovations/nestjs-payment';
import { LoggingModule, RequestIdMiddleware } from '@arhaminnovations/nestjs-pino-logger';
import { RedisModule } from '@arhaminnovations/nestjs-redis';
import configuration, { type AppConfig } from './config/configuration';
import { CommonModule } from './common/common.module';
import { ENTITIES } from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ShopModule } from './modules/shop/shop.module';
import { StorageModule } from './modules/storage/storage.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { ThemeModule } from './modules/theme/theme.module';

type Config = ConfigService<AppConfig, true>;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '.env'),
      load: [configuration],
    }),
    LoggingModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: Config) => {
        const isDev = config.get('nodeEnv', { infer: true }) !== 'production';
        return {
          appName: config.get('appName', { infer: true }),
          environment: isDev ? 'development' : 'production',
          level: config.get('logLevel', { infer: true }),
          enablePrettyPrint: isDev,
          enableJsonLogs: !isDev,
          redactFields: ['password', 'passwordHash', 'token', 'accessToken', 'authorization', 'previewToken'],
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: Config) => {
        const db = config.get('database', { infer: true });
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.name,
          ssl: db.ssl,
          entities: ENTITIES,
          synchronize: false,
          migrationsRun: true,
          migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
          migrationsTableName: 'typeorm_migrations',
        };
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
    }),
    IdentityModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: Config) => ({
        jwt: {
          secret: config.get('jwtSecret', { infer: true }),
          expiresIn: '24h',
          refreshExpiresIn: '7d',
          issuer: 'shopkit',
        },
      }),
    }),
    CryptoModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: Config) => ({
        hashing: { saltRounds: 12 },
        aes: { key: config.get('encryptionKey', { infer: true }) },
      }),
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: Config) => config.get('redis', { infer: true }),
    }),
    PaymentModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: Config) => ({ razorpay: config.get('razorpay', { infer: true }) }),
    }),
    CommonModule,
    StorageModule,
    PaymentsModule,
    AuthModule,
    ShopModule,
    SettingsModule,
    StorefrontModule,
    ThemeModule,
    CatalogModule,
    OrdersModule,
    BillingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
