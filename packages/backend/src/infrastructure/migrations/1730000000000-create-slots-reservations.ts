import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSlotsReservations1730000000000 implements MigrationInterface {
  name = 'CreateSlotsReservations1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(
      "CREATE TYPE \"slot_visibility_scope_enum\" AS ENUM ('private', 'friends', 'list')",
    );
    await queryRunner.query(
      "CREATE TYPE \"slot_status_enum\" AS ENUM ('available', 'reserved', 'canceled')",
    );
    await queryRunner.query(
      "CREATE TYPE \"reservation_status_enum\" AS ENUM ('created', 'canceled')",
    );

    await queryRunner.query(`
      CREATE TABLE "slots" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_id" uuid NOT NULL,
        "start" timestamptz NOT NULL,
        "end" timestamptz NOT NULL,
        "timezone" varchar(50) NOT NULL,
        "visibility_scope" "slot_visibility_scope_enum" NOT NULL DEFAULT 'private',
        "notes" text,
        "status" "slot_status_enum" NOT NULL DEFAULT 'available',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_slots_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_slots_start_end" CHECK ("start" < "end")
      )
    `);

    await queryRunner.query(
      'CREATE INDEX "idx_slots_owner_start" ON "slots" ("owner_id", "start")',
    );
    await queryRunner.query('CREATE INDEX "idx_slots_status_start" ON "slots" ("status", "start")');

    await queryRunner.query(`
      CREATE TABLE "reservations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "slot_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" "reservation_status_enum" NOT NULL DEFAULT 'created',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "canceled_at" timestamptz,
        CONSTRAINT "fk_reservations_slot" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_reservations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query('CREATE INDEX "idx_reservations_user" ON "reservations" ("user_id")');
    await queryRunner.query('CREATE INDEX "idx_reservations_slot" ON "reservations" ("slot_id")');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uq_reservations_slot_active" ON "reservations" ("slot_id") WHERE "status" = \'created\'',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "uq_reservations_slot_active"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_reservations_slot"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_reservations_user"');
    await queryRunner.query('DROP TABLE IF EXISTS "reservations"');

    await queryRunner.query('DROP INDEX IF EXISTS "idx_slots_status_start"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_slots_owner_start"');
    await queryRunner.query('DROP TABLE IF EXISTS "slots"');

    await queryRunner.query('DROP TYPE IF EXISTS "reservation_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "slot_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "slot_visibility_scope_enum"');
  }
}
