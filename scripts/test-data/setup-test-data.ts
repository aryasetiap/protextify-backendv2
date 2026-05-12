import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const TEST_PREFIX = 'thesis-perf';
const TEST_LABEL = 'THESIS_PERF';
const OUTPUT_PATH = path.resolve(
  process.cwd(),
  'tests/performance/k6/data/test-data.local.json',
);
const DEFAULT_TEST_PASSWORD = 'thesis-perf-local-password';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? '',
});
const prisma = new PrismaClient({ adapter });

type TestStudent = {
  id: string;
  email: string;
  fullName: string;
};

function assertSafeEnvironment() {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const allowed = ['development', 'test', 'testing', 'local', 'performance'];

  if (nodeEnv === 'production' || !allowed.includes(nodeEnv)) {
    throw new Error(
      `Refusing to setup thesis test data in NODE_ENV=${nodeEnv}. Use local/testing/performance only.`,
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to setup thesis test data.');
  }
}

function validContent(label: string) {
  return `${label}. Konten dummy untuk pengujian performa backend Protextify. Teks ini sengaja dibuat lebih dari seratus karakter agar valid untuk submission dan pengecekan plagiarisme terbatas.`;
}

function winstonContent() {
  return [
    'Konten dummy khusus integration testing WinstonAI terbatas.',
    'Tulisan ini bukan data pribadi asli dan hanya digunakan untuk hidden dry-run lokal.',
    'Jangan gunakan submission ini untuk load test, stress test, spike test, atau endurance test terhadap real WinstonAI API.',
  ].join(' ');
}

async function upsertUser(user: TestStudent & { role: 'INSTRUCTOR' | 'STUDENT' }, passwordHash: string) {
  return prisma.user.upsert({
    where: { email: user.email },
    update: {
      fullName: user.fullName,
      role: user.role,
      institution: `${TEST_LABEL} Local Testing`,
      emailVerified: true,
      password: passwordHash,
    },
    create: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      password: passwordHash,
      role: user.role,
      institution: `${TEST_LABEL} Local Testing`,
      emailVerified: true,
      phone: null,
    },
  });
}

