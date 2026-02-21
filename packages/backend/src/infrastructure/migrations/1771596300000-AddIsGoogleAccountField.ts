import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsGoogleAccountField1771596300000 implements MigrationInterface {
  name = 'AddIsGoogleAccountField1771596300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_google_account" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_google_account"`);
  }
}
