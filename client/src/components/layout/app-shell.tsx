import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { TopNavbar } from "./top-navbar";
import { useAuth } from "@/hooks/use-auth";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNavbar 
        onMenuButtonClick={() => setSidebarOpen(true)} 
        user={user}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          user={user} 
        />
        
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
