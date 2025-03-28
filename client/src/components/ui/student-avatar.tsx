import { cn } from "@/lib/utils";

interface StudentAvatarProps {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StudentAvatar({ 
  initials, 
  size = "md", 
  className 
}: StudentAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  };
  
  return (
    <div 
      className={cn(
        "rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium",
        sizeClasses[size],
        className
      )}
    >
      <span>{initials}</span>
    </div>
  );
}
