import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1795251907726 implements MigrationInterface {
    name = 'Init1795251907726'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."ai_usage_feature_enum" AS ENUM('STORE_GENERATION')`);
        await queryRunner.query(`CREATE TABLE "ai_usage" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" uuid NOT NULL, "userId" uuid NOT NULL, "feature" "public"."ai_usage_feature_enum" NOT NULL, "provider" character varying NOT NULL, "model" character varying NOT NULL, "creditsCharged" integer NOT NULL, "inputTokens" integer NOT NULL DEFAULT '0', "outputTokens" integer NOT NULL DEFAULT '0', "succeeded" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_3dddab3a15520a9c3eba859195d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0399eda4d91c5424f2c9d34b4a" ON "ai_usage" ("shopId", "createdAt") `);
        await queryRunner.query(`CREATE TYPE "public"."shops_status_enum" AS ENUM('ACTIVE', 'SUSPENDED')`);
        await queryRunner.query(`CREATE TABLE "shops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "subdomain" character varying(32) NOT NULL, "status" "public"."shops_status_enum" NOT NULL DEFAULT 'ACTIVE', "currency" character varying(3) NOT NULL DEFAULT 'INR', "aiEnabled" boolean NOT NULL DEFAULT true, "aiCreditsBalance" integer NOT NULL DEFAULT '50', "ownerId" uuid NOT NULL, CONSTRAINT "PK_3c6aaa6607d287de99815e60b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f22c6ebedb44e48c75074c6c2f" ON "shops" ("subdomain") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."shop_members_role_enum" AS ENUM('OWNER', 'ADMIN', 'STAFF')`);
        await queryRunner.query(`CREATE TABLE "shop_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" uuid NOT NULL, "userId" uuid NOT NULL, "role" "public"."shop_members_role_enum" NOT NULL, CONSTRAINT "PK_5935c3cb1290b7c356cb72e97cc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_95987536a8f2c4710d16bded9d" ON "shop_members" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_28c4307e68c5b6cb990fe68f89" ON "shop_members" ("shopId", "userId") `);
        await queryRunner.query(`CREATE TYPE "public"."themes_source_enum" AS ENUM('TEMPLATE', 'AI')`);
        await queryRunner.query(`CREATE TYPE "public"."themes_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TABLE "themes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" uuid NOT NULL, "name" character varying NOT NULL, "source" "public"."themes_source_enum" NOT NULL, "templateKey" character varying, "layout" jsonb NOT NULL, "status" "public"."themes_status_enum" NOT NULL DEFAULT 'DRAFT', "publishedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ddbeaab913c18682e5c88155592" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_themes_one_published_per_shop" ON "themes" ("shopId") WHERE "status" = 'PUBLISHED'`);
        await queryRunner.query(`CREATE INDEX "IDX_7ba37c1e1c5e2840dbaacee68a" ON "themes" ("shopId", "status") `);
        await queryRunner.query(`ALTER TABLE "shop_members" ADD CONSTRAINT "FK_6ab7bb73973776c4fd0ab675228" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shop_members" ADD CONSTRAINT "FK_95987536a8f2c4710d16bded9d0" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "themes" ADD CONSTRAINT "FK_ea8477089f933a0ce6b241680be" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "themes" DROP CONSTRAINT "FK_ea8477089f933a0ce6b241680be"`);
        await queryRunner.query(`ALTER TABLE "shop_members" DROP CONSTRAINT "FK_95987536a8f2c4710d16bded9d0"`);
        await queryRunner.query(`ALTER TABLE "shop_members" DROP CONSTRAINT "FK_6ab7bb73973776c4fd0ab675228"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7ba37c1e1c5e2840dbaacee68a"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_themes_one_published_per_shop"`);
        await queryRunner.query(`DROP TABLE "themes"`);
        await queryRunner.query(`DROP TYPE "public"."themes_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."themes_source_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_28c4307e68c5b6cb990fe68f89"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_95987536a8f2c4710d16bded9d"`);
        await queryRunner.query(`DROP TABLE "shop_members"`);
        await queryRunner.query(`DROP TYPE "public"."shop_members_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f22c6ebedb44e48c75074c6c2f"`);
        await queryRunner.query(`DROP TABLE "shops"`);
        await queryRunner.query(`DROP TYPE "public"."shops_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0399eda4d91c5424f2c9d34b4a"`);
        await queryRunner.query(`DROP TABLE "ai_usage"`);
        await queryRunner.query(`DROP TYPE "public"."ai_usage_feature_enum"`);
    }

}
