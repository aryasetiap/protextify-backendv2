-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('STUDENT_JOINED', 'ASSIGNMENT_CREATED', 'SUBMISSION_SUBMITTED', 'SUBMISSION_GRADED');

-- CreateTable
CREATE TABLE "public"."ClassActivity" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "type" "public"."ActivityType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL,
    "actorId" TEXT,

    CONSTRAINT "ClassActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassActivity_classId_timestamp_idx" ON "public"."ClassActivity"("classId", "timestamp");

-- AddForeignKey
ALTER TABLE "public"."ClassActivity" ADD CONSTRAINT "ClassActivity_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClassActivity" ADD CONSTRAINT "ClassActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
