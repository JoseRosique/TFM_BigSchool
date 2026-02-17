import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1771353510728 implements MigrationInterface {
    name = 'InitialSchema1771353510728'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "description" text, "icon" character varying(64) NOT NULL, "color" character varying(32) NOT NULL, "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6313274afd75b4675e1da6ac1a" ON "groups" ("owner_id", "name") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "nickname" character varying(100) NOT NULL, "location" character varying(255), "timezone" character varying(50) NOT NULL DEFAULT 'UTC', "language" character varying(10) NOT NULL DEFAULT 'es', "theme" character varying(10) NOT NULL DEFAULT 'dark', "emailNotifications" boolean NOT NULL DEFAULT true, "pushNotifications" boolean NOT NULL DEFAULT true, "twoFactorEnabled" boolean NOT NULL DEFAULT false, "avatar_url" character varying(255), "password_changed_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_ad02a1be8707004cb805a4b5023" UNIQUE ("nickname"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."slots_visibility_scope_enum" AS ENUM('private', 'friends', 'list')`);
        await queryRunner.query(`CREATE TYPE "public"."slots_status_enum" AS ENUM('available', 'reserved', 'canceled')`);
        await queryRunner.query(`CREATE TABLE "slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" uuid NOT NULL, "start" TIMESTAMP WITH TIME ZONE NOT NULL, "end" TIMESTAMP WITH TIME ZONE NOT NULL, "timezone" character varying(50) NOT NULL, "visibility_scope" "public"."slots_visibility_scope_enum" NOT NULL DEFAULT 'private', "notes" text, "status" "public"."slots_status_enum" NOT NULL DEFAULT 'available', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8b553bb1941663b63fd38405e42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bc35dd351e73b7e421628aed41" ON "slots" ("status", "start") `);
        await queryRunner.query(`CREATE INDEX "IDX_7ac9e43edc2ef91498a61cf130" ON "slots" ("owner_id", "start") `);
        await queryRunner.query(`CREATE TYPE "public"."reservations_status_enum" AS ENUM('created', 'canceled')`);
        await queryRunner.query(`CREATE TABLE "reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slot_id" uuid NOT NULL, "user_id" uuid NOT NULL, "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'created', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "canceled_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_reservations_slot_active" ON "reservations" ("slot_id") WHERE "status" = 'created'`);
        await queryRunner.query(`CREATE INDEX "IDX_e040d142ef31f0995f8089a306" ON "reservations" ("slot_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a3b7f9fd855a1205b97c2453e" ON "reservations" ("user_id", "created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."friendships_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'BLOCKED')`);
        await queryRunner.query(`CREATE TABLE "friendships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requester_id" uuid NOT NULL, "recipient_id" uuid NOT NULL, "pair_key" character varying(73), "blocked_by" uuid, "status" "public"."friendships_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_1beb1b485ac99a4fdd43898aa4" CHECK (requester_id <> recipient_id), CONSTRAINT "PK_08af97d0be72942681757f07bc8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_65a5ecb896ed4ad0b8de79d83a" ON "friendships" ("requester_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_aa4b3cb2a50e952e13b811b6ef" ON "friendships" ("recipient_id", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6f9d79b3a5687dc3295c5d32bc" ON "friendships" ("pair_key") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_05d5f8ca22aa4c55bd8a8d15c7" ON "friendships" ("requester_id", "recipient_id") `);
        await queryRunner.query(`CREATE TABLE "group_members" ("group_id" uuid NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_f5939ee0ad233ad35e03f5c65c1" PRIMARY KEY ("group_id", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2c840df5db52dc6b4a1b0b69c6" ON "group_members" ("group_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_20a555b299f75843aa53ff8b0e" ON "group_members" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "slot_groups" ("slot_id" uuid NOT NULL, "group_id" uuid NOT NULL, CONSTRAINT "PK_d3b72e728507b35fcbf6f0dca50" PRIMARY KEY ("slot_id", "group_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e5a38a74c5ceb38237057be829" ON "slot_groups" ("slot_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_14f3d78abdc3901f3d5b8854b0" ON "slot_groups" ("group_id") `);
        await queryRunner.query(`ALTER TABLE "groups" ADD CONSTRAINT "FK_5d7af25843377def343ab0beaa8" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slots" ADD CONSTRAINT "FK_1bbc22a25a137ac89672c7d99b4" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_e040d142ef31f0995f8089a3066" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_4af5055a871c46d011345a255a6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_4cf3c68ed4a5a9fde8d4c2b7319" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_721201df6b9dbd63e0f86958cc6" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_20a555b299f75843aa53ff8b0ee" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slot_groups" ADD CONSTRAINT "FK_e5a38a74c5ceb38237057be8298" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "slot_groups" ADD CONSTRAINT "FK_14f3d78abdc3901f3d5b8854b03" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slot_groups" DROP CONSTRAINT "FK_14f3d78abdc3901f3d5b8854b03"`);
        await queryRunner.query(`ALTER TABLE "slot_groups" DROP CONSTRAINT "FK_e5a38a74c5ceb38237057be8298"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_20a555b299f75843aa53ff8b0ee"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e"`);
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_721201df6b9dbd63e0f86958cc6"`);
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_4cf3c68ed4a5a9fde8d4c2b7319"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_4af5055a871c46d011345a255a6"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_e040d142ef31f0995f8089a3066"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP CONSTRAINT "FK_1bbc22a25a137ac89672c7d99b4"`);
        await queryRunner.query(`ALTER TABLE "groups" DROP CONSTRAINT "FK_5d7af25843377def343ab0beaa8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_14f3d78abdc3901f3d5b8854b0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e5a38a74c5ceb38237057be829"`);
        await queryRunner.query(`DROP TABLE "slot_groups"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_20a555b299f75843aa53ff8b0e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2c840df5db52dc6b4a1b0b69c6"`);
        await queryRunner.query(`DROP TABLE "group_members"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_05d5f8ca22aa4c55bd8a8d15c7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6f9d79b3a5687dc3295c5d32bc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aa4b3cb2a50e952e13b811b6ef"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_65a5ecb896ed4ad0b8de79d83a"`);
        await queryRunner.query(`DROP TABLE "friendships"`);
        await queryRunner.query(`DROP TYPE "public"."friendships_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a3b7f9fd855a1205b97c2453e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e040d142ef31f0995f8089a306"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reservations_slot_active"`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7ac9e43edc2ef91498a61cf130"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bc35dd351e73b7e421628aed41"`);
        await queryRunner.query(`DROP TABLE "slots"`);
        await queryRunner.query(`DROP TYPE "public"."slots_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."slots_visibility_scope_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6313274afd75b4675e1da6ac1a"`);
        await queryRunner.query(`DROP TABLE "groups"`);
    }

}
