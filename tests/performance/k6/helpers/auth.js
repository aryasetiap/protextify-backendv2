import http from 'k6/http';
import { check } from 'k6';
import { config, endpoint } from '../config.js';

export function authHeaders(token) {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export function login(email, roleLabel) {
  const response = http.post(
    endpoint('/api/auth/login'),
    JSON.stringify({
      email,
      password: config.password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      tags: {
        endpoint: 'auth_login',
        role: roleLabel,
      },
    },
  );

  const ok = check(response, {
    [`login ${roleLabel} returns 201`]: (res) => res.status === 201,
    [`login ${roleLabel} returns access token`]: (res) =>
      Boolean(res.json('accessToken')),
  });

  if (!ok) {
    throw new Error(`Login failed for ${roleLabel}. Check local test data and TEST_USER_PASSWORD.`);
  }

  return response.json('accessToken');
}

export function loginAll(testData) {
  const sessions = {
    instructorToken: login(testData.instructor.email, 'instructor'),
    studentToken: login(testData.student.email, 'student'),
  };

  if (config.enableWriteScenario && testData.createSubmissionStudent?.email) {
    sessions.createSubmissionStudentToken = login(
      testData.createSubmissionStudent.email,
      'create_submission_student',
    );
  }

  return sessions;
}
