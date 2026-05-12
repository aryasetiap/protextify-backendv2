import { sleep } from 'k6';
import { config, testData } from './config.js';
import { loginAll } from './helpers/auth.js';
import { apiRequest } from './helpers/http.js';
import { makeSummary } from './helpers/summary.js';

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  scenarios: {
    default: {
      executor: 'shared-iterations',
      vus: Number.parseInt(__ENV.K6_WINSTONAI_VUS || '1', 10),
      iterations: Number.parseInt(__ENV.K6_WINSTONAI_ITERATIONS || '1', 10),
      maxDuration: __ENV.K6_WINSTONAI_MAX_DURATION || '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<3000', 'p(99)<6000'],
    checks: ['rate>0.90'],
    api_success_rate: ['rate>0.90'],
  },
};

export function setup() {
  return loginAll(testData);
}

export default function (session) {
  apiRequest('GET', '/api/plagiarism/queue-stats', {
    endpointName: 'plagiarism_queue_stats_before',
    token: session.instructorToken,
  });

  apiRequest('POST', `/api/submissions/${testData.winstonAiSubmissionId}/check-plagiarism`, {
    endpointName: 'winstonai_trigger_limited',
    token: session.instructorToken,
    expectedStatuses: [200, 201],
    body: {},
  });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reportResponse = apiRequest(
      'GET',
      `/api/submissions/${testData.winstonAiSubmissionId}/plagiarism-report`,
      {
        endpointName: 'winstonai_report_poll',
        token: session.instructorToken,
      },
    );

    const status = reportResponse.json('status');
    if (status === 'completed' || status === 'failed') {
      break;
    }

    sleep(1);
  }

  apiRequest('GET', '/api/plagiarism/queue-stats', {
    endpointName: 'plagiarism_queue_stats_after',
    token: session.instructorToken,
  });
}

export function handleSummary(data) {
  return makeSummary(data, 'winstonai-integration');
}
