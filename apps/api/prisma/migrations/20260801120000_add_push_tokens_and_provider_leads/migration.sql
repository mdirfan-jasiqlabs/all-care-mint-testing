-- CreateTable
CREATE TABLE "push_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "user_role" VARCHAR(50) NOT NULL,
    "device_id" VARCHAR(255) NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "mobile_number" VARCHAR(20) NOT NULL,
    "service_area" VARCHAR(100) NOT NULL,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_push_tokens_user_role_device" ON "push_tokens"("user_role", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_push_tokens_fcm_token" ON "push_tokens"("fcm_token");

-- CreateIndex
CREATE INDEX "idx_push_tokens_user_id" ON "push_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_leads_acknowledged" ON "provider_leads"("is_acknowledged", "created_at");
