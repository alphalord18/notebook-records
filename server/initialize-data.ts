import { storage } from './storage';
import { Timestamp } from './firebase-admin';

/**
 * Initializes the application with sample data
 * This should only be run once when the application starts if there's no data
 */
export async function initializeData() {
  console.log('Initializing application data...');
  
  try {
    // Check if we already have data
    const sessions = await storage.getSessions();
    if (sessions.length > 0) {
      console.log('Data already initialized, skipping...');
      return;
    }
    
    // Create academic session
    const currentSession = await storage.createSession({
      name: '2024-2025',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
      isActive: true
    });
    
    console.log('Created academic session:', currentSession.name);

    // Create classes
    const classData = [
      { name: 'Class 6A', teacherId: '' },
      { name: 'Class 7A', teacherId: '' },
      { name: 'Class 8A', teacherId: '' },
      { name: 'Class 9A', teacherId: '' },
      { name: 'Class 10A', teacherId: '' }
    ];
    
    // Get the class teacher user
    const classTeacher = await storage.getUserByUsername('class');
    
    if (!classTeacher) {
      throw new Error('Class teacher user not found');
    }
    
    // Assign class 6A to the class teacher
    classData[0].teacherId = classTeacher.id;
    
    // Create classes
    const classes = await Promise.all(
      classData.map(async (cls) => {
        return storage.createClass({
          name: cls.name,
          teacherId: cls.teacherId,
          sessionId: currentSession.id
        });
      })
    );
    
    console.log(`Created ${classes.length} classes`);
    
    // Update class teacher with assigned class
    await storage.updateUser(classTeacher.id, {
      assignedClassId: classes[0].id
    });
    
    // Create students (20 per class)
    for (let i = 0; i < classes.length; i++) {
      const classId = classes[i].id;
      const classPrefix = (i + 6).toString(); // 6,7,8,9,10
      
      for (let j = 1; j <= 20; j++) {
        const scholarNumberPrefix = classPrefix.padStart(2, '0');
        const scholarNumberSuffix = j.toString().padStart(3, '0');
        const scholarNumber = scholarNumberPrefix + scholarNumberSuffix;
        
        await storage.createStudent({
          fullName: `Student ${scholarNumber}`,
          scholarNumber: scholarNumber,
          rollNumber: j,
          classId: classId,
          parentName: `Parent of Student ${scholarNumber}`,
          parentPhone: `98765${scholarNumber.substring(1, 5)}`,
          parentEmail: `parent${scholarNumber}@example.com`,
          isActive: true
        });
      }
    }
    
    console.log('Created 100 students across 5 classes');
    
    // Get the subject teacher
    const subjectTeacher = await storage.getUserByUsername('subject');
    
    if (!subjectTeacher) {
      throw new Error('Subject teacher user not found');
    }
    
    // Create subjects
    const subjectData = [
      { name: 'Mathematics', color: '#4f46e5', frequency: 'weekly' },
      { name: 'Science', color: '#16a34a', frequency: 'biweekly' },
      { name: 'English', color: '#ea580c', frequency: 'weekly' },
      { name: 'Social Studies', color: '#9333ea', frequency: 'monthly' },
      { name: 'Hindi', color: '#dc2626', frequency: 'weekly' }
    ];
    
    // Create subjects for each class
    for (const cls of classes) {
      for (const subject of subjectData) {
        await storage.createSubject({
          name: subject.name,
          teacherId: subjectTeacher.id,
          classId: cls.id,
          notebookColor: subject.color,
          submissionFrequency: subject.frequency
        });
      }
    }
    
    console.log('Created 25 subjects across 5 classes');
    
    // Create submission cycles
    // Get all subjects
    const subjects = await storage.getSubjects();
    const now = new Date();
    
    // Create an active submission cycle for each subject
    for (const subject of subjects) {
      // Create a submission cycle 
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7); // Started a week ago
      
      const cycle = await storage.createSubmissionCycle({
        subjectId: subject.id,
        classId: subject.classId,
        startDate: startDate,
        name: `${subject.name} - Regular Submission`,
        createdBy: subjectTeacher.id
      });
      
      // Get students in this class
      const students = await storage.getStudentsByClassId(subject.classId);
      
      // Create submissions for each student
      // Randomize submissions: 60% submitted, 20% returned, 20% missing
      for (const student of students) {
        const random = Math.random();
        let status: 'submitted' | 'returned' | 'missing' = 'missing';
        
        let submittedAt = undefined;
        let returnedAt = undefined;
        
        if (random < 0.6) {
          status = 'submitted';
          
          // Randomize submission time between start date and now
          const submissionDate = new Date(startDate);
          const daysToAdd = Math.floor(Math.random() * 5) + 1;
          submissionDate.setDate(submissionDate.getDate() + daysToAdd);
          submittedAt = submissionDate;
          
        } else if (random < 0.8) {
          status = 'returned';
          
          // Submission was some days after start
          const submissionDate = new Date(startDate);
          const daysToAdd = Math.floor(Math.random() * 3) + 1;
          submissionDate.setDate(submissionDate.getDate() + daysToAdd);
          submittedAt = submissionDate;
          
          // Return was some days after submission
          const returnDate = new Date(submittedAt);
          returnDate.setDate(returnDate.getDate() + 2);
          returnedAt = returnDate;
        }
        
        await storage.createSubmission({
          studentId: student.id,
          subjectId: subject.id,
          cycleId: cycle.id,
          status,
          submittedAt,
          returnedAt,
          notes: status === 'missing' 
            ? 'Not submitted yet'
            : status === 'returned'
              ? 'Good work, keep it up!'
              : 'Pending review'
        });
      }
    }
    
    console.log('Created submission cycles and submissions');
    
    // Create notification templates
    const templates = [
      {
        name: 'Submission Reminder',
        type: 'submission_reminder',
        subject: 'Reminder: Notebook Submission Due',
        template: `Dear {{parentName}},

We would like to remind you that {{studentName}}'s {{subjectName}} notebook submission is due on {{dueDate}}.

{{previousHistory}}

Please ensure that the notebook is submitted on time.

Regards,
The School Administration`
      },
      {
        name: 'Missing Submission',
        type: 'missing_submission',
        subject: 'Missing Notebook Submission',
        template: `Dear {{parentName}},

This is to inform you that {{studentName}} has not submitted their {{subjectName}} notebook which was due on {{dueDate}}.

{{previousHistory}}

Please ensure that the notebook is submitted as soon as possible.

Regards,
The School Administration`
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
The School Administration`
      }
    ];
    
    for (const template of templates) {
      await storage.createNotificationTemplate({
        name: template.name,
        type: template.type,
        subject: template.subject,
        template: template.template
      });
    }
    
    console.log('Created notification templates');
    
    console.log('Data initialization complete!');
  } catch (error) {
    console.error('Error initializing data:', error);
    throw error;
  }
}