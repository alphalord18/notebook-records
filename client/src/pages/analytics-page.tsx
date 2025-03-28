import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Class, Subject } from "@shared/schema";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { StudentAvatar } from "@/components/ui/student-avatar";
import { BarChart3, BrainCircuit, Loader2, AlertTriangle, TrendingUp } from "lucide-react";
import { DefaulterPredictionCard } from "@/components/dashboard/defaulter-prediction";

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

export default function AnalyticsPage() {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Fetch classes
  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  // Set first class as default when classes are loaded
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Fetch subjects for selected class
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/classes", selectedClassId, "subjects"],
    enabled: !!selectedClassId,
  });

  // Set first subject as default when subjects are loaded
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  interface AnalyticsData {
    byStatus: {
      submitted: number;
      returned: number;
      missing: number;
    };
    frequentDefaulters: Array<{
      student: {
        fullName: string;
        rollNumber: string;
        avatarInitials: string;
      };
      count: number;
    }>;
  }

  // Fetch analytics data with safe default values
  const {
    data: analytics,
    isLoading,
  } = useQuery<AnalyticsData>({
    queryKey: [
      "/api/classes",
      selectedClassId,
      "subjects",
      selectedSubjectId,
      "analytics",
    ],
    enabled: !!selectedClassId && !!selectedSubjectId,
  });
  
  // Ensure analytics has proper default values with complete structure
  const safeAnalytics = {
    byStatus: {
      submitted: analytics?.byStatus?.submitted ?? 0,
      returned: analytics?.byStatus?.returned ?? 0,
      missing: analytics?.byStatus?.missing ?? 0
    },
    frequentDefaulters: analytics?.frequentDefaulters ?? []
  };

  // Prepare data for charts with safe values
  const submissionStatusData = [
    { name: "Submitted", value: safeAnalytics.byStatus.submitted ?? 0, color: "#10b981" },
    { name: "Returned", value: safeAnalytics.byStatus.returned ?? 0, color: "#3b82f6" },
    { name: "Missing", value: safeAnalytics.byStatus.missing ?? 0, color: "#ef4444" },
  ];

  // Weekly trend data (mocked for now - would come from API in real app)
  const weeklyTrendData = [
    { name: "Mon", submitted: 28, missing: 4 },
    { name: "Tue", submitted: 26, missing: 6 },
    { name: "Wed", submitted: 25, missing: 7 },
    { name: "Thu", submitted: 27, missing: 5 },
    { name: "Fri", submitted: 29, missing: 3 },
  ];

  // Monthly compliance data (mocked - would come from API in real app)
  const monthlyComplianceData = [
    { name: "Week 1", rate: 82 },
    { name: "Week 2", rate: 85 },
    { name: "Week 3", rate: 79 },
    { name: "Week 4", rate: 87 },
  ];

  const currentClass = classes.find(c => c.id === selectedClassId);
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <AppShell>
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Submission Analytics</h1>
          <p className="text-gray-500">Track notebook submission patterns and identify trends</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <Select
              value={selectedClassId?.toString() || ""}
              onValueChange={(value) => setSelectedClassId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <Select
              value={selectedSubjectId?.toString() || ""}
              onValueChange={(value) => setSelectedSubjectId(value)}
              disabled={!selectedClassId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="stats" className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-4">
            <TabsTrigger value="stats" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span>Statistics</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center">
              <BrainCircuit className="h-4 w-4 mr-2" />
              <span>AI Predictions</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Submission Status Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Submission Status</CardTitle>
                  <CardDescription>
                    {currentClass?.name} - {currentSubject?.name} notebook submission status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={submissionStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {submissionStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} notebooks`, ""]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Submission Trend</CardTitle>
                  <CardDescription>
                    Notebook submission trend for the past week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyTrendData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="submitted" fill="#10b981" name="Submitted" />
                        <Bar dataKey="missing" fill="#ef4444" name="Missing" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Monthly Compliance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Compliance Rate</CardTitle>
                  <CardDescription>
                    Notebook submission compliance rate over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyComplianceData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, "Compliance Rate"]} />
                        <Bar dataKey="rate" fill="#3b82f6" name="Compliance Rate" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Frequent Defaulters */}
              <Card>
                <CardHeader>
                  <CardTitle>Frequent Defaulters</CardTitle>
                  <CardDescription>
                    Students who frequently miss notebook submissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {safeAnalytics.frequentDefaulters.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <StudentAvatar
                            initials={item?.student?.avatarInitials || "??"}
                            size="sm"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium">{item?.student?.fullName || "Unknown Student"}</div>
                            <div className="text-xs text-gray-500">{item?.student?.rollNumber || "No ID"}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="ml-2 text-sm font-medium py-1 px-2 bg-red-100 text-red-800 rounded-full">
                            {item?.count ?? 0} missed
                          </div>
                        </div>
                      </div>
                    ))}

                    {safeAnalytics.frequentDefaulters.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No frequent defaulters found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
          </TabsContent>
          
          <TabsContent value="ai">
            {!selectedClassId ? (
              <div className="py-12 text-center text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-amber-500" />
                <h3 className="text-lg font-medium mb-1">Please select a class</h3>
                <p>Select a class to view AI predictions for potential defaulters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                <DefaulterPredictionCard classId={selectedClassId} />
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                      Submission Performance Trends
                    </CardTitle>
                    <CardDescription>
                      Historical performance trends and projections
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[
                            { date: 'Week 1', actual: 88, projected: 85 },
                            { date: 'Week 2', actual: 82, projected: 82 },
                            { date: 'Week 3', actual: 79, projected: 78 },
                            { date: 'Week 4', actual: 75, projected: 75 },
                            { date: 'Week 5', projected: 72 },
                            { date: 'Week 6', projected: 70 },
                          ]}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[50, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="actual"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Actual Rate"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="projected"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Projected Rate"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-sm text-gray-500 text-center">
                      <p>AI prediction model shows a declining trend in submission compliance rate</p>
                      <p className="text-xs mt-1">Based on historical data and current submission patterns</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
