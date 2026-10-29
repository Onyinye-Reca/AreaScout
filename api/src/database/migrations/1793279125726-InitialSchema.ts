import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1793279125726 implements MigrationInterface {
    name = 'InitialSchema1793279125726'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "saved_searches" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "name" character varying NOT NULL, "filters" text NOT NULL, "alerts" boolean NOT NULL DEFAULT true, "created_at" character varying NOT NULL, "last_seen_at" character varying NOT NULL, CONSTRAINT "PK_d9a53c71ccc5cf66dcdc5b33dfe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8f01d13ac8e7b451d244674274" ON "saved_searches"  ("user_id") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying NOT NULL DEFAULT '', "role" character varying NOT NULL, "password_hash" character varying NOT NULL, "verified" boolean NOT NULL DEFAULT false, "notification_prefs" text NOT NULL DEFAULT '{}', "suspended" boolean NOT NULL DEFAULT false, "created_at" character varying NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "areas" ("id" SERIAL NOT NULL, "slug" character varying NOT NULL, "name" character varying NOT NULL, "city" character varying NOT NULL DEFAULT 'Lagos', "description" text NOT NULL DEFAULT '', "power" character varying NOT NULL DEFAULT 'No data', "flooding" character varying NOT NULL DEFAULT 'No data', "security" character varying NOT NULL DEFAULT 'No data', "water" character varying NOT NULL DEFAULT 'No data', "transport" character varying NOT NULL DEFAULT 'No data', "internet" character varying NOT NULL DEFAULT 'No data', "score" integer NOT NULL DEFAULT '0', "updated_at" character varying NOT NULL, CONSTRAINT "UQ_b7c3c95e1c6dfe264ba33bf482a" UNIQUE ("slug"), CONSTRAINT "PK_5110493f6342f34c978c084d0d6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "area_reviews" ("id" SERIAL NOT NULL, "area_id" integer NOT NULL, "user_id" integer NOT NULL, "power" integer, "flooding" integer, "security" integer, "water" integer, "transport" integer, "internet" integer, "comment" text NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "created_at" character varying NOT NULL, CONSTRAINT "PK_a96a382abc304e5c0f17f374c5b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f227c3916a1068ecd782fc1bc4" ON "area_reviews"  ("area_id") `);
        await queryRunner.query(`CREATE TABLE "password_resets" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "code_hash" character varying NOT NULL, "expires_at" character varying NOT NULL, "attempts" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_4816377aa98211c1de34469e742" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f7a4c3bc48f24df007936d217b" ON "password_resets"  ("user_id") `);
        await queryRunner.query(`CREATE TABLE "sessions" ("token_hash" character varying NOT NULL, "user_id" integer NOT NULL, "expires_at" character varying NOT NULL, CONSTRAINT "PK_abaa9e068cdd390bc5210f79884" PRIMARY KEY ("token_hash"))`);
        await queryRunner.query(`CREATE INDEX "IDX_085d540d9f418cfbdc7bd55bb1" ON "sessions"  ("user_id") `);
        await queryRunner.query(`CREATE TABLE "listings" ("id" SERIAL NOT NULL, "owner_id" integer NOT NULL, "area_id" integer NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL DEFAULT '', "address" character varying NOT NULL, "property_type" character varying NOT NULL, "bedrooms" integer NOT NULL DEFAULT '0', "bathrooms" integer NOT NULL DEFAULT '0', "rent" integer NOT NULL, "rent_period" character varying NOT NULL DEFAULT 'year', "agency_fee" integer NOT NULL DEFAULT '0', "legal_fee" integer NOT NULL DEFAULT '0', "caution_deposit" integer NOT NULL DEFAULT '0', "service_charge" integer NOT NULL DEFAULT '0', "utilities" integer NOT NULL DEFAULT '0', "features" text NOT NULL DEFAULT '[]', "photos" text NOT NULL DEFAULT '[]', "verified" boolean NOT NULL DEFAULT false, "hidden_by_reports" boolean NOT NULL DEFAULT false, "view_count" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'pending', "created_at" character varying NOT NULL, "updated_at" character varying NOT NULL, CONSTRAINT "PK_520ecac6c99ec90bcf5a603cdcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_92dc46aef6b186ae894197286f" ON "listings"  ("status", "area_id", "property_type", "rent", "bedrooms") `);
        await queryRunner.query(`CREATE TABLE "conversations" ("id" SERIAL NOT NULL, "listing_id" integer NOT NULL, "tenant_id" integer NOT NULL, "owner_id" integer NOT NULL, "created_at" character varying NOT NULL, "updated_at" character varying NOT NULL, CONSTRAINT "UQ_d098fdc93ae98d2808b51c14625" UNIQUE ("listing_id", "tenant_id"), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "messages" ("id" SERIAL NOT NULL, "conversation_id" integer NOT NULL, "sender_id" integer NOT NULL, "body" text NOT NULL, "created_at" character varying NOT NULL, "read_at" character varying, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "inspections" ("id" SERIAL NOT NULL, "listing_id" integer NOT NULL, "tenant_id" integer NOT NULL, "owner_id" integer NOT NULL, "requested_at" character varying NOT NULL, "note" text NOT NULL DEFAULT '', "status" character varying NOT NULL DEFAULT 'pending', "owner_note" text NOT NULL DEFAULT '', "created_at" character varying NOT NULL, "updated_at" character varying NOT NULL, CONSTRAINT "PK_a484980015782324454d8c88abe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "lister_reviews" ("id" SERIAL NOT NULL, "owner_id" integer NOT NULL, "tenant_id" integer NOT NULL, "listing_id" integer NOT NULL, "inspection_id" integer NOT NULL, "rating" integer NOT NULL, "comment" text NOT NULL DEFAULT '', "status" character varying NOT NULL DEFAULT 'published', "created_at" character varying NOT NULL, CONSTRAINT "PK_15ebded874ef0cac28632abc8f8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ce52c4d92cc7ea915139239732" ON "lister_reviews"  ("owner_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bacba804654359331e84cb3c6d" ON "lister_reviews"  ("inspection_id") `);
        await queryRunner.query(`CREATE TABLE "listing_reports" ("id" SERIAL NOT NULL, "listing_id" integer NOT NULL, "reporter_id" integer NOT NULL, "reason" character varying NOT NULL, "details" text NOT NULL DEFAULT '', "status" character varying NOT NULL DEFAULT 'open', "resolution" text NOT NULL DEFAULT '', "created_at" character varying NOT NULL, "updated_at" character varying NOT NULL, CONSTRAINT "PK_943442134a31338529a1cf22ba5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "saved_listings" ("user_id" integer NOT NULL, "listing_id" integer NOT NULL, "created_at" character varying NOT NULL, CONSTRAINT "PK_424fc7d2f20ec2503690f0316e6" PRIMARY KEY ("user_id", "listing_id"))`);
        await queryRunner.query(`ALTER TABLE "area_reviews" ADD CONSTRAINT "FK_f227c3916a1068ecd782fc1bc44" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "area_reviews" ADD CONSTRAINT "FK_007b0f1741fcdf6e721ab5da2aa" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listings" ADD CONSTRAINT "FK_9f5b6113628f91bcf8a8e2dfa3c" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listings" ADD CONSTRAINT "FK_844247dce636c3f6950de2dc72c" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_c14948d6807e84b810dd4bed949" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_664e8d7cbdae35df5cae341352a" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD CONSTRAINT "FK_3964fc360a683d14cf0f1472751" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inspections" ADD CONSTRAINT "FK_855d3e305258b867eadc7dd09c8" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inspections" ADD CONSTRAINT "FK_9a75672d3557992febcf10487fe" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "lister_reviews" ADD CONSTRAINT "FK_4bc40f546251e518744d8d2c0cc" FOREIGN KEY ("tenant_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "listing_reports" ADD CONSTRAINT "FK_bada7fe237f27edb6e4bd8de9c2" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "saved_listings" ADD CONSTRAINT "FK_d5a474776e90e4df0c516dcba05" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "saved_listings" DROP CONSTRAINT "FK_d5a474776e90e4df0c516dcba05"`);
        await queryRunner.query(`ALTER TABLE "listing_reports" DROP CONSTRAINT "FK_bada7fe237f27edb6e4bd8de9c2"`);
        await queryRunner.query(`ALTER TABLE "lister_reviews" DROP CONSTRAINT "FK_4bc40f546251e518744d8d2c0cc"`);
        await queryRunner.query(`ALTER TABLE "inspections" DROP CONSTRAINT "FK_9a75672d3557992febcf10487fe"`);
        await queryRunner.query(`ALTER TABLE "inspections" DROP CONSTRAINT "FK_855d3e305258b867eadc7dd09c8"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_3964fc360a683d14cf0f1472751"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_664e8d7cbdae35df5cae341352a"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_c14948d6807e84b810dd4bed949"`);
        await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "FK_844247dce636c3f6950de2dc72c"`);
        await queryRunner.query(`ALTER TABLE "listings" DROP CONSTRAINT "FK_9f5b6113628f91bcf8a8e2dfa3c"`);
        await queryRunner.query(`ALTER TABLE "area_reviews" DROP CONSTRAINT "FK_007b0f1741fcdf6e721ab5da2aa"`);
        await queryRunner.query(`ALTER TABLE "area_reviews" DROP CONSTRAINT "FK_f227c3916a1068ecd782fc1bc44"`);
        await queryRunner.query(`DROP TABLE "saved_listings"`);
        await queryRunner.query(`DROP TABLE "listing_reports"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bacba804654359331e84cb3c6d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ce52c4d92cc7ea915139239732"`);
        await queryRunner.query(`DROP TABLE "lister_reviews"`);
        await queryRunner.query(`DROP TABLE "inspections"`);
        await queryRunner.query(`DROP TABLE "messages"`);
        await queryRunner.query(`DROP TABLE "conversations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_92dc46aef6b186ae894197286f"`);
        await queryRunner.query(`DROP TABLE "listings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_085d540d9f418cfbdc7bd55bb1"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f7a4c3bc48f24df007936d217b"`);
        await queryRunner.query(`DROP TABLE "password_resets"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f227c3916a1068ecd782fc1bc4"`);
        await queryRunner.query(`DROP TABLE "area_reviews"`);
        await queryRunner.query(`DROP TABLE "areas"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8f01d13ac8e7b451d244674274"`);
        await queryRunner.query(`DROP TABLE "saved_searches"`);
    }

}
