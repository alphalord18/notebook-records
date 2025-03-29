import React, { useState, useEffect } from "react";
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
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AppShell } from "@/components/layout/app-shell";
import { Pen, Trash2, UserPlus, Loader2, GraduationCap, School, Mail, Phone, Scroll } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { StudentAvatar } from "@/components/ui/student-avatar";

// Define student form schema
const studentFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  scholarNumber: z.string().min(5, {
    message: "Scholar number must be at least 5 characters.",
  }),
  rollNumber: z.coerce.number().min(1, {
    message: "Roll number must be at least 1.",
  }),
  classId: z.string({
    required_error: "Class is required.",
  }),
  parentName: z.string().min(2, {
    message: "Parent name must be at least 2 characters.",
  }),
  parentPhone: z.string().min(10, {
    message: "Parent phone must be at least 10 characters.",
  }),
  parentEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  isActive: z.boolean().default(true),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

// Define student interface
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

// Define class interface
interface Class {
  id: string;
  name: string;
  teacherId: string;
  sessionId: string;
}

export default function StudentManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch classes
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  // Fetch students
  const { data: allStudents = [], isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  // Filter students by class and search query
  const filteredStudents = allStudents.filter(student => {
    const matchesClass = !selectedClassId || student.classId === selectedClassId;
    const matchesSearch = !searchQuery || 
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.scholarNumber.includes(searchQuery) ||
      student.rollNumber.toString().includes(searchQuery);
    
    return matchesClass && matchesSearch;
  });

  // Create student form
  const createForm = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      fullName: "",
      scholarNumber: "",
      rollNumber: 1,
      classId: "",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      isActive: true,
    },
  });

  // Edit student form
  const editForm = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      fullName: "",
      scholarNumber: "",
      rollNumber: 1,
      classId: "",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      isActive: true,
    },
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (data: StudentFormValues) => {
      const response = await apiRequest("POST", "/api/students", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Student created",
        description: "The student has been added successfully.",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create student: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Edit student mutation
  const editStudentMutation = useMutation({
    mutationFn: async (data: StudentFormValues & { id: string }) => {
      const { id, ...studentData } = data;
      const response = await apiRequest("PUT", `/api/students/${id}`, studentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Student updated",
        description: "The student information has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update student: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      await apiRequest("DELETE", `/api/students/${studentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Student deleted",
        description: "The student has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete student: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Handle create form submission
  const onCreateSubmit = (data: StudentFormValues) => {
    createStudentMutation.mutate(data);
  };

  // Handle edit form submission
  const onEditSubmit = (data: StudentFormValues) => {
    if (selectedStudent) {
      editStudentMutation.mutate({
        ...data,
        id: selectedStudent.id,
      });
    }
  };

  // Open edit dialog with student data
  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    editForm.reset({
      fullName: student.fullName,
      scholarNumber: student.scholarNumber,
      rollNumber: student.rollNumber,
      classId: student.classId,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      isActive: student.isActive,
    });
    setIsEditDialogOpen(true);
  };

  // Handle student deletion
  const handleDeleteStudent = (studentId: string) => {
    deleteStudentMutation.mutate(studentId);
  };

  // Get class name by ID
  const getClassName = (classId: string) => {
    const classItem = classes.find((c) => c.id === classId);
    return classItem ? classItem.name : "Unknown Class";
  };

  // Handle class filter change
  const handleClassFilterChange = (classId: string) => {
    setSelectedClassId(classId === "all" ? null : classId);
  };

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Student Management</h1>
            <p className="text-gray-500">Add, edit, and manage student information</p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Student
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Class
            </label>
            <Select
              value={selectedClassId || "all"}
              onValueChange={handleClassFilterChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-2/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Students
            </label>
            <Input
              type="text"
              placeholder="Search by name, scholar number, or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Students Table */}
        {isLoadingStudents || isLoadingClasses ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center p-12 border rounded-lg">
            <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No students found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? "No students match your search criteria. Try a different search term." 
                : selectedClassId 
                  ? "There are no students in this class. Add a student to get started." 
                  : "There are no students in the system. Add a student to get started."}
            </p>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              variant="outline"
              className="mt-2"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Students List</CardTitle>
              <CardDescription>
                Showing {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
                {selectedClassId ? ` in ${getClassName(selectedClassId)}` : ''}
                {searchQuery ? ` matching "${searchQuery}"` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Scholar No.</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-xs">
                        {student.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <StudentAvatar 
                            initials={student.fullName.charAt(0)} 
                            size="sm"
                          />
                          {student.fullName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {student.scholarNumber}
                        </Badge>
                      </TableCell>
                      <TableCell>{student.rollNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <School className="h-3 w-3 text-gray-400" />
                          {getClassName(student.classId)}
                        </div>
                      </TableCell>
                      <TableCell>{student.parentName}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-xs flex items-center">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {student.parentPhone}
                          </div>
                          <div className="text-xs flex items-center">
                            <Mail className="h-3 w-3 mr-1 text-gray-400" />
                            {student.parentEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {student.isActive ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditStudent(student)}
                          >
                            <Pen className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {student.fullName}'s records. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Create Student Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>
                Add a new student to the system. Complete all fields for accurate record-keeping.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="classId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="scholarNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scholar Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. SCH12345" {...field} />
                        </FormControl>
                        <FormDescription>
                          Unique 5-digit scholar/admission number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="rollNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Roll Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g. 42" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Class roll number for the student
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="parentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent/Guardian Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="parentPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+1 (123) 456-7890" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          For SMS notifications about notebook submissions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="parentEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="parent@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active Student</FormLabel>
                        <FormDescription>
                          Deselect this option for alumni or transferred students
                        </FormDescription>
                      </div>
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
                    disabled={createStudentMutation.isPending}
                  >
                    {createStudentMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Student
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Student Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>
                Update student information and class assignment.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="classId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Changing class will create a history record
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="scholarNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scholar Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. SCH12345" 
                            {...field} 
                            readOnly={selectedStudent !== null} // Make scholar number read-only when editing
                            className={selectedStudent ? "bg-gray-100" : ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Scholar number cannot be changed after creation
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="rollNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Roll Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g. 42" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="parentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent/Guardian Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="parentPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+1 (123) 456-7890" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="parentEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="parent@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active Student</FormLabel>
                        <FormDescription>
                          Deselect this option for alumni or transferred students
                        </FormDescription>
                      </div>
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
                    disabled={editStudentMutation.isPending}
                  >
                    {editStudentMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Student
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