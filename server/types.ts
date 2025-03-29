/**
 * Type definitions for StudentSubmissionHistory needed for defaulter prediction
 */

import { Submission, StudentWithSubmission } from "../shared/firebase-types";

export interface StudentSubmissionHistory {
  id: string;
  studentId?: string;
  fullName: string;
  studentName?: string;
  scholarNumber: string;
  submissions: SubmissionData[];
  previousMissingCount: number;
}

export interface DefaulterPrediction {
  studentId: string;
  studentName: string;
  scholarNumber: string;
  defaultProbability: number;
  missingCount: number;
  historyPattern: string;
  reasoning: string[];
}

export interface SubmissionData {
  studentId: string;
  submissionId: string;
  status: 'submitted' | 'returned' | 'missing';
  submittedAt?: Date;
  returnedAt?: Date;
  dueDate?: Date;
  cycleId: string;
  cycleStartDate: Date;
}

/**
 * Used for adapting StudentWithSubmission to fit the interface needs for the defaulter predictor service
 */
export function adaptStudentForDefaulterPrediction(student: StudentWithSubmission): {
  id: string;
  fullName: string; 
  scholarNumber: string;
  submissions: SubmissionData[];
  previousMissingCount: number;
} {
  // Convert submissions to the format required by the predictor service
  const submissionData: SubmissionData[] = student.submissions.map(submission => ({
    studentId: student.id,
    submissionId: submission.id,
    status: submission.status,
    // Convert Timestamps to native JavaScript Dates where needed
    submittedAt: submission.submittedAt?.toDate(),
    returnedAt: submission.returnedAt?.toDate(),
    dueDate: undefined, // Typically we don't have this, could be calculated based on cycle
    cycleId: submission.cycleId,
    cycleStartDate: new Date() // Placeholder, should be populated from actual cycle data
  }));

  return {
    id: student.id,
    fullName: student.fullName,
    scholarNumber: student.scholarNumber,
    submissions: submissionData,
    previousMissingCount: student.missedCount || 0
  };
}