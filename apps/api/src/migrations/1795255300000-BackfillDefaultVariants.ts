import { MigrationInterface, QueryRunner } from 'typeorm';

/** Products created before variants existed get their single default variant. */
export class BackfillDefaultVariants1795255300000 implements MigrationInterface {
  name = 'BackfillDefaultVariants1795255300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "product_variants" ("productId", "shopId", "price", "compareAtPrice", "stock")
       SELECT p."id", p."shopId", p."price", p."compareAtPrice", p."stock" FROM "products" p
       WHERE NOT EXISTS (SELECT 1 FROM "product_variants" v WHERE v."productId" = p."id")`,
    );
  }

  public async down(): Promise<void> {}
}
