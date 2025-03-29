import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { 
  CalendarClock, ChevronRight, Layers, School, Settings, Users, Medal, 
  BookOpen, BarChart, Bell, UserCheck, GraduationCap, Notebook, 
  AlertTriangle, CheckCircle, Loader2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart as RechartsBarChart,
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";

// Define types
interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface Class {
  id: string;
  name: string;
  teacherId: string;
}

interface Subject {
  id: string;
  name: string;
  teacherId: string;
  classId: string;
}

interface Student {
  id: string;
  fullName: string;
  classId: string;
}

interface Submission {
  id: string;
  status: string;
  submittedAt: string;
  studentId: string;
  subjectId: string;
}

interface AcademicSession {
  id: string;
  name: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export default function AdminDashboard() {
  // Fetch users, classes, subjects, students
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: classes = [], isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
  });

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<AcademicSession[]>({
    queryKey: ["/api/sessions"],
  });

  // Calculate stats
  const adminCount = users.filter(user => user.role === "admin").length;
  const classTeacherCount = users.filter(user => user.role === "class_teacher").length;
  const subjectTeacherCount = users.filter(user => user.role === "subject_teacher").length;
  
  // Get current active session
  const activeSession = sessions.find(session => session.isActive);

  // Calculate submission stats
  const submittedCount = submissions.filter(sub => sub.status === "submitted").length;
  const returnedCount = submissions.filter(sub => sub.status === "returned").length;
  const missingCount = submissions.filter(sub => sub.status === "missing").length;
  const totalSubmissions = submissions.length;

  // Submission distribution data for pie chart
  const submissionData = [
    { name: "Submitted", value: submittedCount, color: "#10b981" },
    { name: "Returned", value: returnedCount, color: "#3b82f6" },
    { name: "Missing", value: missingCount, color: "#ef4444" },
  ];

  // Class submission breakdown data for bar chart
  const getClassSubmissionStats = () => {
    const stats: Record<string, {name: string, submitted: number, missing: number}> = {};
    
    classes.forEach(cls => {
      stats[cls.id] = {name: cls.name, submitted: 0, missing: 0};
    });
    
    submissions.forEach(sub => {
      const subject = subjects.find(s => s.id === sub.subjectId);
      if (subject) {
        const classId = subject.classId;
        if (stats[classId]) {
          if (sub.status === "submitted" || sub.status === "returned") {
            stats[classId].submitted += 1;
          } else if (sub.status === "missing") {
            stats[classId].missing += 1;
          }
        }
      }
    });
    
    return Object.values(stats);
  };
  
  const classSubmissionData = getClassSubmissionStats();
  
  // Calculate teacher assignment stats
  const teacherAssignmentStats = () => {
    const assignedTeachers = new Set();
    const assignedSubjectTeachers = new Set();
    
    classes.forEach(cls => {
      if (cls.teacherId) {
        assignedTeachers.add(cls.teacherId);
      }
    });
    
    subjects.forEach(subject => {
      if (subject.teacherId) {
        assignedSubjectTeachers.add(subject.teacherId);
      }
    });
    
    return {
      assignedClassTeachers: assignedTeachers.size,
      unassignedClassTeachers: classTeacherCount - assignedTeachers.size,
      assignedSubjectTeachers: assignedSubjectTeachers.size,
      unassignedSubjectTeachers: subjectTeacherCount - assignedSubjectTeachers.size
    };
  };
  
  const teacherStats = teacherAssignmentStats();
  
  // Check if data is still loading
  const isLoading = isLoadingUsers || isLoadingClasses || isLoadingSubjects || 
                   isLoadingSubmissions || isLoadingSessions;

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500">
            Welcome to the administration dashboard. Monitor school statistics and manage system settings.
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Current Session</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {activeSession ? activeSession.name : "None"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activeSession ? `${new Date(activeSession.startDate).toLocaleDateString()} - ${new Date(activeSession.endDate).toLocaleDateString()}` : "No active session"}
                      </p>
                    </div>
                    <CalendarClock className="h-8 w-8 text-primary opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Classes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">{classes.length}</p>
                      <p className="text-sm text-gray-500">Across all sessions</p>
                    </div>
                    <School className="h-8 w-8 text-orange-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">{subjects.length}</p>
                      <p className="text-sm text-gray-500">Across all classes</p>
                    </div>
                    <BookOpen className="h-8 w-8 text-blue-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Teacher Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">{classTeacherCount + subjectTeacherCount}</p>
                      <p className="text-sm text-gray-500">Class & Subject Teachers</p>
                    </div>
                    <Users className="h-8 w-8 text-green-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Teacher Assignment Stats */}
            <h2 className="text-xl font-semibold mb-4">Teacher Assignment Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                    Class Teacher Assignments
                  </CardTitle>
                  <CardDescription>
                    Status of class teacher assignments to classes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Assigned</span>
                      <span className="text-sm font-medium">{teacherStats.assignedClassTeachers} / {classTeacherCount}</span>
                    </div>
                    <Progress 
                      value={classTeacherCount > 0 ? (teacherStats.assignedClassTeachers / classTeacherCount) * 100 : 0} 
                      className="h-2"
                    />
                    
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <span className="text-sm">Assigned Class Teachers: {teacherStats.assignedClassTeachers}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                        <span className="text-sm">Unassigned Class Teachers: {teacherStats.unassignedClassTeachers}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/user-management">
                      Manage Teachers
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <GraduationCap className="h-5 w-5 mr-2 text-purple-500" />
                    Subject Teacher Assignments
                  </CardTitle>
                  <CardDescription>
                    Status of subject teacher assignments to subjects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Assigned</span>
                      <span className="text-sm font-medium">{teacherStats.assignedSubjectTeachers} / {subjectTeacherCount}</span>
                    </div>
                    <Progress 
                      value={subjectTeacherCount > 0 ? (teacherStats.assignedSubjectTeachers / subjectTeacherCount) * 100 : 0} 
                      className="h-2"
                    />
                    
                    <div className="mt-6 space-y-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                        <span className="text-sm">Assigned Subject Teachers: {teacherStats.assignedSubjectTeachers}</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                        <span className="text-sm">Unassigned Subject Teachers: {teacherStats.unassignedSubjectTeachers}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/user-management">
                      Manage Teachers
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Submission Stats */}
            <h2 className="text-xl font-semibold mb-4">Notebook Submission Overview</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Notebook className="h-5 w-5 mr-2 text-blue-500" />
                    Submission Status Distribution
                  </CardTitle>
                  <CardDescription>
                    Overall distribution of notebook submission statuses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={submissionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => 
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {submissionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} notebooks`, ""]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart className="h-5 w-5 mr-2 text-orange-500" />
                    Class-wise Submission Breakdown
                  </CardTitle>
                  <CardDescription>
                    Notebook submissions status by class
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={classSubmissionData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="submitted" fill="#10b981" name="Submitted" />
                        <Bar dataKey="missing" fill="#ef4444" name="Missing" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Access */}
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Manage Classes</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-gray-500">
                    Create, edit and delete classes, assign class teachers.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/admin/class-management">
                      Go to Class Management
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Manage Users</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-gray-500">
                    Create and manage administrators, class teachers, and subject teachers.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/admin/user-management">
                      Go to User Management
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">View Analytics</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-gray-500">
                    View detailed submission analytics and identify defaulters.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/analytics">
                      Go to Analytics
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">Manage Students</CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-gray-500">
                    Add, edit and track student information and class assignments.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/admin/student-management">
                      Go to Student Management
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}