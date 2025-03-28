import { twilioService } from './twilio-service';
import { NotificationTemplate, NotificationTemplateInput, Student, Submission, User } from '@shared/schema';
import { storage } from './storage';
import { log } from './vite';
import { defaulterPredictionService } from './defaulter-prediction';

type NotificationType = 'submission_reminder' | 'missing_submission' | 'defaulter_alert';

interface NotificationData {
  studentId: string;
  submissionId?: string;
  templateType: NotificationType;
  additionalData?: Record<string, any>;
}

class NotificationService {
  /**
   * Sends a notification to a student's parent
   * Uses template based on notification type
   */
  async sendNotification(data: NotificationData): Promise<boolean> {
    try {
      // Get the student
      const student = await storage.getStudent(data.studentId);
      if (!student) {
        log(`Student not found: ${data.studentId}`, 'notification');
        return false;
      }

      // Get the notification template
      const template = await storage.getNotificationTemplateByType(data.templateType);
      if (!template) {
        log(`Template not found for type: ${data.templateType}`, 'notification');
        return false;
      }

      // Get the submission if it exists
      let submission: Submission | null = null;
      if (data.submissionId) {
        submission = await storage.getSubmission(data.submissionId);
      }

      // Prepare the message content using template
      const messageContent = await this.prepareMessage(template, student, submission, data.additionalData);
      
      // If student has a phone number, send SMS
      if (student.parentPhone) {
        const smsResult = await this.sendSms(student.parentPhone, messageContent, template.subject);
        
        // Create notification history record
        await storage.createNotificationHistory({
          studentId: student.id,
          submissionId: data.submissionId,
          sent: smsResult.success,
          messageType: 'sms',
          messageContent,
          recipientNumber: student.parentPhone,
          status: smsResult.success ? 'delivered' : 'failed',
          errorMessage: smsResult.error
        });

        return smsResult.success;
      } else if (student.parentEmail) {
        // TODO: Implement email sending
        log(`Email notification not implemented yet. Would send to: ${student.parentEmail}`, 'notification');
        
        // Create notification history record for email (would be sent)
        await storage.createNotificationHistory({
          studentId: student.id,
          submissionId: data.submissionId,
          sent: false,
          messageType: 'email',
          messageContent,
          recipientEmail: student.parentEmail,
          status: 'pending',
          errorMessage: 'Email sending not implemented yet'
        });
      }
      
      log(`No contact method available for student: ${student.fullName}`, 'notification');
      return false;
    } catch (error) {
      log(`Error sending notification: ${error}`, 'notification');
      return false;
    }
  }

  /**
   * Prepare notification message from template
   */
  private async prepareMessage(
    template: NotificationTemplate, 
    student: Student, 
    submission?: Submission | null,
    additionalData?: Record<string, any>
  ): Promise<string> {
    let messageContent = template.template;
    
    // Replace student details
    messageContent = messageContent.replace(/{{studentName}}/g, student.fullName);
    messageContent = messageContent.replace(/{{scholarNumber}}/g, student.scholarNumber);
    messageContent = messageContent.replace(/{{parentName}}/g, student.parentName);
    
    // If submission is provided, replace submission details
    if (submission) {
      const subject = await storage.getSubject(submission.subjectId);
      const cycle = await storage.getSubmissionCycle(submission.cycleId);
      
      if (subject) {
        messageContent = messageContent.replace(/{{subjectName}}/g, subject.name);
      }
      
      if (cycle) {
        const dueDate = cycle.endDate 
          ? cycle.endDate.toDate().toLocaleDateString() 
          : 'as soon as possible';
        messageContent = messageContent.replace(/{{dueDate}}/g, dueDate);
      }
      
      // Replace submission status
      messageContent = messageContent.replace(/{{status}}/g, submission.status);
    }
    
    // Replace additional data values
    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        messageContent = messageContent.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
    }
    
