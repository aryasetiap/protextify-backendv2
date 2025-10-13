import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

// Define interface untuk version data
interface VersionData {
  // id: string; // ID tidak perlu didefinisikan di sini
  submissionId: string;
  version: number;
  content: string;
  updatedAt: Date;
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Urutan seeder penting untuk menjaga relasi data
  await seedUsers();
  await seedCreditBalances();
  await seedClasses();
  await seedClassEnrollments();
  await seedAssignments();
  await seedTransactions();
  await seedSubmissions();
  await seedPlagiarismChecks();
  await seedSubmissionVersions();
  await seedClassActivities(); // 🆕 Seed activities at the end

  console.log('✅ Database seeding completed successfully!');
}

/**
 * Seed Users (Instructors and Students)
 */
async function seedUsers() {
  console.log('👥 Seeding users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const instructors = [
    {
      id: 'instructor-1',
      email: 'john.instructor@university.edu',
      fullName: 'Dr. John Smith',
      password: hashedPassword,
      role: 'INSTRUCTOR' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+6281234567890',
    },
    {
      id: 'instructor-2',
      email: 'sarah.instructor@university.edu',
      fullName: 'Dr. Sarah Johnson',
      password: hashedPassword,
      role: 'INSTRUCTOR' as const,
      institution: 'Institute of Science',
      emailVerified: true,
      phone: '+6281234567891',
    },
  ];

  const students = [
    {
      id: 'student-1',
      email: 'alice.student@university.edu',
      fullName: 'Alice Williams',
      password: hashedPassword,
      role: 'STUDENT' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+6281211111111',
    },
    {
      id: 'student-2',
      email: 'bob.student@university.edu',
      fullName: 'Bob Davis',
      password: hashedPassword,
      role: 'STUDENT' as const,
      institution: 'University of Technology',
      emailVerified: true,
      phone: '+6281222222222',
    },
    {
      id: 'student-3',
      email: 'charlie.student@university.edu',
      fullName: 'Charlie Miller',
      password: hashedPassword,
      role: 'STUDENT' as const,
      institution: 'Institute of Science',
      emailVerified: true,
      phone: '+6281233333333',
    },
  ];

  const allUsers = [...instructors, ...students];
  for (const userData of allUsers) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
  }
  console.log(`   ✅ Created/updated ${allUsers.length} users`);
}

/**
 * Seed Credit Balances for all users
 */
async function seedCreditBalances() {
  console.log('💰 Seeding credit balances...');
  const users = await prisma.user.findMany();
  for (const user of users) {
    const credits = user.role === 'INSTRUCTOR' ? 100 : 25;
    await prisma.creditBalance.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, credits: credits },
    });
  }
  console.log(
    `   ✅ Created/updated credit balances for ${users.length} users`,
  );
}

/**
 * Seed Classes
 */
async function seedClasses() {
  console.log('🏫 Seeding classes...');
  const instructors = await prisma.user.findMany({
    where: { role: 'INSTRUCTOR' },
  });
  const classes = [
    {
      id: 'class-1',
      name: 'Introduction to Computer Science',
      description:
        'A foundational course on programming and computer science principles.',
      classToken: 'CS101FALL',
      instructorId: instructors[0].id,
    },
    {
      id: 'class-2',
      name: 'Web Development Fundamentals',
      description:
        'Learn the basics of HTML, CSS, and JavaScript to build modern websites.',
      classToken: 'WEBDEV2025',
      instructorId: instructors[1].id,
    },
    {
      id: 'class-3',
      name: 'Advanced Algorithms',
      description: 'A deep dive into complex algorithms and data structures.',
      classToken: 'ALGOADV',
      instructorId: instructors[0].id,
    },
    {
      id: 'class-4',
      name: 'Kelas Baru Tanpa Siswa',
      description: 'Kelas ini baru dibuat dan belum ada siswa yang bergabung.',
      classToken: 'NEWCLASS',
      instructorId: instructors[1].id,
    },
  ];
  for (const classData of classes) {
    await prisma.class.upsert({
      where: { id: classData.id },
      update: {},
      create: classData,
    });
  }
  console.log(`   ✅ Created/updated ${classes.length} classes`);
}

