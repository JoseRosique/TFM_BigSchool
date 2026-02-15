import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFriendshipsPairKey1760000000001 implements MigrationInterface {
  name = 'AddFriendshipsPairKey1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "friendships" ADD COLUMN IF NOT EXISTS "pair_key" character varying(73)',
    );
    await queryRunner.query('ALTER TABLE "friendships" ADD COLUMN IF NOT EXISTS "blocked_by" uuid');

    await queryRunner.query(
      'UPDATE "friendships" SET "pair_key" = LEAST("requester_id", "recipient_id") || ":" || GREATEST("requester_id", "recipient_id") WHERE "pair_key" IS NULL',
    );

    await queryRunner.query('ALTER TABLE "friendships" ALTER COLUMN "pair_key" SET NOT NULL');

    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "uq_friendships_pair_key" ON "friendships" ("pair_key")',
    );

    await queryRunner.query(
      'ALTER TABLE "friendships" ADD CONSTRAINT "chk_friendships_requester_recipient" CHECK ("requester_id" <> "recipient_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "friendships" DROP CONSTRAINT IF EXISTS "chk_friendships_requester_recipient"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "uq_friendships_pair_key"');
    await queryRunner.query('ALTER TABLE "friendships" DROP COLUMN IF EXISTS "pair_key"');
    await queryRunner.query('ALTER TABLE "friendships" DROP COLUMN IF EXISTS "blocked_by"');
  }
}
