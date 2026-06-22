import { Component, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Teachers from "./pages/Teachers";
import Streams from "./pages/Streams";
import Timetables from "./pages/Timetables";
import Billing from "./pages/Billing";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSchools from "./pages/admin/AdminSchools";
import AdminSchoolDetail from "./pages/admin/AdminSchoolDetail";
import AdminTemplates from "./pages/admin/AdminTemplates";
import AdminTemplateEditor from "./pages/admin/AdminTemplateEditor";
import AdminTimetables from "./pages/admin/AdminTimetables";
import AdminBilling from "./pages/admin/AdminBilling";

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
          </BrowserRouter>
        </AppErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
