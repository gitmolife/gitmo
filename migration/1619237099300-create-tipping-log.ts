import {MigrationInterface, QueryRunner} from "typeorm";

export class registry1619237099300 implements MigrationInterface {
	name = 'registry1619237099300'

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE user_transaction_types
			(
				"typeId" INTEGER NOT NULL UNIQUE,
				"name" VARCHAR(64) NOT NULL
			);`
		);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (0, 'unknown');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (1, 'deposit_unknown');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (2, 'withdraw_unknown');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (3, 'deposit');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (4, 'withdraw');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (5, 'stake');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (10, 'transfer_from_tip');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (11, 'transfer_to_tip');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (13, 'change');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (15, 'change_stake');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (20, 'change_a');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (21, 'change_b');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (50, 'tip');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (51, 'tip_receive');`);
		await queryRunner.query(`INSERT INTO public.user_transaction_types("typeId", "name") VALUES (52, 'tip_send');`);
		await queryRunner.query(`CREATE TABLE user_wallet_tip
			(
				"id" SERIAL PRIMARY KEY,
				"userIdFrom" VARCHAR(16) NOT NULL,
				"userIdTo" VARCHAR(16) NOT NULL,
				"noteId" VARCHAR(16) NOT NULL,
				"anon" BOOLEAN NOT NULL DEFAULT FALSE,
				"type" INTEGER NOT NULL DEFAULT 0,
				"coinType" INTEGER NOT NULL DEFAULT 0,
				"amount" DECIMAL(16,8) NOT NULL DEFAULT 0,
				"message" VARCHAR(256) DEFAULT NULL,
				"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CONSTRAINT fk_user_wallet_tip_type FOREIGN KEY ("type") REFERENCES user_transaction_types("typeId")
			);`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "user_wallet_tip"`);
		await queryRunner.query(`DROP TABLE "user_transaction_types"`);
	}
}
