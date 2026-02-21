import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultAvatarUrl1771596500000 implements MigrationInterface {
  name = 'AddDefaultAvatarUrl1771596500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar default value a avatar_url para nuevos usuarios
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "avatar_url" SET DEFAULT '/assets/avatars/avatar-1.svg'`,
    );

    // Opcional: actualizar usuarios existentes sin avatar
    await queryRunner.query(
      `UPDATE "users" SET "avatar_url" = '/assets/avatars/avatar-1.svg' WHERE "avatar_url" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert backfilled avatar_url values to NULL before dropping the default
    await queryRunner.query(
      `UPDATE "users" SET "avatar_url" = NULL WHERE "avatar_url" = '/assets/avatars/avatar-1.svg'`,
    );

    // Remove the default constraint
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "avatar_url" DROP DEFAULT`);
  }
}
