import React, { useState } from "react";
import { TopNavbar } from "./top-navbar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { User } from "@shared/firebase-types";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-500">Not authenticated</p>
          <p className="text-sm text-gray-400">Please log in to access this page</p>
        </div>
      </div>
    );
  }

  // Create a clean user object without the password
  const cleanUser: Omit<User, "password"> = {
    ...user,
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopNavbar 
        onMenuButtonClick={toggleSidebar} 
        user={cleanUser as any}
      />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}