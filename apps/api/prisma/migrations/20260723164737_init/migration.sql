-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firebase_uid" VARCHAR(128),
    "mobile_number" VARCHAR(20) NOT NULL,
    "display_name" VARCHAR(150),
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firebase_uid" VARCHAR(128),
    "mobile_number" VARCHAR(20) NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "service_area" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "user_role" VARCHAR(50) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "token_family_id" UUID NOT NULL,
    "parent_id" UUID,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revocation_reason" VARCHAR(100),
    "expires_at" TIMESTAMPTZ NOT NULL,
    "last_activity" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "actor_role" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "old_state" JSONB,
    "new_state" JSONB,
    "request_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_firebase_uid_key" ON "customers"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "customers_mobile_number_key" ON "customers"("mobile_number");

-- CreateIndex
CREATE UNIQUE INDEX "providers_firebase_uid_key" ON "providers"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "providers_mobile_number_key" ON "providers"("mobile_number");

-- CreateIndex
CREATE INDEX "idx_providers_status_mobile" ON "providers"("status", "mobile_number");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_family" ON "refresh_tokens"("token_family_id");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens"("user_id", "user_role");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_customer" FOREIGN KEY ("user_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_provider" FOREIGN KEY ("user_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
