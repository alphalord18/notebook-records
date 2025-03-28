import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { Check, Clock, AlertTriangle, History, FileText, List } from 'lucide-react';
import { SubmissionStatus } from './students-table';

interface ClassHistory {
  id: string;
  classId: string;
  className: string;
  date: string;
  reason?: string;
  changedBy: string;
  changedByName: string;
}

interface SubmissionHistory {
  id: string;
  cycleId: string;
  cycleName: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  status: SubmissionStatus;
  submittedAt?: string;
  returnedAt?: string;
  notificationSent: boolean;
  notificationSentAt?: string;
  lateBy?: number; // in days
}

interface StudentHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  scholarNumber: string;
  classHistory: ClassHistory[];
  submissionHistory: SubmissionHistory[];
  isLoading?: boolean;
}

export function StudentHistoryDialog({
  isOpen,
  onClose,
  studentId,
  studentName,
  scholarNumber,
  classHistory,
  submissionHistory,
  isLoading = false,
}: StudentHistoryDialogProps) {
  const [activeTab, setActiveTab] = useState(0);
  
  // Get status badge based on submission status
  const getStatusBadge = (status: SubmissionStatus) => {
    switch(status) {
      case 'submitted':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="w-3 h-3 mr-1" />
            Submitted
          </Badge>
        );
      case 'returned':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Check className="w-3 h-3 mr-1" />
            Returned
          </Badge>
        );
      case 'missing':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Missing
          </Badge>
        );
      default:
        return null;
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate submission statistics
  const submissionStats = {
    total: submissionHistory.length,
    returned: submissionHistory.filter(s => s.status === 'returned').length,
    submitted: submissionHistory.filter(s => s.status === 'submitted').length,
    missing: submissionHistory.filter(s => s.status === 'missing').length,
    submissionRate: submissionHistory.length > 0 
      ? Math.round(((submissionHistory.filter(s => s.status === 'returned' || s.status === 'submitted').length) / submissionHistory.length) * 100)
      : 0,
  };

  // Get history pattern
  const getHistoryPattern = () => {
    if (submissionHistory.length < 3) return 'Not enough data';

    // Check for consecutive missing submissions
    let consecutiveMissing = 0;
    let maxConsecutiveMissing = 0;
    let missAfterHolidays = 0;
    let lateSubmissions = 0;

    // Sort submission history by date
    const sortedHistory = [...submissionHistory].sort((a, b) => {
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : Infinity;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : Infinity;
      return dateA - dateB;
    });

    for (let i = 0; i < sortedHistory.length; i++) {
      const submission = sortedHistory[i];
      
      // Count consecutive missing
      if (submission.status === 'missing') {
        consecutiveMissing++;
        maxConsecutiveMissing = Math.max(maxConsecutiveMissing, consecutiveMissing);
      } else {
        consecutiveMissing = 0;
      }
      
      // Count late submissions
      if (submission.lateBy && submission.lateBy > 0) {
        lateSubmissions++;
      }
    }

    // Generate pattern description
    if (maxConsecutiveMissing >= 3) {
      return 'Multiple consecutive missing submissions';
    } else if (missAfterHolidays >= 2) {
      return 'Tends to miss submissions after holidays';
    } else if (lateSubmissions > sortedHistory.length / 3) {
      return 'Frequently submits late';
    } else if (submissionStats.submissionRate < 50) {
      return 'Low submission rate overall';
    } else if (submissionStats.submissionRate > 90) {
      return 'Excellent submission record';
    } else {
      return 'Occasional missing submissions';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <History className="w-5 h-5 mr-2" />
            Student History - {studentName}
          </DialogTitle>
          <DialogDescription>
            Scholar Number: {scholarNumber} | Student ID: {studentId}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading student history...</p>
          </div>
        ) : (
          <TabGroup index={activeTab} onIndexChange={setActiveTab}>
            <TabList className="mt-2">
              <Tab icon={FileText}>Submission History</Tab>
              <Tab icon={List}>Class History</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <span className="text-sm text-gray-600">Total</span>
                    <div className="text-xl font-semibold">{submissionStats.total}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <span className="text-sm text-gray-600">Returned</span>
                    <div className="text-xl font-semibold">{submissionStats.returned}</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <span className="text-sm text-gray-600">Awaiting Return</span>
                    <div className="text-xl font-semibold">{submissionStats.submitted - submissionStats.returned}</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <span className="text-sm text-gray-600">Missing</span>
                    <div className="text-xl font-semibold">{submissionStats.missing}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">Submission Pattern</h4>
                    <Badge variant="outline" className="bg-amber-50">AI Analysis</Badge>
                  </div>
                  <div className="border rounded-md p-3 bg-gray-50 text-gray-700">
                    {getHistoryPattern()}
                  </div>
                </div>

                <div className="mt-6 border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Returned At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {submissionHistory.length > 0 ? (
                        submissionHistory.map((submission) => (
                          <tr key={submission.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(submission.submittedAt || submission.notificationSentAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {submission.subjectName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {submission.className}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(submission.status)}
                              {submission.lateBy && submission.lateBy > 0 && (
                                <Badge variant="outline" className="ml-2 text-amber-600 border-amber-200 bg-amber-50">
                                  {submission.lateBy}d late
                                </Badge>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(submission.returnedAt)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            No submission history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabPanel>
              <TabPanel>
                <div className="mt-6 border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Changed By</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {classHistory.length > 0 ? (
                        classHistory.map((history) => (
                          <tr key={history.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(history.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {history.className}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {history.changedByName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {history.reason || 'No reason provided'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            No class history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}