async function main() {
  assertSafeEnvironment();

  const password = process.env.TEST_USER_PASSWORD || DEFAULT_TEST_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  const instructor = {
    id: `${TEST_PREFIX}-instructor-1`,
    email: `${TEST_PREFIX}-instructor@example.test`,
    fullName: `${TEST_LABEL} Instructor`,
    role: 'INSTRUCTOR' as const,
  };

  const students: TestStudent[] = [
    {
      id: `${TEST_PREFIX}-student-main`,
      email: `${TEST_PREFIX}-student-main@example.test`,
      fullName: `${TEST_LABEL} Student Main`,
    },
    {
      id: `${TEST_PREFIX}-student-submitted`,
      email: `${TEST_PREFIX}-student-submitted@example.test`,
      fullName: `${TEST_LABEL} Student Submitted`,
    },
    {
      id: `${TEST_PREFIX}-student-short-content`,
      email: `${TEST_PREFIX}-student-short-content@example.test`,
      fullName: `${TEST_LABEL} Student Short Content`,
    },
    {
      id: `${TEST_PREFIX}-student-winstonai`,
      email: `${TEST_PREFIX}-student-winstonai@example.test`,
      fullName: `${TEST_LABEL} Student WinstonAI`,
    },
    {
      id: `${TEST_PREFIX}-student-report`,
      email: `${TEST_PREFIX}-student-report@example.test`,
      fullName: `${TEST_LABEL} Student Report`,
    },
    ...Array.from({ length: 8 }, (_, index) => {
      const number = index + 1;
      return {
        id: `${TEST_PREFIX}-student-write-${number}`,
        email: `${TEST_PREFIX}-student-write-${number}@example.test`,
        fullName: `${TEST_LABEL} Student Write ${number}`,
      };
    }),
  ];

  await upsertUser(instructor, passwordHash);
  for (const student of students) {
    await upsertUser({ ...student, role: 'STUDENT' }, passwordHash);
  }

  const classData = await prisma.class.upsert({
    where: { id: `${TEST_PREFIX}-class-1` },
    update: {
      name: `${TEST_LABEL} Class Backend Performance`,
      description: 'Kelas dummy untuk pengujian skripsi backend Protextify.',
      classToken: 'THESISPERF2026',
      instructorId: instructor.id,
    },
    create: {
      id: `${TEST_PREFIX}-class-1`,
      name: `${TEST_LABEL} Class Backend Performance`,
      description: 'Kelas dummy untuk pengujian skripsi backend Protextify.',
      classToken: 'THESISPERF2026',
      instructorId: instructor.id,
    },
  });

  for (const student of students) {
    await prisma.classEnrollment.upsert({
      where: {
        studentId_classId: {
          studentId: student.id,
          classId: classData.id,
        },
      },
      update: {},
      create: {
        id: `${TEST_PREFIX}-enrollment-${student.id}`,
        studentId: student.id,
        classId: classData.id,
      },
    });
  }

  const assignment = await prisma.assignment.upsert({
    where: { id: `${TEST_PREFIX}-assignment-main` },
    update: {
      title: `${TEST_LABEL} Assignment Main`,
      instructions: 'Assignment aktif untuk hidden dry-run dan iterasi resmi.',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      expectedStudentCount: 25,
      active: true,
      classId: classData.id,
    },
    create: {
      id: `${TEST_PREFIX}-assignment-main`,
      title: `${TEST_LABEL} Assignment Main`,
      instructions: 'Assignment aktif untuk hidden dry-run dan iterasi resmi.',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      expectedStudentCount: 25,
      active: true,
      classId: classData.id,
    },
  });

  const writeAssignment = await prisma.assignment.upsert({
    where: { id: `${TEST_PREFIX}-assignment-write` },
    update: {
      title: `${TEST_LABEL} Assignment Write`,
      instructions: 'Assignment aktif khusus endpoint write/update content.',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      expectedStudentCount: 25,
      active: true,
      classId: classData.id,
    },
    create: {
      id: `${TEST_PREFIX}-assignment-write`,
      title: `${TEST_LABEL} Assignment Write`,
      instructions: 'Assignment aktif khusus endpoint write/update content.',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      expectedStudentCount: 25,
      active: true,
      classId: classData.id,
    },
  });

  const draftSubmission = await upsertSubmission({
    id: `${TEST_PREFIX}-submission-draft`,
    assignmentId: assignment.id,
    studentId: `${TEST_PREFIX}-student-main`,
    content: validContent('Draft submission'),
    status: 'DRAFT',
  });

  const submittedSubmission = await upsertSubmission({
    id: `${TEST_PREFIX}-submission-submitted`,
    assignmentId: assignment.id,
    studentId: `${TEST_PREFIX}-student-submitted`,
    content: validContent('Submitted submission'),
    status: 'SUBMITTED',
    submittedAt: new Date(),
  });

  const shortSubmission = await upsertSubmission({
    id: `${TEST_PREFIX}-submission-short-content`,
    assignmentId: assignment.id,
    studentId: `${TEST_PREFIX}-student-short-content`,
    content: 'Terlalu pendek.',
    status: 'SUBMITTED',
    submittedAt: new Date(),
  });

  const winstonAiSubmission = await upsertSubmission({
    id: `${TEST_PREFIX}-submission-winstonai`,
    assignmentId: assignment.id,
    studentId: `${TEST_PREFIX}-student-winstonai`,
    content: winstonContent(),
    status: 'SUBMITTED',
    submittedAt: new Date(),
  });

  const reportSubmission = await upsertSubmission({
    id: `${TEST_PREFIX}-submission-report`,
    assignmentId: assignment.id,
    studentId: `${TEST_PREFIX}-student-report`,
    content: validContent('Report submission with completed plagiarism check'),
    status: 'SUBMITTED',
    submittedAt: new Date(),
  });

  await prisma.plagiarismCheck.upsert({
    where: { submissionId: reportSubmission.id },
    update: {
      score: 12.5,
      status: 'completed',
      wordCount: 180,
      creditsUsed: 1,
      rawResponse: mockWinstonResponse(),
      checkedAt: new Date(),
    },
    create: {
      submissionId: reportSubmission.id,
      score: 12.5,
      status: 'completed',
      wordCount: 180,
      creditsUsed: 1,
      rawResponse: mockWinstonResponse(),
      checkedAt: new Date(),
    },
  });

  const writeStudents = students.filter((student) =>
    student.id.startsWith(`${TEST_PREFIX}-student-write-`),
  );
  const writeSubmissions: Array<{
    studentId: string;
    studentEmail: string;
    submissionId: string;
  }> = [];
  for (const student of writeStudents) {
    const submission = await upsertSubmission({
      id: `${TEST_PREFIX}-submission-write-${student.id.split('-').at(-1)}`,
      assignmentId: writeAssignment.id,
      studentId: student.id,
      content: validContent(`Write submission ${student.fullName}`),
      status: 'DRAFT',
    });
    writeSubmissions.push({
      studentId: student.id,
      studentEmail: student.email,
      submissionId: submission.id,
    });
  }

  await prisma.classActivity.upsert({
    where: { id: `${TEST_PREFIX}-activity-assignment-main` },
    update: {
      classId: classData.id,
      actorId: instructor.id,
      type: 'ASSIGNMENT_CREATED',
      details: { assignmentTitle: assignment.title, source: TEST_LABEL },
    },
    create: {
      id: `${TEST_PREFIX}-activity-assignment-main`,
      classId: classData.id,
      actorId: instructor.id,
      type: 'ASSIGNMENT_CREATED',
      details: { assignmentTitle: assignment.title, source: TEST_LABEL },
    },
  });

  const output = {
    generatedAt: new Date().toISOString(),
    prefix: TEST_PREFIX,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    instructor: {
      id: instructor.id,
      email: instructor.email,
    },
    student: {
      id: students[0].id,
      email: students[0].email,
    },
    classId: classData.id,
    classToken: classData.classToken,
    assignmentId: assignment.id,
    writeAssignmentId: writeAssignment.id,
    submissionDraftId: draftSubmission.id,
    submissionSubmittedId: submittedSubmission.id,
    shortContentSubmissionId: shortSubmission.id,
    winstonAiSubmissionId: winstonAiSubmission.id,
    reportSubmissionId: reportSubmission.id,
    writeTestData: writeSubmissions,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  console.log('Thesis performance test data setup completed.');
  console.log(`Local k6 data written to: ${OUTPUT_PATH}`);
  console.log('No secret values were printed.');
}

async function upsertSubmission(data: {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  status: 'DRAFT' | 'SUBMITTED' | 'GRADED';
  submittedAt?: Date;
}) {
  const submission = await prisma.submission.upsert({
    where: { id: data.id },
    update: {
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      content: data.content,
      status: data.status,
      submittedAt: data.submittedAt ?? null,
      studentFeedback: [],
    },
    create: {
      id: data.id,
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      content: data.content,
      status: data.status,
      submittedAt: data.submittedAt ?? null,
      studentFeedback: [],
    },
  });

  await prisma.submissionVersion.upsert({
    where: {
      submissionId_version: {
        submissionId: submission.id,
        version: 1,
      },
    },
    update: {
      content: data.content,
      updatedAt: new Date(),
    },
    create: {
      submissionId: submission.id,
      version: 1,
      content: data.content,
    },
  });

  return submission;
}

function mockWinstonResponse(): Prisma.InputJsonObject {
  return {
    status: 200,
    scanInformation: {
      service: 'mock',
      scanTime: new Date().toISOString(),
      inputType: 'text',
    },
    result: {
      score: 12.5,
      sourceCounts: 1,
      textWordCounts: 180,
      totalPlagiarismWords: 22,
      identicalWordCounts: 10,
      similarWordCounts: 12,
    },
    sources: [],
    attackDetected: {
      zero_width_space: false,
      homoglyph_attack: false,
    },
    text: 'Mock response for thesis performance local testing.',
    similarWords: [],
    citations: [],
    indexes: [],
    credits_used: 1,
    credits_remaining: 999,
  };
}

main()
  .catch((error) => {
    console.error(`Failed to setup thesis performance test data: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
