/*
  Warnings:

  - Added the required column `expectedStudentCount` to the `Assignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Assignment" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expectedStudentCount" INTEGER NOT NULL;
