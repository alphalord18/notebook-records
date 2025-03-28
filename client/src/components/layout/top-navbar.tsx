import { User } from "@shared/schema";
import { Menu } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { StudentAvatar } from "@/components/ui/student-avatar";
import { Link } from "wouter";

interface TopNavbarProps {
  onMenuButtonClick: () => void;
  user: User;
  className?: string;
}

export function TopNavbar({ onMenuButtonClick, user, className }: TopNavbarProps) {
  const { logoutMutation } = useAuth();
  
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
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 hidden md:inline-block">Class 7B</span>
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
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/settings">
                  <a className="w-full">Settings</a>
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