/**
 * Seed Class Enrollments
 */
async function seedClassEnrollments() {
  console.log('📚 Seeding class enrollments...');
  const students = await prisma.user.findMany({ where: { role: 'STUDENT' } });
  const classes = await prisma.class.findMany();
  const enrollments = [
    // Alice enrolls in 2 classes
    { studentId: students[0].id, classId: classes[0].id },
    { studentId: students[0].id, classId: classes[2].id },
    // Bob enrolls in 2 classes
    { studentId: students[1].id, classId: classes[0].id },
    { studentId: students[1].id, classId: classes[1].id },
    // Charlie enrolls in all 3 active classes
    { studentId: students[2].id, classId: classes[0].id },
    { studentId: students[2].id, classId: classes[1].id },
    { studentId: students[2].id, classId: classes[2].id },
  ];
  for (const enrollment of enrollments) {
    await prisma.classEnrollment.upsert({
      where: {
        studentId_classId: {
          studentId: enrollment.studentId,
          classId: enrollment.classId,
        },
      },
      update: {},
      create: { id: nanoid(), ...enrollment },
    });
  }
  console.log(`   ✅ Created/updated ${enrollments.length} class enrollments`);
}

/**
 * Seed Assignments
 */
async function seedAssignments() {
  console.log('📝 Seeding assignments...');
  const classes = await prisma.class.findMany();
  const now = new Date();
  const assignments = [
    // Class 1 Assignments
    {
      id: 'assignment-1',
      title: 'Hello World in Python',
      instructions: 'Write a simple Python script that prints "Hello, World!".',
      deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
      classId: classes[0].id,
      expectedStudentCount: 10,
      active: true,
    },
    {
      id: 'assignment-2',
      title: 'Basic Data Structures',
      instructions:
        'Explain the difference between an array and a linked list.',
      deadline: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // Past due 3 days ago
      classId: classes[0].id,
      expectedStudentCount: 10,
      active: true,
    },
    // Class 2 Assignments
    {
      id: 'assignment-3',
      title: 'HTML & CSS Portfolio Page',
      instructions: 'Create a single-page portfolio using HTML and CSS.',
      deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // Due in 14 days
      classId: classes[1].id,
      expectedStudentCount: 8,
      active: true,
    },
    // Class 3 Assignments
    {
      id: 'assignment-4',
      title: 'Final Project Proposal',
      instructions: 'Submit a proposal for your final project.',
      deadline: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // Due in 30 days
      classId: classes[2].id,
      expectedStudentCount: 5,
      active: true,
    },
    {
      id: 'assignment-5',
      title: 'Tugas Belum Aktif (Menunggu Pembayaran)',
      instructions: 'Instruksi untuk tugas yang belum aktif.',
      deadline: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      classId: classes[2].id,
      expectedStudentCount: 5,
      active: false, // Inactive
    },
  ];
  for (const assignment of assignments) {
    await prisma.assignment.upsert({
      where: { id: assignment.id },
      update: {},
      create: assignment,
    });
  }
  console.log(`   ✅ Created/updated ${assignments.length} assignments`);
}

/**
 * Seed Transactions (Payment history)
 */
async function seedTransactions() {
  console.log('💳 Seeding transactions...');
  const instructors = await prisma.user.findMany({
    where: { role: 'INSTRUCTOR' },
  });
  const assignments = await prisma.assignment.findMany();
  const transactions = [
    {
      id: 'transaction-1',
      userId: instructors[0].id,
      amount: 27000,
      status: 'SUCCESS' as const,
      midtransTransactionId: `PROTEXTIFY-${Date.now()}-1`,
      assignmentId: assignments[0].id,
    },
    {
      id: 'transaction-2',
      userId: instructors[1].id,
      amount: 20000,
      status: 'SUCCESS' as const,
      midtransTransactionId: `PROTEXTIFY-${Date.now()}-2`,
      assignmentId: assignments[2].id,
    },
    {
      id: 'transaction-3',
      userId: instructors[0].id,
      amount: 12700,
      status: 'PENDING' as const,
      midtransTransactionId: `PROTEXTIFY-${Date.now()}-3`,
      assignmentId: assignments[4].id, // For the inactive assignment
    },
  ];
  for (const transaction of transactions) {
    await prisma.transaction.upsert({
      where: { id: transaction.id },
      update: {},
      create: transaction,
    });
  }
  console.log(`   ✅ Created/updated ${transactions.length} transactions`);
}

