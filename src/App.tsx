import { Component, lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index"; // landing page stays eager for fast first paint

// Route-level code splitting: each page (and its heavy deps — jspdf/html2canvas/
// xlsx in Timetables, recharts in admin) loads only when its route is visited.
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached pages render instantly on revisit, then refresh quietly in the
      // background instead of blocking the UI on every navigation.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
          <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg">
            <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit a runtime error while loading a page. Refreshing the page usually clears stale chunks or state.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <AppErrorBoundary>
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-background">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              }
            >
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
        </AppErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
