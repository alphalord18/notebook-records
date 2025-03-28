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
import { CalendarClock, ChevronRight, Layers, School, Settings, Users, Medal, BookOpen, BarChart } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

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
}

interface Subject {
  id: string;
  name: string;
}

interface Student {
  id: string;
  fullName: string;
}

export default function AdminDashboard() {
  // Fetch users, classes, subjects, students
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Count users by role
  const adminCount = users.filter(user => user.role === "admin").length;
  const classTeacherCount = users.filter(user => user.role === "class_teacher").length;
  const subjectTeacherCount = users.filter(user => user.role === "subject_teacher").length;

  // Calculate system statistics
  const totalSubmissions = 428; // Would come from API
  const returnedSubmissions = 354; // Would come from API
  const pendingSubmissions = 52; // Would come from API
  const missingSubmissions = 22; // Would come from API

  // Recent activities (would come from API)
  const recentActivities = [
    {
      type: "submission",
      message: "Class 8A has 5 new notebook submissions",
      time: "2 hours ago",
      icon: <BookOpen className="h-4 w-4 text-green-600" />,
    },
    {
      type: "notification",
      message: "Notifications sent to 7 parents for missing submissions",
      time: "3 hours ago",
      icon: <Medal className="h-4 w-4 text-amber-600" />,
    },
    {
      type: "cycle",
      message: "New submission cycle started for Class 10A - Mathematics",
      time: "5 hours ago",
      icon: <CalendarClock className="h-4 w-4 text-blue-600" />,
    },
    {
      type: "user",
      message: "New teacher account created for Mrs. Johnson",
      time: "1 day ago",
      icon: <Users className="h-4 w-4 text-purple-600" />,
    },
  ];

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Administrator Dashboard</h1>
            <p className="text-gray-500">Manage and monitor the entire school notebook system</p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Link href="/admin/user-management">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div className="flex flex-col">
                <span className="font-medium">User Management</span>
                <span className="text-xs text-gray-500">Manage users and permissions</span>
              </div>
            </Button>
          </Link>
          
          <Link href="/admin/class-management">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col items-center gap-3">
              <School className="h-8 w-8 text-primary" />
              <div className="flex flex-col">
                <span className="font-medium">Class Management</span>
                <span className="text-xs text-gray-500">Manage classes and assignments</span>
              </div>
            </Button>
          </Link>
          
          <Link href="/analytics">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col items-center gap-3">
              <BarChart className="h-8 w-8 text-primary" />
              <div className="flex flex-col">
                <span className="font-medium">Analytics</span>
                <span className="text-xs text-gray-500">View submission statistics</span>
              </div>
            </Button>
          </Link>
          
          <Link href="/admin/settings">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              <div className="flex flex-col">
                <span className="font-medium">System Settings</span>
                <span className="text-xs text-gray-500">Configure system parameters</span>
              </div>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            {/* System overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="mr-2 h-5 w-5 text-primary" />
                  System Overview
                </CardTitle>
                <CardDescription>
                  Current school notebook submission system statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3 flex flex-col">
                    <span className="text-sm font-medium text-blue-600">Classes</span>
                    <span className="text-2xl font-bold">{classes.length}</span>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 flex flex-col">
                    <span className="text-sm font-medium text-green-600">Subjects</span>
                    <span className="text-2xl font-bold">{subjects.length}</span>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 flex flex-col">
                    <span className="text-sm font-medium text-amber-600">Teachers</span>
                    <span className="text-2xl font-bold">{classTeacherCount + subjectTeacherCount}</span>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 flex flex-col">
                    <span className="text-sm font-medium text-purple-600">Students</span>
                    <span className="text-2xl font-bold">{students.length}</span>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-medium mb-2">Submission Status</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Returned</span>
                      <span className="font-medium">{Math.round((returnedSubmissions / totalSubmissions) * 100)}%</span>
                    </div>
                    <Progress value={(returnedSubmissions / totalSubmissions) * 100} className="bg-gray-100 h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pending Return</span>
                      <span className="font-medium">{Math.round((pendingSubmissions / totalSubmissions) * 100)}%</span>
                    </div>
                    <Progress value={(pendingSubmissions / totalSubmissions) * 100} className="bg-gray-100 h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Missing</span>
                      <span className="font-medium">{Math.round((missingSubmissions / totalSubmissions) * 100)}%</span>
                    </div>
                    <Progress value={(missingSubmissions / totalSubmissions) * 100} className="bg-gray-100 h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CalendarClock className="mr-2 h-5 w-5 text-primary" />
                  Recent Activities
                </CardTitle>
                <CardDescription>
                  Latest actions and events in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                      <div className="bg-gray-100 p-2 rounded-full">
                        {activity.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full text-sm gap-1">
                  View all activity
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* User Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  User Statistics
                </CardTitle>
                <CardDescription>
                  Overview of system users by role
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 bg-blue-100">
                        <AvatarFallback className="text-blue-700">A</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Administrators</p>
                        <p className="text-xs text-gray-500">System administration</p>
                      </div>
                    </div>
                    <span className="font-medium">{adminCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 bg-green-100">
                        <AvatarFallback className="text-green-700">C</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Class Teachers</p>
                        <p className="text-xs text-gray-500">Class management</p>
                      </div>
                    </div>
                    <span className="font-medium">{classTeacherCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 bg-amber-100">
                        <AvatarFallback className="text-amber-700">S</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Subject Teachers</p>
                        <p className="text-xs text-gray-500">Subject instruction</p>
                      </div>
                    </div>
                    <span className="font-medium">{subjectTeacherCount}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href="/admin/user-management">
                  <Button variant="outline" className="w-full text-sm gap-1">
                    Manage Users
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Frequently used administrative actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="secondary" className="w-full justify-start text-sm">
                  <Users className="mr-2 h-4 w-4" />
                  Add New Teacher
                </Button>
                <Button variant="secondary" className="w-full justify-start text-sm">
                  <School className="mr-2 h-4 w-4" />
                  Create New Class
                </Button>
                <Button variant="secondary" className="w-full justify-start text-sm">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Add New Subject
                </Button>
                <Button variant="secondary" className="w-full justify-start text-sm">
                  <Medal className="mr-2 h-4 w-4" />
                  Send Notifications
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}