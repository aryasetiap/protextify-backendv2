import { config } from '../config.js';

function metricValue(data, metricName, valueName) {
  const metric = data.metrics[metricName];
  if (!metric || !metric.values || metric.values[valueName] === undefined) {
    return 'n/a';
  }

  return metric.values[valueName];
}

function rateValue(data, metricName) {
  const metric = data.metrics[metricName];
  if (!metric || !metric.values || metric.values.rate === undefined) {
    return 'n/a';
  }

  return `${(metric.values.rate * 100).toFixed(2)}%`;
}

function buildTextSummary(data, scriptName) {
  return [
    `k6 ${scriptName} summary`,
    `label: ${config.runLabel}`,
    `baseUrl: ${config.baseUrl}`,
    `timestamp: ${new Date().toISOString()}`,
    '',
    `checks: ${rateValue(data, 'checks')}`,
    `http_req_failed: ${rateValue(data, 'http_req_failed')}`,
    `http_reqs: ${metricValue(data, 'http_reqs', 'count')}`,
    `http_req_duration avg: ${metricValue(data, 'http_req_duration', 'avg')}`,
    `http_req_duration p95: ${metricValue(data, 'http_req_duration', 'p(95)')}`,
    `http_req_duration p99: ${metricValue(data, 'http_req_duration', 'p(99)')}`,
    `iteration_duration avg: ${metricValue(data, 'iteration_duration', 'avg')}`,
    `status_2xx: ${metricValue(data, 'status_2xx', 'count')}`,
    `status_4xx: ${metricValue(data, 'status_4xx', 'count')}`,
    `status_5xx: ${metricValue(data, 'status_5xx', 'count')}`,
    '',
  ].join('\n');
}

export function makeSummary(data, scriptName) {
  const baseName = `${config.runLabel}-${scriptName}`;
  const summary = {};
  summary.stdout = buildTextSummary(data, scriptName);
  summary[`${config.summaryDir}/${baseName}-summary.json`] = JSON.stringify(data, null, 2);
  summary[`${config.summaryDir}/${baseName}-summary.txt`] = buildTextSummary(data, scriptName);
  return summary;
}
