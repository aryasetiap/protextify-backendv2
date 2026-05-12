const DEFAULT_BASE_URL = 'http://localhost:3000';

export const config = {
  baseUrl: __ENV.BASE_URL || DEFAULT_BASE_URL,
  usersFile: __ENV.K6_USERS_FILE || './data/users.example.json',
  submissionsFile: __ENV.K6_SUBMISSIONS_FILE || './data/submissions.example.json',
  outputDir: __ENV.K6_OUTPUT_DIR || '../../../results/performance/hidden-dry-run',
};

export function endpoint(path) {
  return `${config.baseUrl}${path}`;
}

export function authHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}
