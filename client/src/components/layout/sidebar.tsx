import { cn } from "@/lib/utils";
import { User } from "@shared/schema";
import { Home, Users, BarChart, Bell, Settings, X } from "lucide-react";
import { useLocation, Link } from "wouter";
import { StudentAvatar } from "@/components/ui/student-avatar";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Classes", href: "/classes", icon: Users },
    { name: "Analytics", href: "/analytics", icon: BarChart },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  // Common nav item component
  const NavItem = ({ item, isMobile = false }: { item: typeof navigation[0], isMobile?: boolean }) => {
    const isActive = location === item.href;
    const baseClasses = isMobile
      ? "group flex items-center px-2 py-2 text-base font-medium rounded-md"
      : "group flex items-center px-2 py-2 text-sm font-medium rounded-md";
    
    const activeClasses = isActive
      ? "bg-primary-50 text-primary-600"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900";
      
    const IconComponent = item.icon;
    
    return (
      <Link href={item.href}>
        <a className={cn(baseClasses, activeClasses)}>
          <IconComponent className={cn(
            isMobile ? "mr-4 h-6 w-6" : "mr-3 h-5 w-5",
            isActive ? "text-primary-500" : "text-gray-400 group-hover:text-gray-500"
          )} />
          {item.name}
        </a>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile menu */}
      <div 
        className={cn(
          "fixed inset-0 flex z-40 md:hidden",
          isOpen ? "block" : "hidden"
        )} 
        role="dialog"
        aria-modal="true"
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true"></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={onClose}
            >
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <span className="text-primary-600 text-xl font-bold">NoteTrack</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} isMobile={true} />
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <StudentAvatar initials={user.avatarInitials} />
              <div className="ml-3">
                <p className="text-base font-medium text-gray-700">{user.fullName}</p>
                <p className="text-sm font-medium text-gray-500">{user.role === "admin" ? "Administrator" : "Teacher"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 w-14"></div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                {/* No logo needed here since it's in the top navbar */}
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                {navigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <div className="flex items-center">
                <StudentAvatar initials={user.avatarInitials} size="sm" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.fullName}</p>
                  <p className="text-xs font-medium text-gray-500">{user.role === "admin" ? "Administrator" : "Teacher"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
