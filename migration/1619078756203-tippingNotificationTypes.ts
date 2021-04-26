import {MigrationInterface, QueryRunner} from "typeorm";

export class tippingNotificationTypes1619078756203 implements MigrationInterface {
    name = 'tippingNotificationTypes1619078756203'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."notification_type_enum" ADD VALUE 'tipReceive'`);
				await queryRunner.query(`ALTER TYPE "public"."notification_type_enum" ADD VALUE 'tipSent'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "public"."notifications" WHERE "type" = 'tipReceive'`);
        await queryRunner.query(`DELETE FROM "public"."notifications" WHERE "type" = 'tipSent'`);
				await queryRunner.query(`DROP TYPE "notification_type_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('follow', 'mention', 'reply', 'renote', 'quote', 'reaction', 'pollVote', 'receiveFollowRequest', 'followRequestAccepted', 'groupInvited', 'app')`);
    }

}
