import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: "green" | "red" | "yellow" | "blue";
  footer?: string;
  footerValue?: string | number;
  className?: string;
}

export function StatusCard({
  title,
  value,
  icon,
  color,
  footer,
  footerValue,
  className
}: StatusCardProps) {
  const colorConfig = {
    green: {
      bg: "bg-green-100",
      text: "text-green-600"
    },
    red: {
      bg: "bg-red-100",
      text: "text-red-600"
    },
    yellow: {
      bg: "bg-yellow-100",
      text: "text-yellow-600"
    },
    blue: {
      bg: "bg-primary-100",
      text: "text-primary-600"
    },
  };

  const { bg, text } = colorConfig[color];

  return (
    <div className={cn("bg-white overflow-hidden shadow rounded-lg", className)}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={cn("rounded-md p-3", bg)}>
              <div className={text}>{icon}</div>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-xl font-semibold text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {footer && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span className={cn("font-medium", text)}>{footerValue}</span>
            <span className="text-gray-500"> {footer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
