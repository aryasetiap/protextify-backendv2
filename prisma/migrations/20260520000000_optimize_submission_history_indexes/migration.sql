-- Optimize GET /api/classes/:classId/history filters and default sorting.
CREATE INDEX "Assignment_classId_idx" ON "public"."Assignment"("classId");
CREATE INDEX "Submission_assignmentId_updatedAt_idx" ON "public"."Submission"("assignmentId", "updatedAt");
CREATE INDEX "Submission_studentId_updatedAt_idx" ON "public"."Submission"("studentId", "updatedAt");
CREATE INDEX "Submission_status_updatedAt_idx" ON "public"."Submission"("status", "updatedAt");
