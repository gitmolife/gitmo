import {MigrationInterface, QueryRunner} from "typeorm";

export class registry1619237099300 implements MigrationInterface {
	name = 'registry1619237099300'

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE user_transaction_types
			(
				"id" SERIAL PRIMARY KEY,
				"name" VARCHAR(64) NOT NULL,
				"typeId" INTEGER NOT NULL DEFAULT 0,
			);`
		);
		await queryRunner.query(`INSERT INTO user_transaction_types
			("name", "typeId") VALUES
			("unknown", 0),
			("deposit_unknown", 1),
			("withdraw_unknown", 2),
			("deposit", 3),
			("withdraw", 4),
			("stake", 5),
			("transfer_from_tip", 10),
			("transfer_to_tip", 11),
			("change", 13),
			("change_stake", 15),
			("change_a", 20),
			("change_b", 21),
			("tip", 50),
			("tip_receive", 51),
			("tip_send", 52);`
	 	);
		await queryRunner.query(`CREATE TABLE user_wallet_tip
			(
				"id" SERIAL PRIMARY KEY,
				"userIdFrom" VARCHAR(32) NOT NULL,
				"userIdTo" VARCHAR(32) NOT NULL,
				"anon" BOOLEAN NOT NULL DEFAULT FALSE,
				"type" INTEGER NOT NULL DEFAULT 0,
				"coinType" INTEGER NOT NULL DEFAULT 0,
				"amount" DECIMAL(16,8) NOT NULL DEFAULT 0,
				"message" VARCHAR(256) DEFAULT NULL,
				"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 				CONSTRAINT "fk_user_wallet_tip_type" FOREIGN KEY ('type') REFERENCES user_transaction_types ('typeId')
			);`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "user_wallet_tip"`);
		await queryRunner.query(`DROP TABLE "user_transaction_types"`);
	}
}
