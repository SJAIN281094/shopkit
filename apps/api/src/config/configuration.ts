import { createHash } from 'node:crypto';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  appName: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  allowedOrigins: string[];
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    ssl: boolean;
  };
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  jwtSecret: string;
  storefrontRootDomain: string;
  aiProvider: string;
  storage: {
    driver: 'local' | 's3';
    /** Base URL images are served from; uploaded file keys are appended to it. */
    publicUrl: string;
    localDir: string;
    aws: {
      region: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      bucket: string;
      endpoint?: string;
    };
  };
  /** Platform Razorpay account: sellers pay shopkit for plans and AI credits here. */
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret?: string;
  };
  /** 64 hex characters; encrypts sellers' payment secrets at rest. */
  encryptionKey: string;
  /** Lets sellers use a fake payment gateway. Never enabled in production. */
  testPaymentsAllowed: boolean;
  /** Public URL of this API, used in links sent to buyers (invoices). */
  apiPublicUrl: string;
  /** Storefront URL scheme and port suffix, e.g. "http" and ":3020" in development. */
  storefrontProtocol: string;
  storefrontPort: string;
  /** Shared with the storefront server so it can pass on buyers' IP addresses. */
  storefrontApiKey: string;
  /** Custom domains point a CNAME here. */
  customDomainTarget: string;
  notifyr: {
    url: string;
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
}

function requiredInProduction(name: string, nodeEnv: string, devDefault: string): string {
  const value = process.env[name] ?? '';
  if (value) return value;
  if (nodeEnv === 'production') throw new Error(`${name} must be set in production`);
  return devDefault;
}

function encryptionKey(nodeEnv: string, jwtSecret: string): string {
  const key = process.env.ENCRYPTION_KEY ?? '';
  if (key) {
    if (!/^[0-9a-f]{64}$/i.test(key)) throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    return key;
  }
  if (nodeEnv === 'production') throw new Error('ENCRYPTION_KEY must be set in production');
  return createHash('sha256').update(`shopkit-dev:${jwtSecret}`).digest('hex');
}

function storageConfig(nodeEnv: string): AppConfig['storage'] {
  const driver = process.env.STORAGE_DRIVER === 's3' ? 's3' : 'local';
  const bucket = process.env.S3_BUCKET ?? '';
  const region = process.env.AWS_REGION ?? 'ap-south-1';
  if (driver === 's3' && !bucket) throw new Error('S3_BUCKET must be set when STORAGE_DRIVER=s3');
  if (driver === 'local' && nodeEnv === 'production') {
    throw new Error('STORAGE_DRIVER=local is for development only; use s3 in production');
  }

  const port = Number(process.env.PORT ?? 4000);
  const defaultPublicUrl =
    driver === 's3' ? `https://${bucket}.s3.${region}.amazonaws.com` : `http://localhost:${port}/uploads`;

  return {
    driver,
    publicUrl: (process.env.STORAGE_PUBLIC_URL || defaultPublicUrl).replace(/\/+$/, ''),
    localDir: process.env.UPLOADS_DIR ?? 'uploads',
    aws: {
      region,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
      bucket,
      endpoint: process.env.S3_ENDPOINT || undefined,
    },
  };
}

export default (): AppConfig => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const jwtSecret = process.env.JWT_SECRET ?? '';
  if (!jwtSecret && nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }

  const port = Number(process.env.PORT ?? 4000);
  const rootDomain = (process.env.STOREFRONT_ROOT_DOMAIN ?? 'localhost').toLowerCase();

  return {
    nodeEnv,
    port,
    appName: process.env.APP_NAME ?? 'shopkit-api',
    logLevel: (process.env.LOG_LEVEL as AppConfig['logLevel']) ?? 'info',
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3010')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    database: {
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: Number(process.env.DATABASE_PORT ?? 5442),
      username: process.env.DATABASE_USER ?? 'shopkit',
      password: process.env.DATABASE_PASSWORD ?? 'shopkit',
      name: process.env.DATABASE_NAME ?? 'shopkit',
      ssl: process.env.DATABASE_SSL === 'true',
    },
    redis: {
      enabled: !!process.env.REDIS_HOST,
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      username: process.env.REDIS_USER || undefined,
      password: process.env.REDIS_PASSWORD || undefined,
    },
    jwtSecret: jwtSecret || 'dev-only-insecure-secret',
    storefrontRootDomain: rootDomain,
    aiProvider: process.env.AI_PROVIDER ?? 'mock',
    storage: storageConfig(nodeEnv),
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID ?? '',
      keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || undefined,
    },
    encryptionKey: encryptionKey(nodeEnv, jwtSecret || 'dev-only-insecure-secret'),
    testPaymentsAllowed: nodeEnv !== 'production',
    apiPublicUrl: (process.env.API_PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
    storefrontProtocol: process.env.STOREFRONT_PROTOCOL ?? (nodeEnv === 'production' ? 'https' : 'http'),
    storefrontPort: process.env.STOREFRONT_PORT ? `:${process.env.STOREFRONT_PORT}` : '',
    storefrontApiKey: requiredInProduction('STOREFRONT_API_KEY', nodeEnv, 'dev-storefront-key'),
    customDomainTarget: process.env.CUSTOM_DOMAIN_TARGET || `stores.${rootDomain}`,
    notifyr: {
      url: (process.env.NOTIFYR_URL ?? '').replace(/\/+$/, ''),
      apiKey: process.env.NOTIFYR_API_KEY ?? '',
      fromEmail: process.env.NOTIFYR_FROM_EMAIL ?? 'orders@shopkit.in',
      fromName: process.env.NOTIFYR_FROM_NAME ?? 'Shopkit',
    },
  };
};
