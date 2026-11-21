import { MigrationInterface, QueryRunner } from "typeorm";

export class Commerce1795255200038 implements MigrationInterface {
    name = 'Commerce1795255200038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."billing_payments_kind_enum" AS ENUM('PLAN', 'AI_CREDITS')`);
        await queryRunner.query(`CREATE TYPE "public"."billing_payments_plan_enum" AS ENUM('FREE', 'STARTER', 'GROWTH')`);
        await queryRunner.query(`CREATE TYPE "public"."billing_payments_status_enum" AS ENUM('CREATED', 'PAID', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "billing_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" uuid NOT NULL, "userId" uuid NOT NULL, "kind" "public"."billing_payments_kind_enum" NOT NULL, "plan" "public"."billing_payments_plan_enum", "credits" integer NOT NULL DEFAULT '0', "amount" integer NOT NULL, "status" "public"."billing_payments_status_enum" NOT NULL DEFAULT 'CREATED', "gateway" character varying(16) NOT NULL, "gatewayOrderId" character varying(64) NOT NULL, "gatewayPaymentId" character varying(64), "paidAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c4e4866a41953b04f9229b273ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8cdb6eac5df0cbe0c1c29ddbb4" ON "billing_payments" ("gatewayOrderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_2917a75c17ef8172a70b08f6d0" ON "billing_payments" ("shopId", "createdAt") `);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING_PAYMENT', 'PLACED', 'SHIPPED', 'DELIVERED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_paymentmethod_enum" AS ENUM('COD', 'ONLINE')`);
        await queryRunner.query(`CREATE TYPE "public"."orders_paymentstatus_enum" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" uuid NOT NULL, "number" integer NOT NULL, "status" "public"."orders_status_enum" NOT NULL, "paymentMethod" "public"."orders_paymentmethod_enum" NOT NULL, "paymentStatus" "public"."orders_paymentstatus_enum" NOT NULL DEFAULT 'PENDING', "customer" jsonb NOT NULL, "shippingAddress" jsonb NOT NULL, "items" jsonb NOT NULL, "subtotal" integer NOT NULL, "shippingFee" integer NOT NULL, "total" integer NOT NULL, "tax" jsonb, "invoiceNumber" character varying(32), "note" character varying(500), "gateway" character varying(16), "gatewayOrderId" character varying(64), "gatewayPaymentId" character varying(64), "accessToken" character varying(64) NOT NULL, "trackingNumber" character varying(80), "trackingUrl" character varying(500), "expiresAt" TIMESTAMP WITH TIME ZONE, "paidAt" TIMESTAMP WITH TIME ZONE, "shippedAt" TIMESTAMP WITH TIME ZONE, "deliveredAt" TIMESTAMP WITH TIME ZONE, "cancelledAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9c4f6eebaa4118f4e21acdde19" ON "orders" ("gatewayOrderId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7f1600f11bda5e754f94ade239" ON "orders" ("accessToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_a827e8437c6ddac993842cc32f" ON "orders" ("status", "expiresAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_d145e086723c05989c22500a71" ON "orders" ("shopId", "createdAt") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_801fc29ee5b0faca142f3e7670" ON "orders" ("shopId", "number") `);
        await queryRunner.query(`CREATE TABLE "product_variants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "productId" uuid NOT NULL, "shopId" uuid NOT NULL, "optionValues" jsonb NOT NULL DEFAULT '[]', "title" character varying(160) NOT NULL DEFAULT '', "price" integer NOT NULL, "compareAtPrice" integer, "stock" integer, "sku" character varying(64), "position" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_281e3f2c55652d6a22c0aa59fd7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f919bfed65605ed75d569d336c" ON "product_variants" ("productId", "position") `);
        await queryRunner.query(`CREATE TYPE "public"."shops_plan_enum" AS ENUM('FREE', 'STARTER', 'GROWTH')`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "plan" "public"."shops_plan_enum" NOT NULL DEFAULT 'FREE'`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "planExpiresAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "codEnabled" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "shippingFee" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "freeShippingAbove" integer`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "razorpayKeyId" character varying(40)`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "razorpayKeySecretEnc" text`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "razorpayWebhookSecretEnc" text`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "paymentsTestMode" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "orderSeq" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "invoiceSeq" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "legalName" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "gstin" character varying(15)`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "businessAddress" text`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "stateCode" character varying(2)`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "defaultGstRate" integer NOT NULL DEFAULT '5'`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "contactEmail" character varying(160)`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "customDomain" character varying(253)`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "domainVerificationToken" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "shops" ADD "customDomainVerifiedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "products" ADD "options" jsonb NOT NULL DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "products" ADD "gstRate" integer`);
        await queryRunner.query(`ALTER TABLE "products" ADD "hsnCode" character varying(8)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5367a75417d7a5ade5ae6ee575" ON "shops" ("customDomain") WHERE "customDomain" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "product_variants" ADD CONSTRAINT "FK_f515690c571a03400a9876600b5" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_variants" DROP CONSTRAINT "FK_f515690c571a03400a9876600b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5367a75417d7a5ade5ae6ee575"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "hsnCode"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "gstRate"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "options"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "customDomainVerifiedAt"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "domainVerificationToken"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "customDomain"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "contactEmail"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "defaultGstRate"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "stateCode"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "businessAddress"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "gstin"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "legalName"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "invoiceSeq"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "orderSeq"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "paymentsTestMode"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "razorpayWebhookSecretEnc"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "razorpayKeySecretEnc"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "razorpayKeyId"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "freeShippingAbove"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "shippingFee"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "codEnabled"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "planExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "plan"`);
        await queryRunner.query(`DROP TYPE "public"."shops_plan_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f919bfed65605ed75d569d336c"`);
        await queryRunner.query(`DROP TABLE "product_variants"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_801fc29ee5b0faca142f3e7670"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d145e086723c05989c22500a71"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a827e8437c6ddac993842cc32f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7f1600f11bda5e754f94ade239"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9c4f6eebaa4118f4e21acdde19"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_paymentstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_paymentmethod_enum"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2917a75c17ef8172a70b08f6d0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8cdb6eac5df0cbe0c1c29ddbb4"`);
        await queryRunner.query(`DROP TABLE "billing_payments"`);
        await queryRunner.query(`DROP TYPE "public"."billing_payments_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."billing_payments_plan_enum"`);
        await queryRunner.query(`DROP TYPE "public"."billing_payments_kind_enum"`);
    }

}
