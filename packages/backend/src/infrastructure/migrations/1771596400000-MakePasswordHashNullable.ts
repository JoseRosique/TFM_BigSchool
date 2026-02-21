import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePasswordHashNullable1771596400000 implements MigrationInterface {
  name = 'MakePasswordHashNullable1771596400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: This migration cannot be safely reversed if there are NULL values
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password_hash" SET NOT NULL`);
  }
}
