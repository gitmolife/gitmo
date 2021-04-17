import {MigrationInterface, QueryRunner} from "typeorm";

export class registry1618555916388 implements MigrationInterface {
	name = 'registry1618555916388'

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`CREATE TABLE user_wallet_status
			(
				"id" SERIAL PRIMARY KEY,
				"type" VARCHAR(16) NOT NULL,
				"active" BOOLEAN NOT NULL DEFAULT TRUE,
				"online" BOOLEAN NOT NULL DEFAULT FALSE,
				"synced" BOOLEAN NOT NULL DEFAULT FALSE,
				"crawling" BOOLEAN NOT NULL DEFAULT FALSE,
				"blockheight" INTEGER NOT NULL DEFAULT 0,
				"blockhash" VARCHAR(64) NOT NULL,
				"blocktime" INTEGER NOT NULL DEFAULT 0,
				"createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				"updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "user_wallet_status"`);
	}
}
