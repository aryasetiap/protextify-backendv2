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
  submissionDraftId: string;
  shortContentSubmissionId: string;
  winstonAiSubmissionId: string;
};

const TEST_DATA_PATH = path.resolve(
  process.cwd(),
  'tests/performance/k6/data/test-data.local.json',
);
const DEFAULT_PASSWORD = 'thesis-perf-local-password';
const POLL_TIMEOUT_MS = Number(process.env.WINSTON_AI_TEST_TIMEOUT_MS || 30000);
const POLL_INTERVAL_MS = 1000;

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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function getQueueStats(baseUrl: string, token: string) {
  const response = await request(baseUrl)
    .get('/api/plagiarism/queue-stats')
    .set(makeAuthHeader(token))
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

  return response.body;
}

async function pollReportUntilTerminal(
  baseUrl: string,
  submissionId: string,
  token: string,
) {
  const startedAt = Date.now();
  let latestResponse: request.Response | null = null;

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    latestResponse = await request(baseUrl)
      .get(`/api/submissions/${submissionId}/plagiarism-report`)
      .set(makeAuthHeader(token))
      .expect(200);

    if (['completed', 'failed'].includes(latestResponse.body.status)) {
      return latestResponse.body;
    }

    await wait(POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for plagiarism report terminal status. Last status: ${
      latestResponse?.body?.status || 'unknown'
    }`,
  );
}

describe('Thesis WinstonAI Integration Testing (limited hidden dry-run)', () => {
  const data = loadTestData();
  const baseUrl = process.env.BASE_URL || data.baseUrl || 'http://localhost:3000';

  let instructor: AuthSession;
  let student: AuthSession;

  beforeAll(async () => {
    instructor = await login(baseUrl, data.instructor.email);
    student = await login(baseUrl, data.student.email);
  });

  describe('negative cases', () => {
    it('rejects DRAFT submission before provider call', async () => {
      const response = await request(baseUrl)
        .post(`/api/submissions/${data.submissionDraftId}/check-plagiarism`)
        .set(makeAuthHeader(instructor.token))
        .send({});

      expect(response.status).toBe(400);
    });

    it('rejects short content before provider call', async () => {
      const response = await request(baseUrl)
        .post(`/api/submissions/${data.shortContentSubmissionId}/check-plagiarism`)
        .set(makeAuthHeader(instructor.token))
        .send({});

      expect(response.status).toBe(400);
    });

    it('rejects student role for trigger endpoint', async () => {
      const response = await request(baseUrl)
        .post(`/api/submissions/${data.winstonAiSubmissionId}/check-plagiarism`)
        .set(makeAuthHeader(student.token))
        .send({});

      expect([401, 403]).toContain(response.status);
    });

    it('rejects invalid submission id format', async () => {
      const response = await request(baseUrl)
        .post('/api/submissions/not-a-valid-id/check-plagiarism')
        .set(makeAuthHeader(instructor.token))
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('positive mock/provider flow', () => {
    it('queues plagiarism check and reaches report terminal status', async () => {
      const beforeStats = await getQueueStats(baseUrl, instructor.token);

      const triggerResponse = await request(baseUrl)
        .post(`/api/submissions/${data.winstonAiSubmissionId}/check-plagiarism`)
        .set(makeAuthHeader(instructor.token))
        .send({});

      expect([200, 201]).toContain(triggerResponse.status);

      expect(triggerResponse.body).toEqual(
        expect.objectContaining({
          status: expect.stringMatching(/queued|processing|completed/),
          message: expect.any(String),
        }),
      );

      const afterTriggerStats = await getQueueStats(baseUrl, instructor.token);
      expect(afterTriggerStats.total).toBeGreaterThanOrEqual(beforeStats.total);

      const report = await pollReportUntilTerminal(
        baseUrl,
        data.winstonAiSubmissionId,
        instructor.token,
      );

      expect(report.submissionId).toBe(data.winstonAiSubmissionId);
      expect(report.status).toBe('completed');
      expect(report.score).toEqual(expect.any(Number));
      expect(report.wordCount).toBeGreaterThan(0);
      expect(report.creditsUsed).toEqual(expect.any(Number));
      expect(report.pdfReportUrl === null || typeof report.pdfReportUrl === 'string').toBe(
        true,
      );

      const detailedResults = report.detailedResults;
      expect(detailedResults).toEqual(
        expect.objectContaining({
          result: expect.objectContaining({
            score: expect.any(Number),
            textWordCounts: expect.any(Number),
          }),
          metadata: expect.objectContaining({
            providerMode: expect.stringMatching(/mock|real/),
            providerLatencyMs: expect.any(Number),
          }),
        }),
      );

      const finalStats = await getQueueStats(baseUrl, instructor.token);
      expect(finalStats.completed + finalStats.failed).toBeGreaterThanOrEqual(
        beforeStats.completed + beforeStats.failed,
      );
    });
  });
});
