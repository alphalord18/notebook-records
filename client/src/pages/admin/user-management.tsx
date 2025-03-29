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
import { Pen, Trash2, Users, Loader2, LucideShieldCheck, GraduationCap, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StudentAvatar } from "@/components/ui/student-avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Define form schema
const userFormSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phoneNumber: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  role: z.enum(["admin", "class_teacher", "subject_teacher"], {
    required_error: "Please select a role.",
  }),
  assignedClassId: z.string().optional(),
  subjectId: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

// Define user interface
interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: "admin" | "class_teacher" | "subject_teacher";
  assignedClassId?: string;
  subjectId?: string;
  password?: string;
}

// Define class interface
interface Class {
  id: string;
  name: string;
  teacherId: string;
  sessionId: string;
}

// Define subject interface
interface Subject {
  id: string;
  name: string;
  teacherId: string;
  classId: string;
  notebookColor: string;
  submissionFrequency: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Fetch users
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch classes
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  // Fetch subjects
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  // Create user form
  const createForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      phoneNumber: "",
      role: "subject_teacher",
      assignedClassId: "unassigned",
      subjectId: "unassigned",
    },
    mode: "onChange",
  });

  // Watch the role field to conditionally render other fields
  const createFormRole = createForm.watch("role");

  // Edit user form
  const editForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      phoneNumber: "",
      role: "subject_teacher",
      assignedClassId: "unassigned",
      subjectId: "unassigned",
    },
    mode: "onChange",
  });
  
  // Watch the role field for edit form
  const editFormRole = editForm.watch("role");

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      // Process data before sending to API
      const processedData = { ...data };
      
      // Convert "unassigned" to empty string for API
      if (processedData.assignedClassId === "unassigned") {
        processedData.assignedClassId = "";
      }
      if (processedData.subjectId === "unassigned") {
        processedData.subjectId = "";
      }
      
      const response = await apiRequest("POST", "/api/users", processedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      createForm.reset({
        username: "",
        password: "",
        fullName: "",
        email: "",
        phoneNumber: "",
        role: "subject_teacher",
        assignedClassId: "unassigned",
        subjectId: "unassigned",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async (data: UserFormValues & { id: string }) => {
      const { id, ...userData } = data;
      
      // Process data before sending to API
      const processedData = { ...userData };
      
      // Convert "unassigned" to empty string for API
      if (processedData.assignedClassId === "unassigned") {
        processedData.assignedClassId = "";
      }
      if (processedData.subjectId === "unassigned") {
        processedData.subjectId = "";
      }
      
      const response = await apiRequest("PUT", `/api/users/${id}`, processedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle create form submission
  const onCreateSubmit = (data: UserFormValues) => {
    createUserMutation.mutate(data);
  };

  // Handle edit form submission
  const onEditSubmit = (data: UserFormValues) => {
    if (selectedUser) {
      editUserMutation.mutate({
        ...data,
        id: selectedUser.id,
      });
    }
  };

  // Get class name by ID
  const getClassName = (classId: string) => {
    const classItem = classes.find((c) => c.id === classId);
    return classItem ? classItem.name : "Unassigned";
  };

  // Get subject name by ID
  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId);
    return subject ? subject.name : "Unassigned";
  };

  // Open edit dialog with user data
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    // Get value for role
    setSelectedRole(user.role);
    
    editForm.reset({
      username: user.username,
      password: "", // Don't populate password for security
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      assignedClassId: user.assignedClassId || "unassigned",
      subjectId: user.subjectId || "unassigned",
    });
    
    setIsEditDialogOpen(true);
  };

  // Handle user deletion
  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  // Filter subjects by selected class
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  
  useEffect(() => {
    const classId = createForm.getValues().assignedClassId;
    if (classId && classId !== "unassigned") {
      setFilteredSubjects(subjects.filter(s => s.classId === classId));
    } else {
      setFilteredSubjects(subjects);
    }
  }, [createForm.watch("assignedClassId"), subjects]);

  // Group users by role
  const adminUsers = users.filter(user => user.role === "admin");
  const classTeachers = users.filter(user => user.role === "class_teacher");
  const subjectTeachers = users.filter(user => user.role === "subject_teacher");

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-gray-500">Manage administrators, class teachers, and subject teachers</p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Add User
          </Button>
        </div>

        {isLoadingUsers ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Administrators */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <LucideShieldCheck className="h-5 w-5 mr-2 text-blue-500" />
                Administrators
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {adminUsers.map((user) => (
                  <Card key={user.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div className="flex items-start gap-2">
                          <StudentAvatar initials={user.fullName.charAt(0)} />
                          <div>
                            <CardTitle className="text-lg">{user.fullName}</CardTitle>
                            <CardDescription>{user.username}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                          Admin
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Email:</span>
                          <span>{user.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone:</span>
                          <span>{user.phoneNumber}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditUser(user)}
                      >
                        <Pen className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={user.username === "admin"} // Prevent deleting main admin
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the administrator account for "{user.fullName}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))}
                {adminUsers.length === 0 && (
                  <Card className="col-span-full p-6">
                    <div className="text-center">
                      <LucideShieldCheck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <h3 className="text-gray-500">No administrators found</h3>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Class Teachers */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                Class Teachers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classTeachers.map((user) => (
                  <Card key={user.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div className="flex items-start gap-2">
                          <StudentAvatar initials={user.fullName.charAt(0)} />
                          <div>
                            <CardTitle className="text-lg">{user.fullName}</CardTitle>
                            <CardDescription>{user.username}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                          Class Teacher
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Email:</span>
                          <span>{user.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone:</span>
                          <span>{user.phoneNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Assigned Class:</span>
                          <span className="font-medium">{getClassName(user.assignedClassId || "")}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditUser(user)}
                      >
                        <Pen className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the class teacher account for "{user.fullName}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))}
                {classTeachers.length === 0 && (
                  <Card className="col-span-full p-6">
                    <div className="text-center">
                      <UserCheck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <h3 className="text-gray-500">No class teachers found</h3>
                    </div>
                  </Card>
                )}
              </div>
            </div>

            {/* Subject Teachers */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2 text-purple-500" />
                Subject Teachers
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectTeachers.map((user) => (
                  <Card key={user.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between">
                        <div className="flex items-start gap-2">
                          <StudentAvatar initials={user.fullName.charAt(0)} />
                          <div>
                            <CardTitle className="text-lg">{user.fullName}</CardTitle>
                            <CardDescription>{user.username}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                          Subject Teacher
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Email:</span>
                          <span>{user.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Phone:</span>
                          <span>{user.phoneNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Subject:</span>
                          <span className="font-medium">{getSubjectName(user.subjectId || "")}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditUser(user)}
                      >
                        <Pen className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the subject teacher account for "{user.fullName}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                ))}
                {subjectTeachers.length === 0 && (
                  <Card className="col-span-full p-6">
                    <div className="text-center">
                      <GraduationCap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <h3 className="text-gray-500">No subject teachers found</h3>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create user dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new administrator, class teacher, or subject teacher account.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="john.doe@example.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
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
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset related fields when role changes
                          if (value === "admin") {
                            createForm.setValue("assignedClassId", "unassigned");
                            createForm.setValue("subjectId", "unassigned");
                          } else if (value === "class_teacher") {
                            createForm.setValue("subjectId", "unassigned");
                          } else if (value === "subject_teacher") {
                            createForm.setValue("assignedClassId", "unassigned");
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="class_teacher">Class Teacher</SelectItem>
                          <SelectItem value="subject_teacher">Subject Teacher</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Show class selection for class teachers only */}
                {createFormRole === "class_teacher" && (
                  <FormField
                    control={createForm.control}
                    name="assignedClassId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Class</FormLabel>
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
                            <SelectItem value="unassigned">None (Unassigned)</SelectItem>
                            {classes.map((classItem) => (
                              <SelectItem key={classItem.id} value={classItem.id}>
                                {classItem.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The class this teacher is responsible for.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Show subject selection for subject teachers only */}
                {createFormRole === "subject_teacher" && (
                  <FormField
                    control={createForm.control}
                    name="subjectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">None (Unassigned)</SelectItem>
                            {subjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name} ({getClassName(subject.classId)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The subject this teacher teaches.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create User
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit user dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and role assignments.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="johndoe" 
                            {...field} 
                            disabled={selectedUser?.username === "admin"} // Prevent changing admin username
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Leave blank to keep current password" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Leave blank to keep the current password.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="john.doe@example.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
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
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset related fields when role changes
                          if (value === "admin") {
                            editForm.setValue("assignedClassId", "unassigned");
                            editForm.setValue("subjectId", "unassigned");
                          } else if (value === "class_teacher") {
                            editForm.setValue("subjectId", "unassigned");
                          } else if (value === "subject_teacher") {
                            editForm.setValue("assignedClassId", "unassigned");
                          }
                        }}
                        defaultValue={field.value}
                        disabled={selectedUser?.username === "admin"} // Prevent changing admin role
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="class_teacher">Class Teacher</SelectItem>
                          <SelectItem value="subject_teacher">Subject Teacher</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Show class selection for class teachers only */}
                {editFormRole === "class_teacher" && (
                  <FormField
                    control={editForm.control}
                    name="assignedClassId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Class</FormLabel>
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
                            <SelectItem value="unassigned">None (Unassigned)</SelectItem>
                            {classes.map((classItem) => (
                              <SelectItem key={classItem.id} value={classItem.id}>
                                {classItem.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The class this teacher is responsible for.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Show subject selection for subject teachers only */}
                {editFormRole === "subject_teacher" && (
                  <FormField
                    control={editForm.control}
                    name="subjectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">None (Unassigned)</SelectItem>
                            {subjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name} ({getClassName(subject.classId)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The subject this teacher teaches.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
                    disabled={editUserMutation.isPending}
                  >
                    {editUserMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update User
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