    return messageContent;
  }

  /**
   * Send SMS notification via Twilio
   */
  private async sendSms(phoneNumber: string, message: string, subject?: string): Promise<{ success: boolean; error?: string }> {
    // Include subject in the message if provided
    const fullMessage = subject ? `${subject}\n\n${message}` : message;
    
    if (!twilioService.isReady()) {
      return { 
        success: false, 
        error: 'Twilio service not configured. SMS notifications are disabled.' 
      };
    }
    
    const result = await twilioService.sendSms({ 
      to: phoneNumber, 
      body: fullMessage 
    });
    
    return result;
  }

  /**
   * Send notifications to parents of students with missing submissions
   */
  async sendMissingSubmissionNotifications(classId: string, subjectId: string, cycleId: string): Promise<number> {
    try {
      // Get students with submissions
      const studentsWithSubmissions = await storage.getStudentsWithSubmissions(classId, subjectId, cycleId);
      
      let notificationCount = 0;
      
      for (const student of studentsWithSubmissions) {
        if (student.submissions.length > 0) {
          const submission = student.submissions[0];
          
          if (submission.status === 'missing' && !submission.notificationSent) {
            // Send missing submission notification
            const success = await this.sendNotification({
              studentId: student.id,
              submissionId: submission.id,
              templateType: 'missing_submission'
            });
            
            if (success) {
              // Update submission to mark notification as sent
              await storage.updateSubmission(submission.id, {
                notificationSent: true,
                notificationSentAt: new Date()
              });
              
              notificationCount++;
            }
          }
        }
      }
      
      return notificationCount;
    } catch (error) {
      log(`Error sending missing submission notifications: ${error}`, 'notification');
      return 0;
    }
  }

  /**
   * Send notifications to parents of potential defaulter students
   */
  async sendDefaulterNotifications(classId: string, threshold: number = 2): Promise<number> {
    try {
      // Get potential defaulters
      const defaulters = await storage.getPotentialDefaulters(classId, threshold);
      
      // Predict defaulters with AI model
      const predictions = defaulterPredictionService.predictDefaulters(defaulters, threshold);
      
      let notificationCount = 0;
      
      for (const prediction of predictions) {
        // Only send notifications for students with high default probability
        if (prediction.defaultProbability > 0.7) {
          const success = await this.sendNotification({
            studentId: prediction.studentId,
            templateType: 'defaulter_alert',
            additionalData: {
              missingCount: prediction.missingCount,
              historyPattern: prediction.historyPattern,
              defaultProbability: `${Math.round(prediction.defaultProbability * 100)}%`
            }
          });
          
          if (success) {
            notificationCount++;
          }
        }
      }
      
      return notificationCount;
    } catch (error) {
      log(`Error sending defaulter notifications: ${error}`, 'notification');
      return 0;
    }
  }

  /**
   * Create or update a notification template
   */
  async createOrUpdateTemplate(template: NotificationTemplateInput): Promise<NotificationTemplate | null> {
    try {
      // Check if template already exists
      const existingTemplate = await storage.getNotificationTemplateByType(template.type);
      
      if (existingTemplate) {
        // Update existing template
        return storage.updateNotificationTemplate(existingTemplate.id, {
          name: template.name,
          subject: template.subject,
          template: template.template
        });
      } else {
        // Create new template
        return storage.createNotificationTemplate(template);
      }
    } catch (error) {
      log(`Error creating/updating notification template: ${error}`, 'notification');
      return null;
    }
  }

  /**
   * Initialize default notification templates if they don't exist
   */
  async initializeDefaultTemplates(createdBy?: string): Promise<void> {
    const defaultTemplates = [
      {
        name: 'Submission Reminder',
        type: 'submission_reminder',
        subject: 'Reminder: Notebook Submission Due',
        template: `Dear {{parentName}},

We would like to remind you that {{studentName}}'s {{subjectName}} notebook submission is due on {{dueDate}}.

Please ensure that the notebook is submitted on time.

Regards,
The School Administration`,
        createdBy,
        isDefault: true
      },
      {
        name: 'Missing Submission',
        type: 'missing_submission',
        subject: 'Missing Notebook Submission',
        template: `Dear {{parentName}},

This is to inform you that {{studentName}} has not submitted their {{subjectName}} notebook which was due on {{dueDate}}.

Please ensure that the notebook is submitted as soon as possible.

Regards,
The School Administration`,
        createdBy,
        isDefault: true
      },
      {
        name: 'Potential Defaulter Alert',
        type: 'defaulter_alert',
        subject: 'Important: Consistent Missing Submissions',
        template: `Dear {{parentName}},

We are concerned to note that {{studentName}} has consistently failed to submit notebooks on time.

Missing submissions: {{missingCount}}
Recent pattern: {{historyPattern}}

Please address this issue urgently and ensure timely submissions going forward.

Regards,
The School Administration`,
        createdBy,
        isDefault: true
      }
    ];
    
    for (const template of defaultTemplates) {
      await this.createOrUpdateTemplate(template);
    }
  }
}

// Export a singleton instance
export const notificationService = new NotificationService();