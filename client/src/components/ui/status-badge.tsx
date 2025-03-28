import { cn } from "@/lib/utils";

type StatusType = "submitted" | "returned" | "missing" | "pending";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    submitted: {
      bg: "bg-green-100",
      text: "text-green-800",
      label: "Submitted",
    },
    returned: {
      bg: "bg-green-100",
      text: "text-green-800",
      label: "Returned",
    },
    missing: {
      bg: "bg-red-100",
      text: "text-red-800",
      label: "Missing",
    },
    pending: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      label: "Pending Return",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  );
}
