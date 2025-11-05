/*
  Warnings:

  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `surname` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'User',
ADD COLUMN     "surname" TEXT NOT NULL DEFAULT 'Surname';

-- Remove default values after adding columns
ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "surname" DROP DEFAULT;
