import { User } from "@shared/firebase-types";
import { BarChart, Book, LayoutDashboard, Menu, Settings, ShieldCheck, Users, School } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { StudentAvatar } from "@/components/ui/student-avatar";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

interface TopNavbarProps {
  onMenuButtonClick: () => void;
  user: Omit<User, "password">;
  className?: string;
}

export function TopNavbar({ onMenuButtonClick, user, className }: TopNavbarProps) {
  const { logoutMutation } = useAuth();
  const [location] = useLocation();
  
  // Format role name for display
  const formatRoleName = (role: string) => {
    if (role === "admin") return "Administrator";
    if (role === "class_teacher") return "Class Teacher";
    if (role === "subject_teacher") return "Subject Teacher";
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center space-x-3">
          <button 
            type="button" 
            className="md:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
            onClick={onMenuButtonClick}
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link href="/">
            <a className="flex items-center space-x-2">
              <span className="text-primary-600 text-xl font-bold">NoteTrack</span>
            </a>
          </Link>
        </div>
        
        {/* Navigation links */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/">
            <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              location === "/" ? "text-primary bg-primary/10" : "text-gray-600 hover:text-primary hover:bg-gray-50"
            }`}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </a>
          </Link>
          
          <Link href="/analytics">
            <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              location === "/analytics" ? "text-primary bg-primary/10" : "text-gray-600 hover:text-primary hover:bg-gray-50"
            }`}>
              <BarChart className="mr-2 h-4 w-4" />
              Analytics
            </a>
          </Link>
          
          {/* Admin-only navigation */}
          {user.role === "admin" && (
            <>
              <Link href="/admin">
                <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location === "/admin" ? "text-primary bg-primary/10" : "text-gray-600 hover:text-primary hover:bg-gray-50"
                }`}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin Panel
                </a>
              </Link>
              
              <Link href="/admin/user-management">
                <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location === "/admin/user-management" ? "text-primary bg-primary/10" : "text-gray-600 hover:text-primary hover:bg-gray-50"
                }`}>
                  <Users className="mr-2 h-4 w-4" />
                  Users
                </a>
              </Link>
              
              <Link href="/admin/class-management">
                <a className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  location === "/admin/class-management" ? "text-primary bg-primary/10" : "text-gray-600 hover:text-primary hover:bg-gray-50"
                }`}>
                  <School className="mr-2 h-4 w-4" />
                  Classes
                </a>
              </Link>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="hidden md:inline-flex">
            {formatRoleName(user.role)}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full" size="icon">
                <StudentAvatar initials={user.avatarInitials} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.username}
                  </p>
                  <Badge variant="outline" className="mt-1 w-fit">
                    {formatRoleName(user.role)}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Mobile navigation links */}
              <div className="md:hidden">
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <a className="w-full flex items-center">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </a>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/analytics">
                    <a className="w-full flex items-center">
                      <BarChart className="mr-2 h-4 w-4" />
                      Analytics
                    </a>
                  </Link>
                </DropdownMenuItem>
                
                {/* Admin-only navigation for mobile */}
                {user.role === "admin" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <a className="w-full flex items-center">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Admin Panel
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link href="/admin/user-management">
                        <a className="w-full flex items-center">
                          <Users className="mr-2 h-4 w-4" />
                          User Management
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link href="/admin/class-management">
                        <a className="w-full flex items-center">
                          <School className="mr-2 h-4 w-4" />
                          Class Management
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
              </div>
              
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <a className="w-full flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </a>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
