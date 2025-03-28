import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CircleCheck, CircleDashed, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface SubmissionProgressProps {
  submitted: number;
  returned: number;
  missing: number;
  total: number;
  subjectName: string;
  className: string;
  cycleStartedAt: string;
  dueDate?: string;
  lastUpdated: string;
  onStartNewCycle?: () => void;
  onMarkAllReturned?: () => void;
  isActive: boolean;
}

export function SubmissionProgress({
  submitted,
  returned,
  missing,
  total,
  subjectName,
  className,
  cycleStartedAt,
  dueDate,
  lastUpdated,
  onStartNewCycle,
  onMarkAllReturned,
  isActive
}: SubmissionProgressProps) {
  const [progressValues, setProgressValues] = useState({
    submitted: 0,
    returned: 0,
    missing: 0
  });

  // Animate progress values on mount and when props change
  useEffect(() => {
    setProgressValues({
      submitted: 0,
      returned: 0,
      missing: 0
    });

    const timeout = setTimeout(() => {
      setProgressValues({
        submitted,
        returned,
        missing
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [submitted, returned, missing]);

  const submittedPercentage = Math.round((submitted / total) * 100);
  const returnedPercentage = Math.round((returned / total) * 100);
  const missingPercentage = Math.round((missing / total) * 100);

  const startDate = new Date(cycleStartedAt);
  const formattedStartDate = startDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }) : 'No due date set';

  return (
    <Card className="shadow-md overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-bold">{subjectName}</CardTitle>
            <CardDescription>{className}</CardDescription>
          </div>
          <AnimatePresence>
            {isActive ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <Badge variant="default" className="bg-green-500">Active</Badge>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <Badge variant="outline">Completed</Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center text-blue-600">
                <CircleDashed className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Submitted</span>
              </div>
              <span className="text-sm font-bold">{submitted} of {total}</span>
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressValues.submitted / total * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <Progress value={submittedPercentage} className="h-2 bg-blue-100">
                <motion.div 
                  className="h-full bg-blue-600 rounded-full" 
                  style={{ width: `${submittedPercentage}%` }}
                />
              </Progress>
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center text-green-600">
                <CircleCheck className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Returned</span>
              </div>
              <span className="text-sm font-bold">{returned} of {total}</span>
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressValues.returned / total * 100}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            >
              <Progress value={returnedPercentage} className="h-2 bg-green-100">
                <motion.div 
                  className="h-full bg-green-600 rounded-full" 
                  style={{ width: `${returnedPercentage}%` }}
                />
              </Progress>
            </motion.div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center text-red-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Missing</span>
              </div>
              <span className="text-sm font-bold">{missing} of {total}</span>
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressValues.missing / total * 100}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
            >
              <Progress value={missingPercentage} className="h-2 bg-red-100">
                <motion.div 
                  className="h-full bg-red-600 rounded-full" 
                  style={{ width: `${missingPercentage}%` }}
                />
              </Progress>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="text-center p-2 bg-gray-50 rounded-md">
            <span className="text-xs text-gray-500 block">Started</span>
            <span className="text-sm font-medium block">{formattedStartDate}</span>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-md">
            <span className="text-xs text-gray-500 block">Due Date</span>
            <span className="text-sm font-medium block">{formattedDueDate}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-between items-center text-xs text-gray-500">
        <div className="flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          <span>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
        </div>
        
        {isActive && submitted > 0 && submitted === returned && (
          <div className="flex space-x-2">
            <motion.button
              className="text-xs py-1 px-2 rounded-md text-blue-600 border border-blue-600 hover:bg-blue-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartNewCycle}
            >
              <div className="flex items-center">
                <RefreshCw className="w-3 h-3 mr-1" />
                <span>New Cycle</span>
              </div>
            </motion.button>
          </div>
        )}
        
        {isActive && submitted > 0 && submitted !== returned && (
          <div className="flex space-x-2">
            <motion.button
              className="text-xs py-1 px-2 rounded-md text-green-600 border border-green-600 hover:bg-green-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMarkAllReturned}
            >
              <div className="flex items-center">
                <CircleCheck className="w-3 h-3 mr-1" />
                <span>Mark All Returned</span>
              </div>
            </motion.button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}