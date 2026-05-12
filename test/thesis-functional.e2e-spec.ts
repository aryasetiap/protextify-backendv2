import * as fs from 'fs';
import * as path from 'path';
import request from 'supertest';

type AuthSession = {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
};

type ThesisTestData = {
  baseUrl?: string;
  instructor: {
    id: string;
    email: string;
  };
  student: {
    id: string;
    email: string;
  };
  classId: string;
  classToken: string;
  assignmentId: string;
  writeAssignmentId: string;
  submissionDraftId: string;
  submissionSubmittedId: string;
  shortContentSubmissionId: string;
  winstonAiSubmissionId: string;
  reportSubmissionId: string;
  createSubmissionStudent?: {
    id: string;
    email: string;
  };
  writeTestData: Array<{
    studentId: string;
    studentEmail: string;
    submissionId: string;
  }>;
};

const TEST_DATA_PATH = path.resolve(
  process.cwd(),
  'tests/performance/k6/data/test-data.local.json',
);
const DEFAULT_PASSWORD = 'thesis-perf-local-password';
const VALID_CONTENT =
  'Konten functional API testing backend Protextify. Teks dummy ini sengaja dibuat lebih dari seratus karakter agar valid untuk submit dan aman digunakan pada hidden dry-run lokal.';

function loadTestData(): ThesisTestData {
  if (!fs.existsSync(TEST_DATA_PATH)) {
    throw new Error(
      `Missing local test data file: ${TEST_DATA_PATH}. Run npm run test:data:setup first.`,
    );
  }

  return JSON.parse(fs.readFileSync(TEST_DATA_PATH, 'utf8')) as ThesisTestData;
}

function makeAuthHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function expectClientOrServerError(statusCode: number) {
  expect(statusCode).toBeGreaterThanOrEqual(400);
  expect(statusCode).toBeLessThan(600);
}

async function login(baseUrl: string, email: string): Promise<AuthSession> {
  const password = process.env.TEST_USER_PASSWORD || DEFAULT_PASSWORD;
  const response = await request(baseUrl)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(201);

  expect(response.body.accessToken).toEqual(expect.any(String));
  expect(response.body.user.email).toBe(email);

  return {
    token: response.body.accessToken,
    user: response.body.user,
  };
}

