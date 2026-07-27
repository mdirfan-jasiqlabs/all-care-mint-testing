-- AlterTable
ALTER TABLE "providers" ADD COLUMN     "last_active_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "_ProviderToServiceCategory" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProviderToServiceCategory_AB_unique" ON "_ProviderToServiceCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_ProviderToServiceCategory_B_index" ON "_ProviderToServiceCategory"("B");

-- AddForeignKey
ALTER TABLE "_ProviderToServiceCategory" ADD CONSTRAINT "_ProviderToServiceCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderToServiceCategory" ADD CONSTRAINT "_ProviderToServiceCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
