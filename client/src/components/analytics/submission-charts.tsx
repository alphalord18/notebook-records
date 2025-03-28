import React from 'react';
import { Card, Title, Text, Tab, TabList, TabGroup, TabPanel, TabPanels, Metric, Legend, BarChart, DonutChart, AreaChart } from '@tremor/react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend as ChartLegend,
  BarElement,
  ArcElement,
  Filler,
} from 'chart.js';
import { Sparkles } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartTitle,
  Tooltip,
  ChartLegend,
  Filler
);

interface SubmissionDataPoint {
  date: string;
  submitted: number;
  returned: number;
  missing: number;
}

interface DefaulterPrediction {
  studentId: string;
  studentName: string;
  scholarNumber: string;
  defaultProbability: number;
  missingCount: number;
  historyPattern: string;
}

interface SubmissionChartsProps {
  submissionData: SubmissionDataPoint[];
  defaulterPredictions?: DefaulterPrediction[];
  submissionStatusData: {
    status: string;
    count: number;
    color: string;
  }[];
  totalStudents: number;
  submissionRate: number;
  returnRate: number;
  averageTurnaround: number; // in days
}

export function SubmissionCharts({
  submissionData,
  defaulterPredictions = [],
  submissionStatusData,
  totalStudents,
  submissionRate,
  returnRate,
  averageTurnaround,
}: SubmissionChartsProps) {
  // Format data for Tremor charts
  const tremorData = submissionData.map(item => ({
    date: item.date,
    'Submitted': item.submitted,
    'Returned': item.returned,
    'Missing': item.missing
  }));
  
  // Format data for Chart.js
  const chartJsLabels = submissionData.map(item => item.date);
  const chartJsSubmitted = submissionData.map(item => item.submitted);
  const chartJsReturned = submissionData.map(item => item.returned);
  const chartJsMissing = submissionData.map(item => item.missing);
  
  const barChartData = {
    labels: chartJsLabels,
    datasets: [
      {
        label: 'Submitted',
        data: chartJsSubmitted,
        backgroundColor: 'rgba(59, 130, 246, 0.7)', // Blue
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Returned',
        data: chartJsReturned,
        backgroundColor: 'rgba(16, 185, 129, 0.7)', // Green
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      },
      {
        label: 'Missing',
        data: chartJsMissing,
        backgroundColor: 'rgba(239, 68, 68, 0.7)', // Red
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
    ],
  };
  
  const donutData = {
    labels: submissionStatusData.map(item => item.status),
    datasets: [
      {
        data: submissionStatusData.map(item => item.count),
        backgroundColor: submissionStatusData.map(item => item.color),
        borderColor: submissionStatusData.map(item => item.color),
        borderWidth: 1,
      },
    ],
  };
  
  const donutOptions = {
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="blue">
          <Text>Total Students</Text>
          <Metric>{totalStudents}</Metric>
        </Card>
        <Card decoration="top" decorationColor="green">
          <Text>Submission Rate</Text>
          <Metric>{submissionRate}%</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Text>Return Rate</Text>
          <Metric>{returnRate}%</Metric>
        </Card>
        <Card decoration="top" decorationColor="indigo">
          <Text>Avg. Turnaround</Text>
          <Metric>{averageTurnaround} days</Metric>
        </Card>
      </div>

      <TabGroup>
        <TabList className="mb-4">
          <Tab>Trend Analysis</Tab>
          <Tab>Status Breakdown</Tab>
          <Tab>AI Predictions</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <Title>Submission Trend (Bar)</Title>
                <div className="h-64 mt-4">
                  <Bar data={barChartData} options={{ maintainAspectRatio: false, responsive: true }} />
                </div>
              </Card>
              <Card>
                <Title>Submission Trend (Area)</Title>
                <div className="h-64 mt-4">
                  <AreaChart
                    data={tremorData}
                    index="date"
                    categories={['Submitted', 'Returned', 'Missing']}
                    colors={['blue', 'green', 'red']}
                    valueFormatter={(number) => number.toString()}
                    showLegend={true}
                    showGridLines={false}
                    showAnimation={true}
                  />
                </div>
              </Card>
            </div>
          </TabPanel>
          <TabPanel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <Title>Current Status</Title>
                <div className="h-64 mt-4 flex items-center justify-center">
                  <Doughnut data={donutData} options={donutOptions} />
                </div>
                <Legend
                  className="mt-6"
                  categories={submissionStatusData.map(item => item.status)}
                  colors={submissionStatusData.map(item => item.color.replace('rgba(', '').replace(')', '').split(',')[0] as 'blue' | 'green' | 'red' | 'amber')}
                />
              </Card>
              <Card>
                <Title>Status Breakdown</Title>
                <div className="h-64 mt-4">
                  <BarChart
                    data={submissionStatusData}
                    index="status"
                    categories={["count"]}
                    colors={["indigo"]}
                    valueFormatter={(number) => number.toString()}
                    showLegend={false}
                    showGridLines={false}
                    showAnimation={true}
                  />
                </div>
              </Card>
            </div>
          </TabPanel>
          <TabPanel>
            <Card>
              <div className="flex items-center justify-between">
                <Title>Potential Defaulters</Title>
                <div className="flex items-center text-amber-500">
                  <Sparkles className="w-5 h-5 mr-1" />
                  <Text>AI Powered</Text>
                </div>
              </div>
              
              {defaulterPredictions.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scholar #</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missing Count</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default Probability</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pattern</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {defaulterPredictions.map((student) => (
                        <tr key={student.studentId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.scholarNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.studentName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.missingCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    student.defaultProbability > 75 ? 'bg-red-600' : 
                                    student.defaultProbability > 50 ? 'bg-orange-500' : 
                                    student.defaultProbability > 25 ? 'bg-yellow-400' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${student.defaultProbability}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm text-gray-600">{student.defaultProbability}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.historyPattern}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-12 text-center text-gray-500">
                  <p>Not enough data to make predictions yet.</p>
                  <p className="text-sm mt-2">AI needs more submission history to identify patterns.</p>
                </div>
              )}
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
}