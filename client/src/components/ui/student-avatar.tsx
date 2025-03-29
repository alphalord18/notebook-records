import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const studentAvatarVariants = cva(
  "flex items-center justify-center rounded-full font-semibold text-white",
  {
    variants: {
      size: {
        sm: "h-6 w-6 text-xs",
        md: "h-9 w-9 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

export interface StudentAvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof studentAvatarVariants> {
  initials: string;
  studentId?: string;
}

export const StudentAvatar = ({
  className,
  size,
  initials,
  studentId,
  ...props
}: StudentAvatarProps) => {
  // Generate a consistent color based on initials or ID
  const getColor = (seed: string) => {
    // List of pleasing background colors
    const colors = [
      "bg-blue-500",   // Blue
      "bg-green-500",  // Green
      "bg-purple-500", // Purple
      "bg-pink-500",   // Pink
      "bg-indigo-500", // Indigo
      "bg-yellow-500", // Yellow
      "bg-red-500",    // Red
      "bg-teal-500",   // Teal
      "bg-orange-500", // Orange
      "bg-cyan-500",   // Cyan
    ];
    
    // Use a simple hash function to generate a consistent index
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Use the absolute value of the hash modulo the length of the colors array
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };
  
  // Get initials (1-2 characters) from the provided string
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };
  
  const displayedInitials = getInitials(initials);
  const colorClass = getColor(studentId || initials);
  
  return (
    <div
      className={cn(studentAvatarVariants({ size }), colorClass, className)}
      {...props}
    >
      {displayedInitials}
    </div>
  );
};