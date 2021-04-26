import {MigrationInterface, QueryRunner} from "typeorm";

export class registry1619255337321 implements MigrationInterface {
	name = 'registry1619255337321'

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE user_wallet_tx
			ADD CONSTRAINT fk_user_wallet_tx_txtype
			FOREIGN KEY ("txtype") REFERENCES user_transaction_types("typeId");`
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE user_wallet_tx DROP CONSTRAINT fk_user_wallet_tx_txtype`);
	}
}
