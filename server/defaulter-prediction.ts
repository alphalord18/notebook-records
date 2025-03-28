import { log } from './vite';

/**
 * Interface for submission data used in defaulter prediction
 */
interface SubmissionData {
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
 * Interface for student submission history
 */
interface StudentSubmissionHistory {
  studentId: string;
  studentName: string;
  scholarNumber: string;
  submissions: SubmissionData[];
  previousMissingCount: number;
}

/**
 * Prediction result for a potential defaulter
 */
export interface DefaulterPrediction {
  studentId: string;
  studentName: string;
  scholarNumber: string;
  defaultProbability: number;
  missingCount: number;
  historyPattern: string;
  reasoning: string[];
}

/**
 * AI service for predicting potential defaulters
 */
export class DefaulterPredictionService {
  /**
   * Predicts potential defaulters based on submission history
   * @param studentsHistory Array of student submission histories
   * @param threshold Threshold for considering a student as a potential defaulter (default: 2)
   * @returns Array of defaulter predictions
   */
  predictDefaulters(
    studentsHistory: StudentSubmissionHistory[],
    threshold: number = 2
  ): DefaulterPrediction[] {
    const predictions: DefaulterPrediction[] = [];

    for (const student of studentsHistory) {
      // Skip students with no submission history
      if (student.submissions.length === 0) continue;

      // Initialize factors that contribute to prediction
      const factors: string[] = [];
      let probability = 0;

      // Calculate statistics
      const stats = this.calculateSubmissionStats(student.submissions);
      
      // Factor 1: Missing submissions count
      const missingSubmissions = stats.missingCount;
      if (missingSubmissions >= threshold) {
        probability += 30;
        factors.push(`Has ${missingSubmissions} missing submissions`);
      }

      // Factor 2: Previous missing submissions
      if (student.previousMissingCount > 0) {
        const addedProbability = Math.min(student.previousMissingCount * 10, 30);
        probability += addedProbability;
        factors.push(`Has ${student.previousMissingCount} missing submissions from previous cycles`);
      }

      // Factor 3: Submission rate
      const submissionRate = stats.submissionRate;
      if (submissionRate < 70) {
        const rateBasedProbability = Math.round((100 - submissionRate) * 0.3);
        probability += rateBasedProbability;
        factors.push(`Low submission rate (${submissionRate}%)`);
      }

      // Factor 4: Consecutive missing pattern
      const consecutivePattern = this.detectConsecutivePattern(student.submissions);
      if (consecutivePattern.hasPattern) {
        probability += 15;
        factors.push(consecutivePattern.reason);
      }

      // Factor 5: Late submissions
      if (stats.lateSubmissions > 0) {
        const lateSubmissionsFactor = Math.min(stats.lateSubmissions * 5, 15);
        probability += lateSubmissionsFactor;
        factors.push(`Has ${stats.lateSubmissions} late submissions`);
      }

      // Adjust probability to ensure it doesn't exceed 100%
      probability = Math.min(probability, 100);
      
      // Only include students with non-zero probability
      if (probability > 0) {
        predictions.push({
          studentId: student.studentId,
          studentName: student.studentName,
          scholarNumber: student.scholarNumber,
          defaultProbability: probability,
          missingCount: stats.missingCount + student.previousMissingCount,
          historyPattern: this.generateHistoryPattern(stats, consecutivePattern.hasPattern),
          reasoning: factors
        });
      }
    }

    // Sort by default probability (highest first)
    return predictions.sort((a, b) => b.defaultProbability - a.defaultProbability);
  }

  /**
   * Calculates submission statistics for a student
   * @param submissions Array of submission data
   * @returns Statistics about the submissions
   */
  private calculateSubmissionStats(submissions: SubmissionData[]) {
    const totalSubmissions = submissions.length;
    const missingCount = submissions.filter(s => s.status === 'missing').length;
    const submittedCount = submissions.filter(s => s.status === 'submitted' || s.status === 'returned').length;
    const returnedCount = submissions.filter(s => s.status === 'returned').length;
    
    // Calculate submission rate (percentage of non-missing submissions)
    const submissionRate = totalSubmissions > 0 
      ? Math.round((submittedCount / totalSubmissions) * 100) 
      : 0;
    
    // Calculate late submissions
    const lateSubmissions = submissions.filter(s => {
      if (!s.submittedAt || !s.dueDate) return false;
      return s.submittedAt > s.dueDate;
    }).length;

    return {
      totalSubmissions,
      missingCount,
      submittedCount,
      returnedCount,
      submissionRate,
      lateSubmissions
    };
  }

  /**
   * Detects consecutive patterns in missing submissions
   * @param submissions Array of submission data
   * @returns Object indicating whether a pattern was found and the reason
   */
  private detectConsecutivePattern(submissions: SubmissionData[]): { hasPattern: boolean; reason: string } {
    // Sort submissions by date (cycle start date)
    const sortedSubmissions = [...submissions].sort((a, b) => 
      a.cycleStartDate.getTime() - b.cycleStartDate.getTime()
    );
    
    let consecutiveMissing = 0;
    let maxConsecutiveMissing = 0;
    
    // Count consecutive missing submissions
    for (let i = 0; i < sortedSubmissions.length; i++) {
      if (sortedSubmissions[i].status === 'missing') {
        consecutiveMissing++;
        maxConsecutiveMissing = Math.max(maxConsecutiveMissing, consecutiveMissing);
      } else {
        consecutiveMissing = 0;
      }
    }
    
    // Check if ending on a streak of missing submissions
    const endingOnMissingStreak = consecutiveMissing >= 2;
    
    if (maxConsecutiveMissing >= 3) {
      return { 
        hasPattern: true, 
        reason: `Has pattern of ${maxConsecutiveMissing} consecutive missing submissions` 
      };
    } else if (endingOnMissingStreak) {
      return { 
        hasPattern: true, 
        reason: `Currently on a streak of ${consecutiveMissing} missing submissions` 
      };
    }
    
    return { hasPattern: false, reason: '' };
  }

  /**
   * Generates a human-readable history pattern description
   * @param stats Submission statistics
   * @param hasConsecutivePattern Whether consecutive missing pattern was detected
   * @returns String description of the submission pattern
   */
  private generateHistoryPattern(
    stats: { 
      totalSubmissions: number;
      missingCount: number;
      submittedCount: number;
      returnedCount: number;
      submissionRate: number;
      lateSubmissions: number;
    },
    hasConsecutivePattern: boolean
  ): string {
    if (stats.totalSubmissions < 3) {
      return 'Insufficient data';
    }
    
    if (hasConsecutivePattern) {
      return 'Sequential missing submissions';
    }
    
    if (stats.lateSubmissions > stats.totalSubmissions / 4) {
      return 'Frequently submits late';
    }
    
    if (stats.submissionRate < 50) {
      return 'Low submission rate overall';
    }
    
    if (stats.submissionRate >= 90) {
      return 'Excellent submission record';
    }

    if (stats.missingCount > 0 && stats.missingCount < 3) {
      return 'Occasional missing submissions';
    }
    
    return 'Regular submission pattern';
  }
}

// Export a singleton instance
export const defaulterPredictionService = new DefaulterPredictionService();