/**
 * Seed Submissions
 */
async function seedSubmissions() {
  console.log('📄 Seeding submissions...');
  const students = await prisma.user.findMany({ where: { role: 'STUDENT' } });
  const assignments = await prisma.assignment.findMany();
  const submissions = [
    // Assignment 1: "Hello World" (Due in 7 days)
    {
      id: 'submission-1',
      content: 'print("Hello, World!")',
      status: 'GRADED' as const,
      grade: 95.0,
      feedback: 'Excellent work! Clean and straight to the point.',
      studentId: students[0].id, // Alice
      assignmentId: assignments[0].id,
    },
    {
      id: 'submission-2',
      content: 'console.log("Hello, World!"); // Using JavaScript',
      status: 'SUBMITTED' as const,
      studentId: students[1].id, // Bob
      assignmentId: assignments[0].id,
    },
    // Charlie has not submitted for assignment-1 yet (PENDING)

    // Assignment 2: "Basic Data Structures" (Past due)
    {
      id: 'submission-3',
      content:
        'An array is a collection of items stored at contiguous memory locations...',
      status: 'GRADED' as const,
      grade: 88.0,
      feedback:
        'Good explanation, but could use more examples for linked lists.',
      studentId: students[0].id, // Alice
      assignmentId: assignments[1].id,
    },
    {
      id: 'submission-4',
      content: 'Arrays use an index, linked lists use pointers...',
      status: 'GRADED' as const,
      grade: 75.0,
      feedback:
        'A bit too brief. Please elaborate more on the performance differences next time.',
      studentId: students[2].id, // Charlie
      assignmentId: assignments[1].id,
    },
    // Bob has not submitted for assignment-2 (PENDING)

    // Assignment 3: "HTML & CSS Portfolio" (Due in 14 days)
    {
      id: 'submission-5',
      content:
        '<html><head>...</head><body><h1>My Portfolio</h1>...</body></html>',
      status: 'DRAFT' as const,
      studentId: students[1].id, // Bob
      assignmentId: assignments[2].id,
    },
    // Charlie has not started assignment-3 (PENDING)
  ];
  for (const submission of submissions) {
    await prisma.submission.upsert({
      where: { id: submission.id },
      update: {},
      create: submission,
    });
  }
  console.log(`   ✅ Created/updated ${submissions.length} submissions`);
}

/**
 * Seed Plagiarism Checks
 */
async function seedPlagiarismChecks() {
  console.log('🔍 Seeding plagiarism checks...');
  const submissions = await prisma.submission.findMany({
    where: { status: { in: ['SUBMITTED', 'GRADED'] } },
  });
  const plagiarismChecks = [
    {
      submissionId: submissions.find((s) => s.id === 'submission-1')?.id,
      score: 2.5,
      status: 'completed',
      wordCount: 150,
      creditsUsed: 1,
      rawResponse: { result: 'low plagiarism' } as Prisma.JsonObject,
    },
    {
      submissionId: submissions.find((s) => s.id === 'submission-3')?.id,
      score: 18.7,
      status: 'completed',
      wordCount: 450,
      creditsUsed: 1,
      rawResponse: { result: 'medium plagiarism' } as Prisma.JsonObject,
    },
    {
      submissionId: submissions.find((s) => s.id === 'submission-4')?.id,
      score: 35.1,
      status: 'completed',
      wordCount: 300,
      creditsUsed: 1,
      rawResponse: { result: 'high plagiarism' } as Prisma.JsonObject,
    },
  ];
  const validChecks = plagiarismChecks.filter((c) => c.submissionId);
  for (const check of validChecks) {
    await prisma.plagiarismCheck.upsert({
      where: { submissionId: check.submissionId! },
      update: {},
      create: check as any,
    });
  }
  console.log(`   ✅ Created/updated ${validChecks.length} plagiarism checks`);
}

