import { MigrationInterface, QueryRunner } from "typeorm";

export class Catalog1795253041152 implements MigrationInterface {
    name = 'Catalog1795253041152'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "collections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" uuid NOT NULL, "name" character varying(80) NOT NULL, "handle" character varying(80) NOT NULL, "description" text NOT NULL DEFAULT '', CONSTRAINT "PK_21c00b1ebbd41ba1354242c5c4e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6a8cff3c4a08502a1b8cdc93f8" ON "collections" ("shopId", "handle") `);
        await queryRunner.query(`CREATE TYPE "public"."products_status_enum" AS ENUM('ACTIVE', 'DRAFT')`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" uuid NOT NULL, "title" character varying(120) NOT NULL, "handle" character varying(140) NOT NULL, "description" text NOT NULL DEFAULT '', "price" integer NOT NULL, "compareAtPrice" integer, "stock" integer, "images" jsonb NOT NULL DEFAULT '[]', "status" "public"."products_status_enum" NOT NULL DEFAULT 'ACTIVE', "collectionId" uuid, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3ab0a56d4ada8de5d8f251e726" ON "products" ("shopId", "status", "createdAt") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_54a2d169c70455fd3242e8d73d" ON "products" ("shopId", "handle") `);
        await queryRunner.query(`ALTER TYPE "public"."ai_usage_feature_enum" RENAME TO "ai_usage_feature_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."ai_usage_feature_enum" AS ENUM('STORE_GENERATION', 'PRODUCT_LISTING')`);
        await queryRunner.query(`ALTER TABLE "ai_usage" ALTER COLUMN "feature" TYPE "public"."ai_usage_feature_enum" USING "feature"::"text"::"public"."ai_usage_feature_enum"`);
        await queryRunner.query(`DROP TYPE "public"."ai_usage_feature_enum_old"`);
        await queryRunner.query(`ALTER TABLE "collections" ADD CONSTRAINT "FK_3e9bc07cb27887e94e12e81bd43" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_51a281693ebef6fa8729de39381" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_53823b875c14daa5e9009ee6839" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_53823b875c14daa5e9009ee6839"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_51a281693ebef6fa8729de39381"`);
        await queryRunner.query(`ALTER TABLE "collections" DROP CONSTRAINT "FK_3e9bc07cb27887e94e12e81bd43"`);
        await queryRunner.query(`CREATE TYPE "public"."ai_usage_feature_enum_old" AS ENUM('STORE_GENERATION')`);
        await queryRunner.query(`ALTER TABLE "ai_usage" ALTER COLUMN "feature" TYPE "public"."ai_usage_feature_enum_old" USING "feature"::"text"::"public"."ai_usage_feature_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."ai_usage_feature_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."ai_usage_feature_enum_old" RENAME TO "ai_usage_feature_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_54a2d169c70455fd3242e8d73d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3ab0a56d4ada8de5d8f251e726"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6a8cff3c4a08502a1b8cdc93f8"`);
        await queryRunner.query(`DROP TABLE "collections"`);
    }

}
