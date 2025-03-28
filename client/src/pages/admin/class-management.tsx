import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AppShell } from "@/components/layout/app-shell";
import { Pen, Trash2, School, Loader2, GraduationCap, CalendarRange, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Define the form schema
const classFormSchema = z.object({
  name: z.string().min(2, {
    message: "Class name must be at least 2 characters.",
  }),
  teacherId: z.string().optional(),
  sessionId: z.string({
    required_error: "Academic session is required.",
  }),
});

// Types based on the schema
type ClassFormValues = z.infer<typeof classFormSchema>;

// Define the schema for class data
interface Class {
  id: string;
  name: string;
  teacherId: string;
  sessionId: string;
}

// Define the schema for user data
interface User {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "class_teacher" | "subject_teacher";
  assignedClassId?: string;
}

// Define the schema for session data
interface AcademicSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// Define the schema for subject data
interface Subject {
  id: string;
  name: string;
  teacherId: string;
  classId: string;
  notebookColor: string;
  submissionFrequency: string;
}

// Define the schema for student data
interface Student {
  id: string;
  fullName: string;
  scholarNumber: string;
  rollNumber: number;
  classId: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  isActive: boolean;
}

export default function ClassManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  // Fetch classes
  const {
    data: classes = [],
    isLoading: isLoadingClasses,
    isError: isErrorClasses,
  } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  // Fetch teachers
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    isError: isErrorUsers,
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch academic sessions
  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    isError: isErrorSessions,
  } = useQuery<AcademicSession[]>({
    queryKey: ["/api/sessions"],
  });

  // Get only class teachers
  const classTeachers = users.filter(user => user.role === "class_teacher");

  // Get active session
  const activeSession = sessions.find(session => session.isActive);

  // Create class form
  const createForm = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      teacherId: "unassigned", // Default to unassigned
      sessionId: activeSession?.id || "",
    },
  });

  // Edit class form
  const editForm = useForm<ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      teacherId: "unassigned", // Default to unassigned
      sessionId: "",
    },
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormValues) => {
      // Convert "unassigned" to empty string for API
      const apiData = {
        ...data,
        teacherId: data.teacherId === "unassigned" ? "" : data.teacherId
      };
      const response = await apiRequest("POST", "/api/classes", apiData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Class created",
        description: "The class has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      createForm.reset({
        name: "",
        teacherId: "unassigned",
        sessionId: activeSession?.id || "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create class: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Edit class mutation
  const editClassMutation = useMutation({
    mutationFn: async (data: ClassFormValues & { id: string }) => {
      const { id, ...classData } = data;
      // Convert "unassigned" to empty string for API
      const apiData = {
        ...classData,
        teacherId: classData.teacherId === "unassigned" ? "" : classData.teacherId
      };
      const response = await apiRequest("PUT", `/api/classes/${id}`, apiData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Class updated",
        description: "The class has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      editForm.reset({
        name: "",
        teacherId: "unassigned",
        sessionId: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update class: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (classId: string) => {
      await apiRequest("DELETE", `/api/classes/${classId}`);
    },
    onSuccess: () => {
      toast({
        title: "Class deleted",
        description: "The class has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete class: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Handle create form submission
  const onCreateSubmit = (data: ClassFormValues) => {
    createClassMutation.mutate(data);
  };

  // Handle edit form submission
  const onEditSubmit = (data: ClassFormValues) => {
    if (selectedClass) {
      editClassMutation.mutate({
        ...data,
        id: selectedClass.id,
      });
    }
  };

  // Open edit dialog with class data
  const handleEditClass = (classItem: Class) => {
    setSelectedClass(classItem);
    editForm.reset({
      name: classItem.name,
      teacherId: classItem.teacherId || "unassigned",
      sessionId: classItem.sessionId,
    });
    setIsEditDialogOpen(true);
  };

  // Handle class deletion
  const handleDeleteClass = (classId: string) => {
    deleteClassMutation.mutate(classId);
  };

  // Get teacher name by ID
  const getTeacherName = (teacherId: string) => {
    const teacher = users.find(user => user.id === teacherId);
    return teacher ? teacher.fullName : "Unassigned";
  };

  // Get session name by ID
  const getSessionName = (sessionId: string) => {
    const session = sessions.find(session => session.id === sessionId);
    return session ? session.name : "Unknown Session";
  };

  // Fetch all subjects
  const {
    data: allSubjects = [],
    isLoading: isLoadingAllSubjects,
  } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Fetch all students
  const {
    data: allStudents = [],
    isLoading: isLoadingAllStudents,
  } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Class Management</h1>
            <p className="text-gray-500">Manage classes, assign teachers, and organize academic sessions</p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <School className="h-4 w-4" />
            Add Class
          </Button>
        </div>

        {/* Class list */}
        {isLoadingClasses || isLoadingUsers || isLoadingSessions || isLoadingAllSubjects || isLoadingAllStudents ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isErrorClasses || isErrorUsers || isErrorSessions ? (
          <div className="text-center p-8 text-red-500">
            Failed to load data. Please try again.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classItem) => {
              // Filter subjects and students for this class from the already fetched data
              const subjects = allSubjects.filter(subject => subject.classId === classItem.id);
              const students = allStudents.filter(student => student.classId === classItem.id);

              return (
                <Card key={classItem.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{classItem.name}</CardTitle>
                        <CardDescription>
                          {getSessionName(classItem.sessionId)}
                        </CardDescription>
                      </div>
                      {classItem.sessionId === activeSession?.id && (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                          Active
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium flex items-center">
                          <Users className="h-4 w-4 mr-2 text-gray-400" />
                          Class Teacher:
                        </span>
                        <span className="text-sm">
                          {getTeacherName(classItem.teacherId)}
                        </span>
                      </div>
                      
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="subjects">
                          <AccordionTrigger className="text-sm font-medium py-1">
                            <span className="flex items-center">
                              <GraduationCap className="h-4 w-4 mr-2 text-gray-400" />
                              Subjects ({isLoadingAllSubjects ? "..." : subjects.length})
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            {isLoadingAllSubjects ? (
                              <div className="flex justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              </div>
                            ) : subjects.length === 0 ? (
                              <p className="text-sm text-gray-500 py-1">No subjects assigned yet</p>
                            ) : (
                              <ul className="text-sm space-y-1">
                                {subjects.map(subject => (
                                  <li key={subject.id} className="flex items-center">
                                    <div 
                                      className="w-2 h-2 rounded-full mr-2" 
                                      style={{ backgroundColor: subject.notebookColor || '#cbd5e1' }}
                                    ></div>
                                    {subject.name}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="students">
                          <AccordionTrigger className="text-sm font-medium py-1">
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-2 text-gray-400" />
                              Students ({isLoadingAllStudents ? "..." : students.length})
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            {isLoadingAllStudents ? (
                              <div className="flex justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                              </div>
                            ) : students.length === 0 ? (
                              <p className="text-sm text-gray-500 py-1">No students in this class</p>
                            ) : (
                              <div className="text-sm text-gray-500">
                                {students.length} students enrolled
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditClass(classItem)}
                    >
                      <Pen className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the class "{classItem.name}" and remove all associated data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteClass(classItem.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              );
            })}

            {classes.length === 0 && (
              <div className="col-span-full text-center p-12 border rounded-lg">
                <School className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500">No classes found</h3>
                <p className="text-gray-400 mb-4">Start by adding a new class</p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-2"
                >
                  <School className="h-4 w-4 mr-2" />
                  Add Class
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Create class dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Class</DialogTitle>
              <DialogDescription>
                Create a new class and assign a teacher.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Class 9A" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the full name of the class.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="teacherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Teacher</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a teacher" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">None (Unassigned)</SelectItem>
                          {classTeachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Assign a class teacher or leave unassigned.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Session</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic session" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.name} {session.isActive && "(Active)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the academic session for this class.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createClassMutation.isPending}
                  >
                    {createClassMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Class
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit class dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Class</DialogTitle>
              <DialogDescription>
                Update class information and teacher assignment.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Class 9A" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the full name of the class.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="teacherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Teacher</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a teacher" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">None (Unassigned)</SelectItem>
                          {classTeachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Assign a class teacher or leave unassigned.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="sessionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Session</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic session" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sessions.map((session) => (
                            <SelectItem key={session.id} value={session.id}>
                              {session.name} {session.isActive && "(Active)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the academic session for this class.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editClassMutation.isPending}
                  >
                    {editClassMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Class
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}