import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import AnalyticsPage from "@/pages/analytics-page";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import UserManagement from "@/pages/admin/user-management";
import ClassManagement from "@/pages/admin/class-management";
import StudentManagement from "@/pages/admin/student-management";

function RoleBasedRoute({ path, component: Component, requiredRole }: { path: string, component: React.ComponentType<any>, requiredRole: string | string[] }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  
  // Create a wrapper component that will be passed to ProtectedRoute
  const WrappedComponent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"/>
      </div>;
    }

    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!user || !allowedRoles.includes(user.role)) {
      // Redirect to homepage if not authorized
      setTimeout(() => navigate("/"), 100);
      return <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-lg font-medium">Unauthorized access</p>
          <p className="text-sm text-gray-500">Redirecting to homepage...</p>
        </div>
      </div>;
    }

    // User is authorized, render the component
    return <Component />;
  };

  return <ProtectedRoute path={path} component={WrappedComponent} />;
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      
      {/* Admin routes */}
      <RoleBasedRoute path="/admin" component={AdminDashboard} requiredRole="admin" />
      <RoleBasedRoute path="/admin/user-management" component={UserManagement} requiredRole="admin" />
      <RoleBasedRoute path="/admin/class-management" component={ClassManagement} requiredRole="admin" />
      <RoleBasedRoute path="/admin/student-management" component={StudentManagement} requiredRole="admin" />
      
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
