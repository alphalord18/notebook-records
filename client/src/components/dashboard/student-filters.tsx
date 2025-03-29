import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, Check, X, Users } from "lucide-react";
import { Class, Subject } from "@shared/schema";

interface StudentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  totalCount: number;
  submittedCount: number;
  missingCount: number;
  classes?: Class[];
  subjects?: Subject[];
  selectedClassId?: string | null;
  selectedSubjectId?: string | null;
  onClassChange?: (classId: string) => void;
  onSubjectChange?: (subjectId: string) => void;
  showClassDropdown?: boolean;
}

export function StudentFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalCount,
  submittedCount,
  missingCount,
  classes = [],
  subjects = [],
  selectedClassId,
  selectedSubjectId,
  onClassChange,
  onSubjectChange,
  showClassDropdown = false
}: StudentFiltersProps) {
  return (
    <div className="bg-white shadow rounded-lg mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4">
        <div className="w-full md:w-auto flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3 mb-3 md:mb-0">
          {/* Class dropdown for subject teachers */}
          {showClassDropdown && classes.length > 0 && onClassChange && (
            <div className="flex-1 md:w-40">
              <Select 
                value={selectedClassId || undefined} 
                onValueChange={onClassChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      <div className="flex items-center">
                        <Users className="h-3.5 w-3.5 mr-1 text-gray-500" />
                        {cls.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 py-2"
                placeholder="Search students..."
              />
            </div>
          </div>
          
          <div className="flex-1 md:w-40">
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="pending">Pending Return</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="w-full md:w-auto flex justify-between md:justify-end space-x-3">
          <Badge className="bg-primary-100 text-primary-800 hover:bg-primary-200 py-1.5 px-3 rounded-full">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <span>{totalCount} Students</span>
          </Badge>
          
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 py-1.5 px-3 rounded-full">
            <Check className="h-3.5 w-3.5 mr-1" />
            <span>{submittedCount} Submitted</span>
          </Badge>
          
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 py-1.5 px-3 rounded-full">
            <X className="h-3.5 w-3.5 mr-1" />
            <span>{missingCount} Missing</span>
          </Badge>
        </div>
      </div>
    </div>
  );
}
