import { AppShell } from "@/components/layout/app-shell";
import { StatusOverview } from "@/components/dashboard/status-overview";
import { StudentFilters } from "@/components/dashboard/student-filters";
import { StudentsTable, StudentWithSubmission } from "@/components/dashboard/students-table";
import { SmsNotificationModal } from "@/components/dashboard/sms-notification-modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Class, Student, Subject } from "@shared/schema";
import { CheckCheck, Send, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, addDays } from "date-fns";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Fetch classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    enabled: !!user,
  });

  // Set first class as default when classes are loaded
  useEffect(() => {
    if (classes && classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0]?.id);
    }
  }, [classes, selectedClassId]);

  // Fetch subjects for selected class
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/classes", selectedClassId, "subjects"],
    enabled: !!selectedClassId,
  });

  // Set first subject as default when subjects are loaded
  useEffect(() => {
    if (subjects && subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0]?.id);
    }
  }, [subjects, selectedSubjectId]);

  // Fetch students with submissions
  const {
    data: studentsWithSubmissions = [],
    isLoading: isLoadingStudents,
    refetch: refetchStudents,
  } = useQuery<StudentWithSubmission[]>({
    queryKey: [
      "/api/classes",
      selectedClassId,
      "subjects",
      selectedSubjectId,
      "students",
      {
        date: selectedDate.toISOString(),
      },
    ],
    enabled: !!selectedClassId && !!selectedSubjectId,
  });

  // Apply filters to students list
  const filteredStudents = studentsWithSubmissions.filter((student) => {
    // Apply search filter
    const matchesSearch =
      !searchQuery ||
      student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student?.parentName?.toLowerCase().includes(searchQuery.toLowerCase());

    // Apply status filter
    const submission = student?.submissions?.[0];
    const matchesStatus =
      statusFilter === "all" ||
      (submission && submission.status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalStudents = studentsWithSubmissions?.length || 0;
  const submittedCount = studentsWithSubmissions?.filter(
    (s) => s?.submissions?.[0]?.status === "submitted" || s?.submissions?.[0]?.status === "returned"
  )?.length || 0;
  const missingCount = studentsWithSubmissions?.filter(
    (s) => s?.submissions?.[0]?.status === "missing"
  )?.length || 0;
  const pendingReturnCount = studentsWithSubmissions?.filter(
    (s) => s?.submissions?.[0]?.status === "submitted"
  )?.length || 0;

  // Mark submission as submitted
  const markSubmittedMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (!selectedSubjectId) throw new Error("No subject selected");
      
      return await apiRequest("POST", "/api/submissions", {
        studentId,
        subjectId: selectedSubjectId,
        date: selectedDate,
        status: "submitted",
        submittedAt: new Date(),
      });
    },
    onSuccess: () => {
      toast({
        title: "Submission marked",
        description: "The notebook has been marked as submitted",
      });
      refetchStudents();
    },
    onError: (error) => {
      toast({
        title: "Failed to mark submission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark submission as returned
  const markReturnedMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      return await apiRequest(
        "POST",
        `/api/submissions/${submissionId}/mark-returned`,
        {}
      );
    },
    onSuccess: () => {
      toast({
        title: "Submission updated",
        description: "The notebook has been marked as returned",
      });
      refetchStudents();
    },
    onError: (error) => {
      toast({
        title: "Failed to update submission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark all as returned
  const markAllReturnedMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassId || !selectedSubjectId)
        throw new Error("No class or subject selected");

      return await apiRequest(
        "POST",
        `/api/classes/${selectedClassId}/subjects/${selectedSubjectId}/mark-all-returned`,
        {
          date: selectedDate.toISOString(),
        }
      );
    },
    onSuccess: (response) => {
      toast({
        title: "All notebooks marked as returned",
        description: "All submitted notebooks have been marked as returned",
      });
      refetchStudents();
    },
    onError: (error) => {
      toast({
        title: "Failed to mark all as returned",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send SMS notifications
  const sendNotificationsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassId || !selectedSubjectId)
        throw new Error("No class or subject selected");

      return await apiRequest(
        "POST",
        `/api/classes/${selectedClassId}/subjects/${selectedSubjectId}/send-notifications`,
        {}
      );
    },
    onSuccess: (response) => {
      toast({
        title: "Notifications sent",
        description: "SMS notifications have been sent to parents",
      });
      setSmsModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to send notifications",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get current subject name
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const currentClass = classes.find((c) => c.id === selectedClassId);

  // Get preview data for SMS
  const missingStudents = studentsWithSubmissions?.filter(
    (s) => s?.submissions?.[0]?.status === "missing"
  ) || [];
  const previewData = missingStudents?.length > 0
    ? {
        parentName: missingStudents[0]?.parentName || "Parent",
        studentName: missingStudents[0]?.fullName || "Student",
        subject: currentSubject?.name || "Science",
        nextDate: format(addDays(new Date(), 1), "MMMM d"),
      }
    : undefined;

  return (
    <AppShell>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        {/* Dashboard Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:leading-9 sm:truncate mb-1">
                {currentSubject?.name || "Science"} Notebook Submissions
              </h1>
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <CalendarDays className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  Today: {format(selectedDate, "MMMM d, yyyy")}
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <svg
                    className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                  {currentClass?.name || "Class 7B"} - {totalStudents} Students
                </div>
              </div>
            </div>

            <div className="flex mt-4 md:mt-0 space-x-3">
              <Button
                onClick={() => markAllReturnedMutation.mutate()}
                disabled={markAllReturnedMutation.isPending || pendingReturnCount === 0}
                className="bg-green-500 hover:bg-green-600"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark All Returned
              </Button>
              <Button
                onClick={() => setSmsModalOpen(true)}
                disabled={sendNotificationsMutation.isPending || missingCount === 0}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Reminders
              </Button>
            </div>
          </div>
        </div>

        {/* Status Overview */}
        <StatusOverview
          totalStudents={totalStudents}
          submitted={submittedCount}
          missing={missingCount}
          pendingReturn={pendingReturnCount}
          weeklyComplianceRate={82} // This would come from analytics in a real app
          complianceChange={5} // This would come from analytics in a real app
        />

        {/* Student Filters */}
        <StudentFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          totalCount={totalStudents}
          submittedCount={submittedCount}
          missingCount={missingCount}
        />

        {/* Students Table */}
        <StudentsTable
          students={filteredStudents}
          onMarkSubmitted={(studentId) => markSubmittedMutation.mutate(studentId)}
          onMarkReturned={(submissionId) => markReturnedMutation.mutate(submissionId)}
          onSendNotification={(studentId) => setSmsModalOpen(true)}
          isLoading={isLoadingStudents}
        />

        {/* SMS Notification Modal */}
        <SmsNotificationModal
          isOpen={smsModalOpen}
          onClose={() => setSmsModalOpen(false)}
          onSend={(template) => sendNotificationsMutation.mutate()}
          recipientCount={missingCount}
          previewData={previewData}
          isSending={sendNotificationsMutation.isPending}
        />
      </div>
    </AppShell>
  );
}
