import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const TEST_PREFIX = 'thesis-perf';
const OUTPUT_PATH = path.resolve(
  process.cwd(),
  'tests/performance/k6/data/test-data.local.json',
);

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? '',
});
const prisma = new PrismaClient({ adapter });

function assertSafeEnvironment() {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const allowed = ['development', 'test', 'testing', 'local', 'performance'];

  if (nodeEnv === 'production' || !allowed.includes(nodeEnv)) {
    throw new Error(
      `Refusing to cleanup thesis test data in NODE_ENV=${nodeEnv}. Use local/testing/performance only.`,
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to cleanup thesis test data.');
  }
}

async function main() {
  assertSafeEnvironment();

  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { id: { startsWith: TEST_PREFIX } },
        { email: { startsWith: TEST_PREFIX } },
      ],
    },
    select: { id: true },
  });
  const userIds = testUsers.map((user) => user.id);

  const testClasses = await prisma.class.findMany({
    where: {
      OR: [
        { id: { startsWith: TEST_PREFIX } },
        { classToken: 'THESISPERF2026' },
        { name: { startsWith: 'THESIS_PERF' } },
      ],
    },
    select: { id: true },
  });
  const classIds = testClasses.map((item) => item.id);

  const testAssignments = await prisma.assignment.findMany({
    where: {
      OR: [
        { id: { startsWith: TEST_PREFIX } },
        { title: { startsWith: 'THESIS_PERF' } },
        { classId: { in: classIds } },
      ],
    },
    select: { id: true },
  });
  const assignmentIds = testAssignments.map((item) => item.id);

  const testSubmissions = await prisma.submission.findMany({
    where: {
      OR: [
        { id: { startsWith: TEST_PREFIX } },
        { assignmentId: { in: assignmentIds } },
        { studentId: { in: userIds } },
      ],
    },
    select: { id: true },
  });
  const submissionIds = testSubmissions.map((item) => item.id);

  const result = await prisma.$transaction(async (tx) => {
    const plagiarismChecks = await tx.plagiarismCheck.deleteMany({
      where: { submissionId: { in: submissionIds } },
    });
    const submissionVersions = await tx.submissionVersion.deleteMany({
      where: { submissionId: { in: submissionIds } },
    });
    const attachments = await tx.attachment.deleteMany({
      where: {
        OR: [
          { id: { startsWith: TEST_PREFIX } },
          { uploaderId: { in: userIds } },
          { assignmentId: { in: assignmentIds } },
          { submissionId: { in: submissionIds } },
        ],
      },
    });
    const classActivities = await tx.classActivity.deleteMany({
      where: {
        OR: [
          { id: { startsWith: TEST_PREFIX } },
          { classId: { in: classIds } },
          { actorId: { in: userIds } },
        ],
      },
    });
    const transactions = await tx.transaction.deleteMany({
      where: {
        OR: [
          { id: { startsWith: TEST_PREFIX } },
          { userId: { in: userIds } },
          { assignmentId: { in: assignmentIds } },
          { midtransTransactionId: { startsWith: 'THESIS_PERF' } },
        ],
      },
    });
    const submissions = await tx.submission.deleteMany({
      where: { id: { in: submissionIds } },
    });
    const enrollments = await tx.classEnrollment.deleteMany({
      where: {
        OR: [
          { id: { startsWith: TEST_PREFIX } },
          { studentId: { in: userIds } },
          { classId: { in: classIds } },
        ],
      },
    });
    const assignments = await tx.assignment.deleteMany({
      where: { id: { in: assignmentIds } },
    });
    const creditBalances = await tx.creditBalance.deleteMany({
      where: { userId: { in: userIds } },
    });
    const classes = await tx.class.deleteMany({
      where: { id: { in: classIds } },
    });
    const users = await tx.user.deleteMany({
      where: { id: { in: userIds } },
    });

    return {
      plagiarismChecks: plagiarismChecks.count,
      submissionVersions: submissionVersions.count,
      attachments: attachments.count,
      classActivities: classActivities.count,
      transactions: transactions.count,
      submissions: submissions.count,
      enrollments: enrollments.count,
      assignments: assignments.count,
      creditBalances: creditBalances.count,
      classes: classes.count,
      users: users.count,
    };
  });

  if (fs.existsSync(OUTPUT_PATH)) {
    fs.rmSync(OUTPUT_PATH);
  }

  console.log('Thesis performance test data cleanup completed.');
  console.log(JSON.stringify(result, null, 2));
  console.log('Queue jobs were not globally cleaned by this script.');
}

main()
  .catch((error) => {
    console.error(`Failed to cleanup thesis performance test data: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
