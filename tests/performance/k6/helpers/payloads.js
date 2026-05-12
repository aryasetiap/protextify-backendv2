const BASE_CONTENT =
  'THESIS_PERF content for backend performance testing. This text is synthetic, local-only, and intentionally longer than one hundred characters for validation-safe request payloads.';

export function updateContentPayload(label) {
  return {
    content: `${BASE_CONTENT} Update scenario ${label}. Iteration marker ${Date.now()}-${__VU}-${__ITER}.`,
  };
}

export function createSubmissionPayload(label) {
  return {
    content: `${BASE_CONTENT} Create submission scenario ${label}. Unique marker ${Date.now()}-${__VU}-${__ITER}.`,
  };
}
