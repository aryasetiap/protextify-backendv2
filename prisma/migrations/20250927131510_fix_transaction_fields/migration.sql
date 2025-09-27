/*
  Warnings:

  - You are about to drop the column `midtransOrderId` on the `Transaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[midtransTransactionId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `midtransTransactionId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Transaction_midtransOrderId_key";

-- AlterTable
ALTER TABLE "public"."Transaction" DROP COLUMN "midtransOrderId",
ADD COLUMN     "midtransTransactionId" TEXT NOT NULL,
ALTER COLUMN "creditsPurchased" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_midtransTransactionId_key" ON "public"."Transaction"("midtransTransactionId");
