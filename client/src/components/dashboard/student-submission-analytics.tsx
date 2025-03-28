import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Submission, Student, Subject } from '@shared/schema';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  BarChart3, 
  CalendarDays, 
  Clock, 
  LayoutList, 
  Loader2, 
  User,
  FileCheck,
  AlertTriangle,
  Check,
  FileX
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Type for student submission history
interface SubmissionHistoryItem {
  id: string;
  cycleId: string;
  date: string;
  status: 'submitted' | 'returned' | 'missing';
  submittedAt?: string;
  returnedAt?: string;
  subjectName: string;
  cycleName?: string;
}

interface StudentSubmissionAnalyticsProps {
  studentId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentSubmissionAnalytics({ 
  studentId, 
  open, 
  onOpenChange 
}: StudentSubmissionAnalyticsProps) {
  const { toast } = useToast();
  
  // Fetch student details
  const {
    data: student,
    isLoading: isLoadingStudent
  } = useQuery<Student>({
    queryKey: ['/api/students', studentId],
    enabled: !!studentId && open,
  });
  
  // Fetch submission history
  const {
    data: submissionHistory = [],
    isLoading: isLoadingHistory
  } = useQuery<SubmissionHistoryItem[]>({
    queryKey: ['/api/students', studentId, 'submission-history'],
    enabled: !!studentId && open,
  });
  
  // Calculate statistics
  const totalSubmissions = submissionHistory.length;
  const submittedCount = submissionHistory.filter(s => s.status === 'submitted' || s.status === 'returned').length;
  const returnedCount = submissionHistory.filter(s => s.status === 'returned').length;
  const missingCount = submissionHistory.filter(s => s.status === 'missing').length;
  
  const submissionRate = totalSubmissions > 0 
    ? Math.round((submittedCount / totalSubmissions) * 100) 
    : 0;
  
  // Group by subject to see pattern
  const subjectCounts = submissionHistory.reduce((acc: Record<string, { total: number, missing: number, submitted: number, returned: number }>, item) => {
    if (!acc[item.subjectName]) {
      acc[item.subjectName] = { total: 0, missing: 0, submitted: 0, returned: 0 };
    }
    
    acc[item.subjectName].total += 1;
    
    if (item.status === 'missing') {
      acc[item.subjectName].missing += 1;
    } else if (item.status === 'submitted') {
      acc[item.subjectName].submitted += 1;
    } else if (item.status === 'returned') {
      acc[item.subjectName].returned += 1;
    }
    
    return acc;
  }, {});
  
  // Find the subject with most missing submissions
  let mostProblematicSubject = { name: '', missingCount: 0, percentage: 0 };
  
  Object.entries(subjectCounts).forEach(([subject, counts]) => {
    const missingPercentage = Math.round((counts.missing / counts.total) * 100);
    if (counts.missing > mostProblematicSubject.missingCount) {
      mostProblematicSubject = {
        name: subject,
        missingCount: counts.missing,
        percentage: missingPercentage
      };
    }
  });
  
  // Check for consecutive missing submissions
  let consecutiveMissing = 0;
  let maxConsecutiveMissing = 0;
  
  // Sort history by date
  const sortedHistory = [...submissionHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  sortedHistory.forEach(item => {
    if (item.status === 'missing') {
      consecutiveMissing++;
      maxConsecutiveMissing = Math.max(maxConsecutiveMissing, consecutiveMissing);
    } else {
      consecutiveMissing = 0;
    }
  });
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Format time for display
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'h:mm a');
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary" className="rounded-sm">Submitted</Badge>;
      case 'returned':
        return <Badge variant="default" className="rounded-sm bg-green-500">Returned</Badge>;
      case 'missing':
        return <Badge variant="destructive" className="rounded-sm">Missing</Badge>;
      default:
        return <Badge variant="outline" className="rounded-sm">Unknown</Badge>;
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <FileCheck className="h-4 w-4 text-blue-500" />;
      case 'returned':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'missing':
        return <FileX className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Student Submission History
          </DialogTitle>
          <DialogDescription>
            Historical view of notebook submissions and analytics
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingStudent ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !student ? (
          <div className="p-4 text-center text-red-500">
            Failed to load student information
          </div>
        ) : (
          <>
            {/* Student Info */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-bold text-xl">
                {student.fullName.split(' ').map(part => part[0]).join('')}
              </div>
              <div>
                <h3 className="text-lg font-bold">{student.fullName}</h3>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <span>Scholar #{student.scholarNumber}</span>
                  <span>•</span>
                  <span>Roll #{student.rollNumber}</span>
                </div>
                <div className="text-sm text-gray-500">Parent: {student.parentName}</div>
              </div>
            </div>
            
            {/* Submission Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-blue-700">Submission Rate</div>
                      <div className="text-2xl font-bold text-blue-800">{submissionRate}%</div>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-full">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-green-700">Returned</div>
                      <div className="text-2xl font-bold text-green-800">{returnedCount} / {totalSubmissions}</div>
                    </div>
                    <div className="p-2 bg-green-100 rounded-full">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-red-700">Missing</div>
                      <div className="text-2xl font-bold text-red-800">{missingCount} / {totalSubmissions}</div>
                    </div>
                    <div className="p-2 bg-red-100 rounded-full">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium text-amber-700">Consecutive Missing</div>
                      <div className="text-2xl font-bold text-amber-800">{maxConsecutiveMissing}</div>
                    </div>
                    <div className="p-2 bg-amber-100 rounded-full">
                      <LayoutList className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Problematic Subject */}
            {mostProblematicSubject.name && (
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md font-medium">Subject Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span className="font-medium">Most missed submissions in: </span>
                    <span className="font-bold text-amber-600">{mostProblematicSubject.name}</span>
                    <Badge variant="outline" className="ml-2">
                      {mostProblematicSubject.missingCount} missing ({mostProblematicSubject.percentage}%)
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Submission History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-md font-medium">Submission History</CardTitle>
                <CardDescription>
                  {totalSubmissions} total submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : submissionHistory.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No submission history available
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedHistory.map((submission) => (
                      <div 
                        key={submission.id}
                        className="border rounded-md p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            {getStatusIcon(submission.status)}
                          </div>
                          <div className="flex-grow">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium">{submission.subjectName}</div>
                              {getStatusBadge(submission.status)}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <CalendarDays className="h-3 w-3 mr-1" />
                              <span>{formatDate(submission.date)}</span>
                              
                              {submission.submittedAt && (
                                <>
                                  <span className="mx-2">•</span>
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>Submitted: {formatTime(submission.submittedAt)}</span>
                                </>
                              )}
                              
                              {submission.returnedAt && (
                                <>
                                  <span className="mx-2">•</span>
                                  <Check className="h-3 w-3 mr-1" />
                                  <span>Returned: {formatTime(submission.returnedAt)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {submission.cycleName && (
                          <div className="mt-2 text-xs text-gray-500">
                            {submission.cycleName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <div className="text-xs text-gray-500">
                  {!isLoadingHistory && (
                    <>
                      Showing {submissionHistory.length} entries
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}