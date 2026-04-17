import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Revenue Trend Chart
export const RevenueTrendChart = ({ data }: { data: any[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2} name="MRR" />
            <Line type="monotone" dataKey="arr" stroke="hsl(var(--secondary))" strokeWidth={2} name="ARR" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Subscription Distribution Chart
export const SubscriptionDistributionChart = ({ data }: { data: any[] }) => {
  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Timetable Generation Activity Chart
export const TimetableActivityChart = ({ data }: { data: any[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timetable Generation Activity (Daily)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ai" fill="hsl(var(--primary))" name="AI Generated" />
            <Bar dataKey="manual" fill="hsl(var(--secondary))" name="Manual" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Template Usage Chart
export const TemplateUsageChart = ({ data }: { data: any[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Usage Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Legend />
            <Bar dataKey="usage" fill="hsl(var(--primary))" name="Schools Using" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
