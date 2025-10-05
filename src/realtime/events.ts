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

export interface NotificationEvent {
  type:
    | 'success'
    | 'error'
    | 'info'
    | 'warning'
    | 'payment_success'
    | 'payment_failed'
    | 'plagiarism_completed'
    | 'plagiarism_failed'
    | 'file_ready'
    | 'file_uploaded'
    | 'grade_received';
  message: string;
  data?: any;
  createdAt: string;
}

export interface SubmissionUpdatedEvent {
  submissionId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'GRADED'; // 🆕 Spesifikasi status yang lebih ketat
  grade?: number;
  plagiarismScore?: number;
  updatedAt: string;
}

export interface SubmissionListUpdatedEvent {
  assignmentId: string;
  submissions: Array<{
    submissionId: string;
    studentId: string;
    status: 'DRAFT' | 'SUBMITTED' | 'GRADED'; // 🆕 Spesifikasi status yang lebih ketat
    plagiarismScore?: number;
    lastUpdated: string;
  }>;
}

// 🆕 Tambahkan interface untuk event yang dikirim client ke server
export interface JoinSubmissionEvent {
  submissionId: string;
}

export interface JoinAssignmentMonitoringEvent {
  assignmentId: string;
}

// Event names as constants - pastikan sesuai dengan ekspektasi FE
export const WEBSOCKET_EVENTS = {
  // Client to Server
  JOIN_SUBMISSION: 'joinSubmission',
  JOIN_ASSIGNMENT_MONITORING: 'joinAssignmentMonitoring', // 🆕 Tambahkan event ini
  UPDATE_CONTENT: 'updateContent',

  // Server to Client
  CONNECTED: 'connected', // 🆕 Tambahkan event connection confirmation
  UPDATE_CONTENT_RESPONSE: 'updateContentResponse',
  SUBMISSION_UPDATED: 'submissionUpdated',
  NOTIFICATION: 'notification',
  SUBMISSION_LIST_UPDATED: 'submissionListUpdated',
  JOINED_SUBMISSION: 'joinedSubmission', // 🆕 Tambahkan confirmation events
  JOINED_ASSIGNMENT_MONITORING: 'joinedAssignmentMonitoring', // 🆕
} as const;
