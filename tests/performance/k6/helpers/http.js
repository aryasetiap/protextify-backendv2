import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { endpoint } from '../config.js';
import { authHeaders } from './auth.js';

export const apiSuccessRate = new Rate('api_success_rate');
export const status2xx = new Counter('status_2xx');
export const status4xx = new Counter('status_4xx');
export const status5xx = new Counter('status_5xx');

export function apiRequest(method, path, options = {}) {
  const expectedStatuses = options.expectedStatuses || [200];
  const endpointName = options.endpointName || path;
  const token = options.token;
  const body = options.body === undefined ? null : JSON.stringify(options.body);
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(token),
  };

  const response = http.request(method, endpoint(path), body, {
    headers,
    tags: {
      endpoint: endpointName,
      method,
    },
  });

  const success = expectedStatuses.indexOf(response.status) >= 0;
  apiSuccessRate.add(success, { endpoint: endpointName, method });

  if (response.status >= 200 && response.status < 300) {
    status2xx.add(1, { endpoint: endpointName });
  } else if (response.status >= 400 && response.status < 500) {
    status4xx.add(1, { endpoint: endpointName });
  } else if (response.status >= 500) {
    status5xx.add(1, { endpoint: endpointName });
  }

  check(
    response,
    {
      [`${method} ${endpointName} status is expected`]: () => success,
    },
    {
      endpoint: endpointName,
      method,
    },
  );

  return response;
}
