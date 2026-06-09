-- Support Iterasi Kedua endpoint lookups for class history and class detail.
CREATE INDEX IF NOT EXISTS "Class_instructorId_idx" ON "public"."Class"("instructorId");
CREATE INDEX IF NOT EXISTS "ClassEnrollment_classId_idx" ON "public"."ClassEnrollment"("classId");
