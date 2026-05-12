import { sleep } from 'k6';
import { config, testData } from './config.js';
import { loginAll } from './helpers/auth.js';
import { apiRequest } from './helpers/http.js';
import { updateContentPayload } from './helpers/payloads.js';
import { makeSummary } from './helpers/summary.js';

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  vus: config.load.vus,
  duration: config.load.duration,
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    checks: ['rate>0.95'],
    api_success_rate: ['rate>0.95'],
  },
};

export function setup() {
  return loginAll(testData);
}

export default function (session) {
  const readRequests = [
    () => apiRequest('GET', '/api/users/me', {
      endpointName: 'users_me',
      token: session.studentToken,
    }),
    () => apiRequest('GET', '/api/classes', {
      endpointName: 'classes_list',
      token: session.instructorToken,
    }),
    () => apiRequest('GET', `/api/classes/${testData.classId}`, {
      endpointName: 'class_detail',
      token: session.instructorToken,
    }),
    () => apiRequest('GET', `/api/classes/${testData.classId}/assignments`, {
      endpointName: 'class_assignments',
      token: session.instructorToken,
    }),
    () => apiRequest('GET', `/api/assignments/${testData.assignmentId}`, {
      endpointName: 'assignment_detail',
      token: session.instructorToken,
    }),
    () => apiRequest('GET', `/api/submissions/${testData.submissionSubmittedId}`, {
      endpointName: 'submission_detail',
      token: session.instructorToken,
    }),
    () => apiRequest('GET', `/api/classes/${testData.classId}/history`, {
      endpointName: 'class_history',
      token: session.instructorToken,
    }),
  ];

  readRequests[(__ITER + __VU) % readRequests.length]();

  if (config.enableWriteScenario && __ITER % 10 === 0) {
    apiRequest('PATCH', `/api/submissions/${testData.submissionDraftId}/content`, {
      endpointName: 'submission_update_content_limited',
      token: session.studentToken,
      body: updateContentPayload('load'),
    });
  }

  sleep(1);
}

export function handleSummary(data) {
  return makeSummary(data, 'load');
}
