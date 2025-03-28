import { StatusCard } from "./status-card";
import { Check, X, RotateCcw, CalendarCheck } from "lucide-react";

interface StatusOverviewProps {
  totalStudents: number;
  submitted: number;
  missing: number;
  pendingReturn: number;
  weeklyComplianceRate: number;
  complianceChange: number;
}

export function StatusOverview({
  totalStudents,
  submitted,
  missing,
  pendingReturn,
  weeklyComplianceRate,
  complianceChange
}: StatusOverviewProps) {
  const submittedPercent = totalStudents > 0 ? Math.round((submitted / totalStudents) * 100) : 0;
  const missingPercent = totalStudents > 0 ? Math.round((missing / totalStudents) * 100) : 0;
  const pendingReturnPercent = submitted > 0 ? Math.round((pendingReturn / submitted) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      <StatusCard
        title="Submitted Today"
        value={submitted}
        icon={<Check className="h-5 w-5" />}
        color="green"
        footer="of total"
        footerValue={`${submittedPercent}%`}
      />
      
      <StatusCard
        title="Missing Today"
        value={missing}
        icon={<X className="h-5 w-5" />}
        color="red"
        footer="of total"
        footerValue={`${missingPercent}%`}
      />
      
      <StatusCard
        title="Pending Return"
        value={pendingReturn}
        icon={<RotateCcw className="h-5 w-5" />}
        color="yellow"
        footer="of submitted"
        footerValue={`${pendingReturnPercent}%`}
      />
      
      <StatusCard
        title="Weekly Compliance"
        value={`${weeklyComplianceRate}%`}
        icon={<CalendarCheck className="h-5 w-5" />}
        color="blue"
        footer={complianceChange >= 0 ? "from last week" : "from last week"}
        footerValue={complianceChange >= 0 ? `↑ ${complianceChange}%` : `↓ ${Math.abs(complianceChange)}%`}
      />
    </div>
  );
}