/**
 * Seed Submission Versions
 */
async function seedSubmissionVersions() {
  console.log('📝 Seeding submission versions...');
  const submissions = await prisma.submission.findMany();
  const versions: Omit<VersionData, 'id'>[] = [];
  for (const submission of submissions) {
    versions.push({
      // id: `version-${submission.id}-1`, // Hapus pembuatan ID manual
      submissionId: submission.id,
      version: 1,
      content: submission.content.substring(0, 20) + '... (initial draft)',
      updatedAt: new Date(submission.createdAt.getTime() + 10000),
    });
    if (submission.status !== 'DRAFT') {
      versions.push({
        // id: `version-${submission.id}-2`, // Hapus pembuatan ID manual
        submissionId: submission.id,
        version: 2,
        content: submission.content,
        updatedAt: new Date(submission.updatedAt.getTime() - 10000),
      });
    }
  }
  for (const version of versions) {
    await prisma.submissionVersion.upsert({
      where: {
        submissionId_version: {
          submissionId: version.submissionId,
          version: version.version,
        },
      },
      update: {},
      create: version,
    });
  }
  console.log(`   ✅ Created/updated ${versions.length} submission versions`);
}

/**
 * 🆕 Seed Class Activities
 */
async function seedClassActivities() {
  console.log('📰 Seeding class activities...');
  const activities: Prisma.ClassActivityCreateInput[] = [];

  // 1. Student Joined Activities
  const enrollments = await prisma.classEnrollment.findMany({
    include: { student: true },
  });
  for (const enrollment of enrollments) {
    activities.push({
      id: `act-join-${enrollment.id}`,
      class: { connect: { id: enrollment.classId } },
      actor: { connect: { id: enrollment.studentId } },
      type: 'STUDENT_JOINED',
      details: { studentName: enrollment.student.fullName },
      timestamp: enrollment.joinedAt,
    });
  }

  // 2. Assignment Created Activities
  const assignments = await prisma.assignment.findMany({
    where: { active: true },
    include: { class: true },
  });
  for (const assignment of assignments) {
    activities.push({
      id: `act-asg-create-${assignment.id}`,
      class: { connect: { id: assignment.classId } },
      actor: { connect: { id: assignment.class.instructorId } },
      type: 'ASSIGNMENT_CREATED',
      details: { assignmentTitle: assignment.title },
      timestamp: assignment.createdAt,
    });
  }

  // 3. Submission Submitted & Graded Activities
  const submissions = await prisma.submission.findMany({
    include: { student: true, assignment: true },
  });
  for (const submission of submissions) {
    if (submission.submittedAt) {
      activities.push({
        id: `act-sub-submit-${submission.id}`,
        class: { connect: { id: submission.assignment.classId } },
        actor: { connect: { id: submission.studentId } },
        type: 'SUBMISSION_SUBMITTED',
        details: {
          studentName: submission.student.fullName,
          assignmentTitle: submission.assignment.title,
        },
        timestamp: submission.submittedAt,
      });
    }
    if (submission.status === 'GRADED') {
      activities.push({
        id: `act-sub-graded-${submission.id}`,
        class: { connect: { id: submission.assignment.classId } },
        // Assuming instructor graded it
        actor: {
          connect: {
            id: (await prisma.class.findUnique({
              where: { id: submission.assignment.classId },
            }))!.instructorId,
          },
        },
        type: 'SUBMISSION_GRADED',
        details: {
          studentName: submission.student.fullName,
          assignmentTitle: submission.assignment.title,
          grade: submission.grade,
        },
        timestamp: new Date(submission.updatedAt.getTime() + 1000), // slightly after update
      });
    }
  }

  // Sort activities by timestamp before creating
  activities.sort(
    (a, b) =>
      new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime(),
  );

  for (const activity of activities) {
    await prisma.classActivity.upsert({
      where: { id: activity.id },
      update: {},
      create: activity,
    });
  }

  console.log(`   ✅ Created/updated ${activities.length} class activities`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
