import { log } from './vite';
import { DefaulterPrediction, SubmissionData, StudentSubmissionHistory } from './types';

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
      // Skip students with no submissions
      if (student.submissions.length === 0) {
        continue;
      }

      // Calculate stats about submissions
      const stats = this.calculateSubmissionStats(student.submissions);
      
      // Skip students with no missing submissions
      if (stats.missingCount === 0) {
        continue;
      }
      
      // Check for consecutive missing pattern
      const consecutivePattern = this.detectConsecutivePattern(student.submissions);
      
      // Generate reasoning for prediction
      const reasoning: string[] = [];
      
      if (stats.missingCount >= threshold) {
        reasoning.push(`Student has ${stats.missingCount} missing submissions, which is at or above the threshold of ${threshold}.`);
      }
      
      if (consecutivePattern.hasPattern) {
        reasoning.push(consecutivePattern.reason);
      }
      
      if (student.previousMissingCount > 0) {
        reasoning.push(`Student has a history of ${student.previousMissingCount} missing submissions from previous cycles.`);
      }
      
      // Calculate a default probability based on factors
      let defaultProbability = 0;
      
      // Factor 1: Percentage of missing submissions (weighted 40%)
      const missingPercentage = stats.missingCount / student.submissions.length;
      defaultProbability += missingPercentage * 0.4;
      
      // Factor 2: Consecutive pattern (weighted 30%)
      if (consecutivePattern.hasPattern) {
        defaultProbability += 0.3;
      }
      
      // Factor 3: Previous history (weighted 30%)
      const previousHistoryFactor = Math.min(student.previousMissingCount / 5, 1); // Cap at 1
      defaultProbability += previousHistoryFactor * 0.3;
      
      // Generate a human-readable pattern description
      const historyPattern = this.generateHistoryPattern(
        stats,
        consecutivePattern.hasPattern,
        student.previousMissingCount
      );
      
      // Only add predictions for students with missing submissions
      if (stats.missingCount > 0) {
        predictions.push({
          studentId: student.studentId || student.id, // Use either field that's available
          studentName: student.studentName || student.fullName, // Use either field that's available
          scholarNumber: student.scholarNumber,
          defaultProbability,
          missingCount: stats.missingCount,
          historyPattern,
          reasoning
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
    const stats = {
      totalCount: submissions.length,
      submittedCount: 0,
      returnedCount: 0,
      missingCount: 0,
      lateSubmissionCount: 0
    };
    
    for (const submission of submissions) {
      if (submission.status === 'submitted') {
        stats.submittedCount++;
        
        // Check if it was submitted late (after due date)
        if (submission.submittedAt && submission.dueDate && 
            submission.submittedAt > submission.dueDate) {
          stats.lateSubmissionCount++;
        }
      } else if (submission.status === 'returned') {
        stats.returnedCount++;
      } else if (submission.status === 'missing') {
        stats.missingCount++;
      }
    }
    
    return stats;
  }
  
  /**
   * Detects consecutive patterns in missing submissions
   * @param submissions Array of submission data
   * @returns Object indicating whether a pattern was found and the reason
   */
  private detectConsecutivePattern(submissions: SubmissionData[]): { hasPattern: boolean; reason: string } {
    // Sort submissions by cycle start date
    const sortedSubmissions = [...submissions].sort(
      (a, b) => a.cycleStartDate.getTime() - b.cycleStartDate.getTime()
    );
    
    let consecutiveMissingCount = 0;
    let maxConsecutiveMissing = 0;
    
    // Track consecutive missing submissions
    for (let i = 0; i < sortedSubmissions.length; i++) {
      if (sortedSubmissions[i].status === 'missing') {
        consecutiveMissingCount++;
        maxConsecutiveMissing = Math.max(maxConsecutiveMissing, consecutiveMissingCount);
      } else {
        consecutiveMissingCount = 0;
      }
    }
    
    // Check if the most recent submissions are missing
    const recentSubmissions = sortedSubmissions.slice(-3); // Last 3 submissions
    const recentMissingCount = recentSubmissions.filter(s => s.status === 'missing').length;
    
    if (maxConsecutiveMissing >= 2) {
      return {
        hasPattern: true,
        reason: `Found a pattern of ${maxConsecutiveMissing} consecutive missing submissions.`
      };
    } else if (recentMissingCount >= 2) {
      return {
        hasPattern: true,
        reason: `${recentMissingCount} out of the last 3 submissions are missing.`
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
      totalCount: number;
      submittedCount: number;
      returnedCount: number;
      missingCount: number;
      lateSubmissionCount: number;
    },
    hasConsecutivePattern: boolean,
    previousMissingCount: number
  ): string {
    if (stats.missingCount === 0) {
      return "Regular submission pattern";
    }
    
    if (hasConsecutivePattern) {
      if (previousMissingCount > 0) {
        return "Consistent pattern of missing submissions across multiple cycles";
      } else {
        return "Recent pattern of consecutive missing submissions";
      }
    }
    
    if (stats.lateSubmissionCount > 0 && stats.missingCount > 0) {
      return "Mixed pattern of late and missing submissions";
    }
    
    if (stats.missingCount === 1 && stats.totalCount > 3) {
      return "Generally consistent with occasional missing submissions";
    }
    
    if (previousMissingCount > 3) {
      return "Long-term pattern of inconsistent submissions";
    }
    
    return "Irregular submission pattern";
  }
}

// Export a singleton instance
export const defaulterPredictionService = new DefaulterPredictionService();