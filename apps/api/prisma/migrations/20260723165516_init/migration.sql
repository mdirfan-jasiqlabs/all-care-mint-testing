-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "fk_refresh_tokens_customer";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "fk_refresh_tokens_provider";
