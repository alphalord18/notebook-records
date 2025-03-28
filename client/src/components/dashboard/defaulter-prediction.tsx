import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DefaulterPrediction } from '@shared/schema';
import { AlertCircle, ChevronDown, ChevronUp, AlertTriangle, BarChart3, User } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";

interface DefaulterPredictionProps {
  classId: string | number | null;
}

export function DefaulterPredictionCard({ classId }: DefaulterPredictionProps) {
  const { toast } = useToast();
  const [threshold, setThreshold] = useState(2);
  const [showAll, setShowAll] = useState(false);
  
  // Fetch AI predictions for defaulters
  const { 
    data: predictions = [], 
    isLoading, 
    isError, 
    refetch 
  } = useQuery<DefaulterPrediction[]>({
    queryKey: ['/api/classes', classId, 'ai-predict-defaulters', { threshold }],
    enabled: !!classId,
  });
  
  // Send notifications to defaulter parents
  const sendNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        'POST',
        `/api/classes/${classId}/send-defaulter-notifications`,
        { threshold }
      );
      const data = await response.json() as { notificationCount: number };
      return data;
    },
    onSuccess: (data: { notificationCount: number }) => {
      toast({
        title: 'Notifications sent',
        description: `Sent notifications to parents of ${data.notificationCount} potential defaulters.`,
      });
    },
    onError: (error: any) => {
      // Check if the error indicates missing Twilio credentials
      if (error.message?.includes('not configured') || error.missingSecrets) {
        toast({
          title: 'SMS Service Not Configured',
          description: 'Twilio credentials are missing. Please configure SMS service to send notifications.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to send notifications',
          description: error.message || 'An error occurred while sending notifications',
          variant: 'destructive',
        });
      }
    },
  });
  
  // Calculate display list based on showAll toggle
  const displayPredictions = showAll 
    ? predictions 
    : predictions.filter(p => p.defaultProbability >= 0.7);
    
  // Helper function to get color based on probability
  const getProbabilityColor = (probability: number): string => {
    if (probability >= 0.8) return 'text-red-600';
    if (probability >= 0.6) return 'text-orange-500';
    if (probability >= 0.4) return 'text-yellow-500';
    return 'text-green-600';
  };
  
  const getBadgeVariant = (probability: number): "default" | "destructive" | "outline" | "secondary" => {
    if (probability >= 0.8) return 'destructive';
    if (probability >= 0.6) return 'default';
    if (probability >= 0.4) return 'secondary';
    return 'outline';
  };
  
  // Format probability as percentage
  const formatProbability = (probability: number): string => {
    return `${Math.round(probability * 100)}%`;
  };
  
  return (
    <Card className="shadow-md overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-bold flex items-center text-gray-800">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
              Potential Defaulters
            </CardTitle>
            <CardDescription>
              AI-powered prediction of students who might default on submissions
            </CardDescription>
          </div>
          
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAll(!showAll)}
              className="text-xs"
            >
              {showAll ? 'Show High Risk Only' : 'Show All'}
            </Button>
            
            <Button
              size="sm"
              onClick={() => refetch()}
              className="text-xs"
              variant="ghost"
            >
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Missing Threshold: {threshold}</span>
          </div>
          <div className="px-1">
            <Slider
              value={[threshold]}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => setThreshold(value[0])}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low (1)</span>
            <span>Medium (3)</span>
            <span>High (5)</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-4 rounded-md bg-red-50 text-red-600">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>Failed to load defaulter predictions. Please try again.</span>
            </div>
          </div>
        ) : displayPredictions.length === 0 ? (
          <div className="p-4 rounded-md bg-green-50 text-green-600">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>No potential defaulters detected based on current threshold.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full">
              {displayPredictions.map((prediction, index) => (
                <AccordionItem 
                  key={prediction.studentId} 
                  value={prediction.studentId}
                  className="border border-gray-200 rounded-md mb-3 overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 [&[data-state=open]]:bg-gray-50">
                    <div className="flex items-center w-full text-left">
                      <div className="mr-3 flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-medium">
                          {prediction.studentName.split(' ').map(part => part[0]).join('')}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{prediction.studentName}</div>
                        <div className="text-sm text-gray-500">#{prediction.scholarNumber}</div>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={getBadgeVariant(prediction.defaultProbability)}>
                                <span className="flex items-center">
                                  <BarChart3 className="w-3 h-3 mr-1" />
                                  {formatProbability(prediction.defaultProbability)}
                                </span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Default Probability</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="px-4 pt-2 pb-3 bg-gray-50">
                    <div className="space-y-3">
                      <div className="flex items-center gap-x-2 text-sm">
                        <Badge variant="outline" className="text-xs rounded-sm">
                          Missing: {prediction.missingCount}
                        </Badge>
                        <Badge variant="secondary" className="text-xs rounded-sm">
                          Pattern: {prediction.historyPattern}
                        </Badge>
                      </div>
                      
                      <div className="mt-2">
                        <h4 className="text-sm font-medium mb-1">Reasoning:</h4>
                        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                          {prediction.reasoning.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 pb-4 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {!isLoading && !isError && (
            <>Showing {displayPredictions.length} of {predictions.length} students</>
          )}
        </div>
        
        <Button
          onClick={() => sendNotificationsMutation.mutate()}
          disabled={
            sendNotificationsMutation.isPending || 
            displayPredictions.length === 0 || 
            isLoading || 
            isError
          }
          size="sm"
          className="text-xs"
        >
          <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
          Send Alerts to Parents
        </Button>
      </CardFooter>
    </Card>
  );
}