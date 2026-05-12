import { sleep } from 'k6';
import { config, testData } from './config.js';
import { loginAll } from './helpers/auth.js';
import { apiRequest } from './helpers/http.js';
import { makeSummary } from './helpers/summary.js';

export const options = {
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  vus: config.smoke.vus,
  duration: config.smoke.duration,
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    checks: ['rate>0.95'],
    api_success_rate: ['rate>0.95'],
  },
};

export function setup() {
  return loginAll(testData);
}

export default function (session) {
  const requests = [
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
  ];

  requests[(__ITER + __VU) % requests.length]();
  sleep(1);
}

export function handleSummary(data) {
  return makeSummary(data, 'smoke');
}
