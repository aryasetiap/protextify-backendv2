/*
  Warnings:

  - You are about to drop the `PlagiarismIndex` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlagiarismSource` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PlagiarismIndex" DROP CONSTRAINT "PlagiarismIndex_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlagiarismSource" DROP CONSTRAINT "PlagiarismSource_plagiarismCheckId_fkey";

-- DropTable
DROP TABLE "public"."PlagiarismIndex";

-- DropTable
DROP TABLE "public"."PlagiarismSource";
