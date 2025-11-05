/*
  Warnings:

  - The primary key for the `drops` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "public"."claims" DROP CONSTRAINT "claims_dropId_fkey";

-- DropForeignKey
ALTER TABLE "public"."waitlist_entries" DROP CONSTRAINT "waitlist_entries_dropId_fkey";

-- AlterTable
ALTER TABLE "public"."claims" ALTER COLUMN "dropId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."drops" DROP CONSTRAINT "drops_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "drops_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "drops_id_seq";

-- AlterTable
ALTER TABLE "public"."waitlist_entries" ALTER COLUMN "dropId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "public"."waitlist_entries" ADD CONSTRAINT "waitlist_entries_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "public"."drops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."claims" ADD CONSTRAINT "claims_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "public"."drops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
