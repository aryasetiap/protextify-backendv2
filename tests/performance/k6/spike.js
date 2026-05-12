import { sleep } from 'k6';
import { config, testData } from './config.js';
import { loginAll } from './helpers/auth.js';
import { apiRequest } from './helpers/http.js';
import { makeSummary } from './helpers/summary.js';

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  stages: [
    { duration: '30s', target: 2 },
    { duration: '30s', target: config.spike.maxVus },
    { duration: '30s', target: 2 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<3000', 'p(99)<6000'],
    checks: ['rate>0.85'],
    api_success_rate: ['rate>0.85'],
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
    () => apiRequest('GET', `/api/classes/${testData.classId}`, {
      endpointName: 'class_detail',
      token: session.instructorToken,
    }),
    () => apiRequest('GET', `/api/assignments/${testData.assignmentId}`, {
      endpointName: 'assignment_detail',
      token: session.instructorToken,
    }),
    () => apiRequest('GET', `/api/classes/${testData.classId}/history`, {
      endpointName: 'class_history',
      token: session.instructorToken,
    }),
  ];

  readRequests[(__ITER + __VU) % readRequests.length]();
  sleep(1);
}

export function handleSummary(data) {
  return makeSummary(data, 'spike');
}
