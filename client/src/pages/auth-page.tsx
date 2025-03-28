import { useAuth, loginSchema } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BookOpen, BookCheck, PencilRuler, Loader2, School, Users, BarChart3 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  
  // Login Form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  // Redirect if logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Hero section */}
      <div className="md:w-1/2 bg-gradient-to-br from-primary-700 to-primary-900 text-white p-8 flex flex-col justify-center">
        <div className="max-w-md mx-auto py-8">
          <div className="flex items-center gap-2 mb-6">
            <BookCheck className="h-10 w-10" />
            <h1 className="text-3xl font-bold">NoteTrack</h1>
          </div>
          <h2 className="text-2xl font-semibold mb-4">Streamline Notebook Submission Tracking</h2>
          <p className="mb-8">The complete solution for teachers to track student notebook submissions, send parent notifications, and maintain records with advanced analytics.</p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">Easy Tracking</h3>
                <p className="text-sm opacity-80">One-click notebook submission tracking with return timing</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <School className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">Scholar Number Detection</h3>
                <p className="text-sm opacity-80">Automatic student identification with 5-digit scholar numbers</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">Admin Dashboard</h3>
                <p className="text-sm opacity-80">School-wide view for better oversight and class management</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">Smart Analytics</h3>
                <p className="text-sm opacity-80">AI-powered defaulter prediction based on submission history</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Auth form section */}
      <div className="md:w-1/2 p-8 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to NoteTrack</CardTitle>
            <CardDescription>
              Login to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm">
                <p className="font-medium mb-2">Test Credentials:</p>
                <p>Admin: <span className="font-medium">admin</span> / <span className="font-medium">admin123</span></p>
                <p>Subject Teacher: <span className="font-medium">subject</span> / <span className="font-medium">subject123</span></p>
                <p>Class Teacher: <span className="font-medium">class</span> / <span className="font-medium">class123</span></p>
              </AlertDescription>
            </Alert>
            
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full mt-2" 
                  disabled={loginMutation.isPending}
                  size="lg"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center text-center">
            <p className="text-xs text-muted-foreground">
              This is a secured login system. User accounts are created by the system administrator.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
