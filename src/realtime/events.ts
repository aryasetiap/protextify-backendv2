// WebSocket Event Definitions untuk Protextify

export interface UpdateContentEvent {
  submissionId: string;
  content: string;
  updatedAt: string;
}

export interface UpdateContentResponse {
  status: 'success' | 'error';
  updatedAt?: string;
  message?: string;
}

export interface SubmissionUpdatedEvent {
  submissionId: string;
  status: string;
  grade?: number;
  plagiarismScore?: number;
  updatedAt: string;
}

export interface NotificationEvent {
  type: string;
  message: string;
  data?: any;
  createdAt: string;
}

export interface SubmissionListUpdatedEvent {
  assignmentId: string;
  submissions: Array<{
    submissionId: string;
    studentId: string;
    status: string;
    plagiarismScore?: number;
    lastUpdated: string;
  }>;
}

// Event names as constants
export const WEBSOCKET_EVENTS = {
  // Client to Server
  JOIN_SUBMISSION: 'joinSubmission',
  UPDATE_CONTENT: 'updateContent',

  // Server to Client
  UPDATE_CONTENT_RESPONSE: 'updateContentResponse',
  SUBMISSION_UPDATED: 'submissionUpdated',
  NOTIFICATION: 'notification',
  SUBMISSION_LIST_UPDATED: 'submissionListUpdated',
} as const;
