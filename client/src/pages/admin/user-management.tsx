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
  role: z.enum(["admin", "class_teacher", "subject_teacher"], {
    required_error: "Role is required.",
  }),
  assignedClassId: z.string().optional(),
});

// Types based on the schema
type UserFormValues = z.infer<typeof userFormSchema>;

// Define the schema for user data
interface User {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "class_teacher" | "subject_teacher";
  assignedClassId?: string;
}

// Define the schema for class data
interface Class {
  id: string;
  name: string;
  teacherId: string;
  sessionId: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch users
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    isError: isErrorUsers,
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch classes
  const {
    data: classes = [],
    isLoading: isLoadingClasses,
    isError: isErrorClasses,
  } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  // Create user form
  const createForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: "subject_teacher",
      assignedClassId: "",
    },
  });

  // Edit user form
  const editForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema.omit({ password: true })),
    defaultValues: {
      username: "",
      fullName: "",
      role: "subject_teacher",
      assignedClassId: "",
    },
  });

  // Watch the role fields to conditionally render assigned class
  const createFormRole = createForm.watch("role");
  const editFormRole = editForm.watch("role");

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    },
    onError: (error) => {
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
      const response = await apiRequest("PUT", `/api/users/${id}`, userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    },
    onError: (error) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle create form submission
  const onCreateSubmit = (data: UserFormValues) => {
    // If the selected role is not class_teacher, remove assignedClassId
    if (data.role !== "class_teacher") {
      data.assignedClassId = undefined;
    }
    createUserMutation.mutate(data);
  };

  // Handle edit form submission
  const onEditSubmit = (data: UserFormValues) => {
    // If the selected role is not class_teacher, remove assignedClassId
    if (data.role !== "class_teacher") {
      data.assignedClassId = undefined;
    }
    
    if (selectedUser) {
      editUserMutation.mutate({
        ...data,
        id: selectedUser.id,
      });
    }
  };

  // Open edit dialog with user data
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    editForm.reset({
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      assignedClassId: user.assignedClassId || "",
    });
    setIsEditDialogOpen(true);
  };

  // Handle user deletion
  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  // Get class name by id
  const getClassName = (classId?: string) => {
    if (!classId) return "None";
    const cls = classes.find((c) => c.id === classId);
    return cls ? cls.name : "Unknown";
  };

  // Role display name mapping
  const roleDisplayName = {
    admin: "Administrator",
    class_teacher: "Class Teacher",
    subject_teacher: "Subject Teacher",
  };

  // Role icon mapping
  const roleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <LucideShieldCheck className="h-4 w-4 text-red-600" />;
      case "class_teacher":
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case "subject_teacher":
        return <GraduationCap className="h-4 w-4 text-green-600" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <AppShell>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-gray-500">Manage user accounts and permissions</p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* User list */}
        {isLoadingUsers || isLoadingClasses ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isErrorUsers || isErrorClasses ? (
          <div className="text-center p-8 text-red-500">
            Failed to load data. Please try again.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <Card key={user.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start space-y-0 gap-4 pb-2">
                  <StudentAvatar 
                    initials={user.fullName.split(" ").map(n => n[0]).join("")} 
                    size="md" 
                  />
                  <div className="space-y-1 flex-1">
                    <CardTitle className="flex justify-between items-center">
                      <span>{user.fullName}</span>
                      <Badge className="flex items-center gap-1 ml-auto">
                        {roleIcon(user.role)}
                        <span>{roleDisplayName[user.role]}</span>
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      @{user.username}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pb-2">
                  {user.role === "class_teacher" && user.assignedClassId && (
                    <div className="text-sm flex justify-between">
                      <span className="text-gray-500">Assigned Class:</span>
                      <span className="font-medium">{getClassName(user.assignedClassId)}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-8"
                    onClick={() => handleEditUser(user)}
                  >
                    <Pen className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        className="text-xs h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the user "{user.fullName}" and remove all associated data.
                          This action cannot be undone.
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

            {users.length === 0 && (
              <div className="col-span-full text-center p-12 border rounded-lg">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-500">No users found</h3>
                <p className="text-gray-400 mb-4">Start by adding a new user</p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-2"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Create user dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user account with role-based permissions.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the user's full name.
                      </FormDescription>
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
                      <FormDescription>
                        The username used for login.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••" {...field} />
                      </FormControl>
                      <FormDescription>
                        Must be at least 6 characters.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center">
                              <LucideShieldCheck className="h-4 w-4 text-red-600 mr-2" />
                              Administrator
                            </div>
                          </SelectItem>
                          <SelectItem value="class_teacher">
                            <div className="flex items-center">
                              <UserCheck className="h-4 w-4 text-blue-600 mr-2" />
                              Class Teacher
                            </div>
                          </SelectItem>
                          <SelectItem value="subject_teacher">
                            <div className="flex items-center">
                              <GraduationCap className="h-4 w-4 text-green-600 mr-2" />
                              Subject Teacher
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The role determines user permissions.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                            <SelectItem value="">None (Unassigned)</SelectItem>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Assign a class for this teacher to manage.
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user details and permissions.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the user's full name.
                      </FormDescription>
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
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormDescription>
                        The username used for login.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center">
                              <LucideShieldCheck className="h-4 w-4 text-red-600 mr-2" />
                              Administrator
                            </div>
                          </SelectItem>
                          <SelectItem value="class_teacher">
                            <div className="flex items-center">
                              <UserCheck className="h-4 w-4 text-blue-600 mr-2" />
                              Class Teacher
                            </div>
                          </SelectItem>
                          <SelectItem value="subject_teacher">
                            <div className="flex items-center">
                              <GraduationCap className="h-4 w-4 text-green-600 mr-2" />
                              Subject Teacher
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The role determines user permissions.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                            <SelectItem value="">None (Unassigned)</SelectItem>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Assign a class for this teacher to manage.
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