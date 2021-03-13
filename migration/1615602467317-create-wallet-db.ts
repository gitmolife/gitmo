import {MigrationInterface, QueryRunner} from "typeorm";

export class registry1615602467317 implements MigrationInterface {
    name = 'registry1615602467317'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE user_wallet_address
            (
                id SERIAL PRIMARY KEY,
                userId VARCHAR(32) NOT NULL,
                address VARCHAR(64) NOT NULL,
                coinType INTEGER NOT NULL DEFAULT 0,
                balance DECIMAL(16,8) DEFAULT 0,
                active BOOLEAN NOT NULL DEFAULT TRUE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uc_address UNIQUE (address),
                CONSTRAINT fk_user_wallet_address_userId FOREIGN KEY(userId) REFERENCES public.user (id)
            );`
        );
        await queryRunner.query(`CREATE TABLE user_wallet_balance
            (
                id SERIAL PRIMARY KEY,
                userId VARCHAR(32) NOT NULL,
                coinType INTEGER NOT NULL DEFAULT 0,
                balance DECIMAL(16,8) NOT NULL DEFAULT 0,
                CONSTRAINT fk_user_wallet_address_userId FOREIGN KEY(userId) REFERENCES public.user (id)
            );`
        );
        await queryRunner.query(`CREATE TABLE user_wallet_tx
            (
                id SERIAL PRIMARY KEY,
                userId VARCHAR(32) DEFAULT NULL,
                txid VARCHAR(64) NOT NULL,
                vout INTEGER NOT NULL DEFAULT 0,
                blockhash VARCHAR(64) NOT NULL,
                coinType INTEGER NOT NULL DEFAULT 0,
                txtype INTEGER NOT NULL DEFAULT 0,
                confirms INTEGER NOT NULL DEFAULT 0,
                processed INTEGER NOT NULL DEFAULT 0,
                complete BOOLEAN NOT NULL DEFAULT FALSE,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_wallet_address_userId FOREIGN KEY(userId) REFERENCES public.user (id)
            );`
        );
				await queryRunner.query(`CREATE TABLE user_wallet_job
						(
								id SERIAL PRIMARY KEY,
                job VARCHAR(256) NOT NULL,
								type VARCHAR(16) NOT NULL,
                state INTEGER NOT NULL DEFAULT 0,
								userId VARCHAR(32) DEFAULT NULL,
    						data TEXT DEFAULT NULL,
								result TEXT DEFAULT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_user_wallet_job_userId FOREIGN KEY(userId) REFERENCES public.user (id)
							);`
					);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user_wallet_address"`);
        await queryRunner.query(`DROP TABLE "user_wallet_balance"`);
        await queryRunner.query(`DROP TABLE "user_wallet_tx"`);
				//await queryRunner.query(`DROP TABLE "user_wallet_job"`);
    }
}
