import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { StudentAvatar } from "@/components/ui/student-avatar";
import { Button } from "@/components/ui/button";
import { Student, Submission } from "@shared/schema";
import { Check, CheckCheck, Send, MoreVertical, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export type StudentWithSubmission = Student & {
  submissions: Submission[];
  latestSubmission?: Submission;
};

interface StudentsTableProps {
  students: StudentWithSubmission[];
  onMarkSubmitted: (studentId: number) => void;
  onMarkReturned: (submissionId: number) => void;
  onSendNotification: (studentId: number) => void;
  isLoading?: boolean;
}

export function StudentsTable({
  students,
  onMarkSubmitted,
  onMarkReturned,
  onSendNotification,
  isLoading = false
}: StudentsTableProps) {
  const { toast } = useToast();

  const formatSubmissionTime = (submission?: Submission) => {
    if (!submission || !submission.submittedAt) {
      return "-";
    }
    
    return format(new Date(submission.submittedAt), "h:mm a");
  };

  const columns = [
    {
      key: "student",
      header: "Student",
      cell: (student: StudentWithSubmission) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <StudentAvatar initials={student.avatarInitials} />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{student.fullName}</div>
            <div className="text-sm text-gray-500">Parent: {student.parentName}</div>
          </div>
        </div>
      ),
    },
    {
      key: "rollNumber",
      header: "Roll No.",
      cell: (student: StudentWithSubmission) => (
        <div className="text-sm text-gray-900">{student.rollNumber}</div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (student: StudentWithSubmission) => {
        const submission = student.latestSubmission || student.submissions[0];
        return submission ? <StatusBadge status={submission.status as any} /> : null;
      },
    },
    {
      key: "submittedAt",
      header: "Submitted At",
      cell: (student: StudentWithSubmission) => (
        <div className="text-sm text-gray-500">
          {formatSubmissionTime(student.latestSubmission || student.submissions[0])}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (student: StudentWithSubmission) => {
        const submission = student.latestSubmission || student.submissions[0];
        
        if (!submission) return null;
        
        const isMissing = submission.status === "missing";
        const isSubmitted = submission.status === "submitted";
        const isReturned = submission.status === "returned";
        
        return (
          <div className="flex items-center space-x-3">
            {isMissing && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary-600 hover:text-primary-900 font-medium"
                  onClick={() => onMarkSubmitted(student.id)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Mark Submitted
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                  onClick={() => onSendNotification(student.id)}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {isSubmitted && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary-600 hover:text-primary-900 font-medium"
                onClick={() => onMarkReturned(submission.id)}
              >
                <Check className="h-4 w-4 mr-1" /> Mark Returned
              </Button>
            )}
            
            {isReturned && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500 hover:text-gray-700 font-medium"
                disabled
              >
                <CheckCheck className="h-4 w-4 mr-1" /> Returned
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 h-8 w-8 p-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  toast({
                    title: "View Details",
                    description: `Viewing details for ${student.fullName}`
                  });
                }}>
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  toast({
                    title: "View History",
                    description: `Viewing submission history for ${student.fullName}`
                  });
                }}>
                  View History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isMissing && (
                  <DropdownMenuItem onClick={() => onSendNotification(student.id)}>
                    Send SMS to Parent
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <DataTable 
        data={students} 
        columns={columns} 
        searchable={false} 
      />
    </div>
  );
}
