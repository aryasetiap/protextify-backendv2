const DEFAULT_TEST_DATA_PATH = './data/test-data.local.json';
const DEFAULT_PASSWORD = 'thesis-perf-local-password';

function readJson(path) {
  try {
    return JSON.parse(open(path));
  } catch (error) {
    throw new Error(
      `Unable to read k6 test data from ${path}. Run npm run test:data:setup first.`,
    );
  }
}

function intEnv(name, fallback) {
  const value = Number.parseInt(__ENV[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function boolEnv(name, fallback = false) {
  if (__ENV[name] === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].indexOf(String(__ENV[name]).toLowerCase()) >= 0;
}

export const testDataPath = __ENV.TEST_DATA_PATH || DEFAULT_TEST_DATA_PATH;
export const testData = readJson(testDataPath);

export const config = {
  baseUrl: __ENV.BASE_URL || testData.baseUrl || 'http://localhost:3000',
  password: __ENV.TEST_USER_PASSWORD || DEFAULT_PASSWORD,
  summaryDir: __ENV.K6_SUMMARY_DIR || 'results/performance/hidden-dry-run',
  runLabel: __ENV.K6_RUN_LABEL || 'hidden-dry-run',
  enableWriteScenario: boolEnv('ENABLE_WRITE_SCENARIO', false),
  smoke: {
    vus: intEnv('K6_SMOKE_VUS', 1),
    duration: __ENV.K6_SMOKE_DURATION || '30s',
  },
  load: {
    vus: intEnv('K6_LOAD_VUS', 40),
    duration: __ENV.K6_LOAD_DURATION || '5m',
  },
  stress: {
    maxVus: intEnv('K6_STRESS_MAX_VUS', 120),
  },
  spike: {
    maxVus: intEnv('K6_SPIKE_MAX_VUS', 120),
  },
  endurance: {
    vus: intEnv('K6_ENDURANCE_VUS', 40),
    duration: __ENV.K6_ENDURANCE_DURATION || '30m',
  },
};

export function endpoint(path) {
  return `${config.baseUrl}${path}`;
}