describe('Thesis Functional API Testing (hidden dry-run)', () => {
  const data = loadTestData();
  const baseUrl = process.env.BASE_URL || data.baseUrl || 'http://localhost:3000';

  let instructor: AuthSession;
  let student: AuthSession;
  let createSubmissionStudent: AuthSession | null = null;
  let createdSubmissionId: string | null = null;

  beforeAll(async () => {
    instructor = await login(baseUrl, data.instructor.email);
    student = await login(baseUrl, data.student.email);

    if (data.createSubmissionStudent?.email) {
      createSubmissionStudent = await login(
        baseUrl,
        data.createSubmissionStudent.email,
      );
    }
  });

  describe('positive cases', () => {
    it('POST /api/auth/login authenticates instructor', async () => {
      expect(instructor.user.role).toBe('INSTRUCTOR');
      expect(instructor.token).toEqual(expect.any(String));
    });

    it('POST /api/auth/login authenticates student', async () => {
      expect(student.user.role).toBe('STUDENT');
      expect(student.token).toEqual(expect.any(String));
    });

    it('GET /api/users/me returns instructor profile', async () => {
      const response = await request(baseUrl)
        .get('/api/users/me')
        .set(makeAuthHeader(instructor.token))
        .expect(200);

      expect(response.body.id).toBe(data.instructor.id);
      expect(response.body.email).toBe(data.instructor.email);
    });

    it('GET /api/users/me returns student profile', async () => {
      const response = await request(baseUrl)
        .get('/api/users/me')
        .set(makeAuthHeader(student.token))
        .expect(200);

      expect(response.body.id).toBe(data.student.id);
      expect(response.body.email).toBe(data.student.email);
    });

    it('GET /api/classes returns classes for instructor', async () => {
      const response = await request(baseUrl)
        .get('/api/classes')
        .set(makeAuthHeader(instructor.token))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((item) => item.id === data.classId)).toBe(true);
    });

    it('GET /api/classes/:id returns class detail', async () => {
      const response = await request(baseUrl)
        .get(`/api/classes/${data.classId}`)
        .set(makeAuthHeader(instructor.token))
        .expect(200);

      expect(response.body.id).toBe(data.classId);
      expect(response.body.classToken).toBe(data.classToken);
    });

    it('GET /api/classes/:classId/assignments returns assignments', async () => {
      const response = await request(baseUrl)
        .get(`/api/classes/${data.classId}/assignments`)
        .set(makeAuthHeader(instructor.token))
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((item) => item.id === data.assignmentId)).toBe(
        true,
      );
    });

    it('GET /api/assignments/:id returns assignment detail', async () => {
      const response = await request(baseUrl)
        .get(`/api/assignments/${data.assignmentId}`)
        .set(makeAuthHeader(instructor.token))
        .expect(200);

      expect(response.body.id).toBe(data.assignmentId);
      expect(response.body.active).toBe(true);
    });

    it('POST /api/assignments/:assignmentId/submissions creates a submission for create candidate', async () => {
      if (!createSubmissionStudent) {
        pending('No createSubmissionStudent available in test-data.local.json');
        return;
      }

      const response = await request(baseUrl)
        .post(`/api/assignments/${data.writeAssignmentId}/submissions`)
        .set(makeAuthHeader(createSubmissionStudent.token))
        .send({ content: VALID_CONTENT })
        .expect(201);

      createdSubmissionId = response.body.id;
      expect(response.body.assignmentId).toBe(data.writeAssignmentId);
      expect(response.body.studentId).toBe(createSubmissionStudent.user.id);
      expect(response.body.status).toBe('DRAFT');
    });

    it('PATCH /api/submissions/:id/content updates draft submission content', async () => {
      const response = await request(baseUrl)
        .patch(`/api/submissions/${data.submissionDraftId}/content`)
        .set(makeAuthHeader(student.token))
        .send({ content: `${VALID_CONTENT} Update content positive case.` })
        .expect(200);

      expect(response.body.id).toBe(data.submissionDraftId);
      expect(response.body.status).toBe('DRAFT');
    });

    it('POST /api/submissions/:id/submit submits draft submission', async () => {
      const response = await request(baseUrl)
        .post(`/api/submissions/${data.submissionDraftId}/submit`)
        .set(makeAuthHeader(student.token))
        .send({ answers: [8, 8, 8, 8, 8] })
        .expect(201);

      expect(response.body.id).toBe(data.submissionDraftId);
      expect(response.body.status).toBe('SUBMITTED');
    });

    it('GET /api/submissions/:id returns submission detail', async () => {
      const response = await request(baseUrl)
        .get(`/api/submissions/${data.submissionSubmittedId}`)
        .set(makeAuthHeader(instructor.token))
        .expect(200);

      expect(response.body.id).toBe(data.submissionSubmittedId);
      expect(response.body.status).toBe('SUBMITTED');
    });

    it('GET /api/classes/:classId/history returns class submission history', async () => {
      const response = await request(baseUrl)
        .get(`/api/classes/${data.classId}/history`)
        .set(makeAuthHeader(instructor.token))
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('GET /api/plagiarism/queue-stats returns queue stats for instructor', async () => {
      const response = await request(baseUrl)
        .get('/api/plagiarism/queue-stats')
        .set(makeAuthHeader(instructor.token))
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          waiting: expect.any(Number),
          active: expect.any(Number),
          completed: expect.any(Number),
          failed: expect.any(Number),
          total: expect.any(Number),
        }),
      );
    });

    it('GET /api/submissions/:id/plagiarism-report returns not_checked without calling storage provider', async () => {
      const response = await request(baseUrl)
        .get(`/api/submissions/${data.winstonAiSubmissionId}/plagiarism-report`)
        .set(makeAuthHeader(instructor.token))
        .expect(200);

      expect(response.body.submissionId).toBe(data.winstonAiSubmissionId);
      expect(response.body.status).toBe('not_checked');
    });
  });

  describe('negative cases', () => {
    it('GET /api/users/me rejects missing token', async () => {
      await request(baseUrl).get('/api/users/me').expect(401);
    });

    it('GET /api/plagiarism/queue-stats rejects student role', async () => {
      const response = await request(baseUrl)
        .get('/api/plagiarism/queue-stats')
        .set(makeAuthHeader(student.token));

      expect([401, 403]).toContain(response.status);
    });

    it('POST /api/submissions/:id/check-plagiarism rejects short content before provider call', async () => {
      const response = await request(baseUrl)
        .post(`/api/submissions/${data.shortContentSubmissionId}/check-plagiarism`)
        .set(makeAuthHeader(instructor.token))
        .send({});

      expect(response.status).toBe(400);
    });

    it('POST /api/submissions/:id/check-plagiarism rejects DRAFT submission before provider call', async () => {
      const draftId = createdSubmissionId || data.writeTestData[0]?.submissionId;
      const response = await request(baseUrl)
        .post(`/api/submissions/${draftId}/check-plagiarism`)
        .set(makeAuthHeader(instructor.token))
        .send({});

      expect(response.status).toBe(400);
    });

    it('PATCH /api/submissions/:id/content rejects invalid payload', async () => {
      const response = await request(baseUrl)
        .patch(`/api/submissions/${data.submissionDraftId}/content`)
        .set(makeAuthHeader(student.token))
        .send({ content: 12345 });

      expect(response.status).toBe(400);
    });

    it('GET /api/submissions/:id handles invalid id with an error response', async () => {
      const response = await request(baseUrl)
        .get('/api/submissions/not-a-real-submission-id')
        .set(makeAuthHeader(instructor.token));

      expectClientOrServerError(response.status);
    });
  });
});
