import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  MoreVertical, 
  Search, 
  X, 
  Bell, 
  Clock, 
  History, 
  AlertTriangle, 
  User, 
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Define the type for student submission status
export type SubmissionStatus = 'submitted' | 'returned' | 'missing';

// Define the type for a student with submission info
export interface StudentSubmission {
  id: string;
  fullName: string;
  scholarNumber: string;
  status: SubmissionStatus;
  submittedAt?: string;
  returnedAt?: string;
  notificationSent: boolean;
  notificationSentAt?: string;
  submissionHistory: {
    cycleId: string;
    status: SubmissionStatus;
    submittedAt?: string;
    returnedAt?: string;
  }[];
}

export interface StudentWithSubmission {
  id: string;
  fullName: string;
  scholarNumber: string;
  rollNumber: number | string;
  classId: string;
  parentName: string;
  parentPhone?: string;
  parentEmail?: string;
  isActive: boolean;
  submissions: {
    id: string;
    status: 'submitted' | 'returned' | 'missing';
    submittedAt?: string;
    returnedAt?: string;
    notificationSent?: boolean;
    notificationSentAt?: string;
  }[];
}

interface StudentsTableProps {
  students: StudentWithSubmission[];
  onMarkSubmitted: (studentId: string) => void;
  onMarkReturned: (submissionId: string) => void;
  onSendNotification: (studentId: string) => void;
  isLoading?: boolean;
}

export function StudentsTable({
  students,
  onMarkSubmitted,
  onMarkReturned,
  onSendNotification,
  isLoading = false
}: StudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all');
  
  // Filter students based on search term and status filter
  const filteredStudents = students?.filter(student => {
    // Skip invalid student objects
    if (!student) {
      return false;
    }

    const matchesSearch = !searchTerm || (
      (student.fullName?.toLowerCase()?.includes(searchTerm.toLowerCase()) || false) ||
      (student.scholarNumber?.includes(searchTerm) || false)
    );
    
    const currentStatus = student.submissions?.[0]?.status || 'missing';
    const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or scholar #"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              <span>Status: {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('submitted')}>
              Submitted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('returned')}>
              Returned
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('missing')}>
              Missing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Scholar #</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead>Returned At</TableHead>
              <TableHead>Notification</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton rows
              Array(5).fill(0).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {Array(7).fill(0).map((_, cellIndex) => (
                    <TableCell key={`skeleton-cell-${cellIndex}`}>
                      <div className="h-5 bg-gray-200 animate-pulse rounded"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredStudents.length > 0 ? (
              // Student rows
              filteredStudents.map((student) => (
                <TableRow key={student?.id || Math.random().toString()}>
                  <TableCell className="font-medium">{student?.scholarNumber || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-500" />
                      {student?.fullName || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={student?.submissions?.[0]?.status || 'unknown'}
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 10, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {getStatusBadge((student?.submissions?.[0]?.status || 'missing') as SubmissionStatus)}
                      </motion.div>
                    </AnimatePresence>
                  </TableCell>
                  <TableCell>{formatDate(student?.submissions?.[0]?.submittedAt)}</TableCell>
                  <TableCell>{formatDate(student?.submissions?.[0]?.returnedAt)}</TableCell>
                  <TableCell>
                    {student?.submissions?.[0]?.notificationSent ? (
                      <Badge variant="outline" className="text-gray-500 flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        {formatDate(student?.submissions?.[0]?.notificationSentAt)?.split(',')[0] || 'Sent'}
                      </Badge>
                    ) : student?.submissions?.[0]?.status === 'missing' ? (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => onSendNotification(student?.id || '')}
                      >
                        <Bell className="w-3 h-3 mr-1" />
                        Send
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {student?.submissions?.[0]?.status === 'submitted' && (
                          <DropdownMenuItem onClick={() => onMarkReturned(student?.submissions?.[0]?.id || '')}>
                            <Check className="w-4 h-4 mr-2" />
                            Mark as Returned
                          </DropdownMenuItem>
                        )}
                        
                        {student?.submissions?.[0]?.status === 'missing' && !student?.submissions?.[0]?.notificationSent && (
                          <DropdownMenuItem onClick={() => onSendNotification(student?.id || '')}>
                            <Bell className="w-4 h-4 mr-2" />
                            Send Notification
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem onClick={() => onMarkSubmitted(student?.id || '')}>
                          <History className="w-4 h-4 mr-2" />
                          Mark as Submitted
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              // No results message
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                  No students found matching the search criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}