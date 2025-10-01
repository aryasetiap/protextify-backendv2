-- CreateTable
CREATE TABLE "public"."submission_versions" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_versions_submissionId_idx" ON "public"."submission_versions"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_versions_submissionId_version_key" ON "public"."submission_versions"("submissionId", "version");

-- AddForeignKey
ALTER TABLE "public"."submission_versions" ADD CONSTRAINT "submission_versions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
