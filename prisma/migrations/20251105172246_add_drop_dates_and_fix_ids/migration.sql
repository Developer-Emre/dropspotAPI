/*
  Warnings:

  - The primary key for the `drops` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `drops` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `dropId` on the `claims` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `endDate` to the `drops` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `drops` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `dropId` on the `waitlist_entries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."claims" DROP CONSTRAINT "claims_dropId_fkey";

-- DropForeignKey
ALTER TABLE "public"."waitlist_entries" DROP CONSTRAINT "waitlist_entries_dropId_fkey";

-- AlterTable
ALTER TABLE "public"."claims" DROP COLUMN "dropId",
ADD COLUMN     "dropId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."drops" DROP CONSTRAINT "drops_pkey",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "drops_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."waitlist_entries" DROP COLUMN "dropId",
ADD COLUMN     "dropId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "claims_userId_dropId_key" ON "public"."claims"("userId", "dropId");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_userId_dropId_key" ON "public"."waitlist_entries"("userId", "dropId");

-- AddForeignKey
ALTER TABLE "public"."waitlist_entries" ADD CONSTRAINT "waitlist_entries_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "public"."drops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."claims" ADD CONSTRAINT "claims_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "public"."drops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
