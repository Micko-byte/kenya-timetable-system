import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Streams = lazy(() => import("./pages/Streams"));
const Timetables = lazy(() => import("./pages/Timetables"));
const Billing = lazy(() => import("./pages/Billing"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSchools = lazy(() => import("./pages/admin/AdminSchools"));
const AdminSchoolDetail = lazy(() => import("./pages/admin/AdminSchoolDetail"));
const AdminTemplates = lazy(() => import("./pages/admin/AdminTemplates"));
const AdminTemplateEditor = lazy(() => import("./pages/admin/AdminTemplateEditor"));
const AdminTimetables = lazy(() => import("./pages/admin/AdminTimetables"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
    Loading...
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth isSignUp={false} />} />
              <Route path="/signup" element={<Auth isSignUp={true} />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/welcome" element={<Dashboard />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/streams" element={<Streams />} />
              <Route path="/timetables" element={<Timetables />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/schools" element={<AdminSchools />} />
              <Route path="/admin/schools/:schoolId" element={<AdminSchoolDetail />} />
              <Route path="/admin/templates" element={<AdminTemplates />} />
              <Route path="/admin/templates/:id/edit" element={<AdminTemplateEditor />} />
              <Route path="/admin/templates/new" element={<AdminTemplateEditor />} />
              <Route path="/admin/timetables" element={<AdminTimetables />} />
              <Route path="/admin/billing" element={<AdminBilling />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
