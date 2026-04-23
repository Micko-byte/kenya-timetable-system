import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  LogOut,
  Users,
  BookOpen,
  Calendar,
  LayoutDashboard,
  Settings,
  UserCircle2,
  CreditCard,
  Building2,
  Sidebar,
} from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.svg";

interface DashboardLayoutProps {
  children: ReactNode;
}

const SCHOOL_TYPES = [
  { value: "primary", label: "Primary School" },
  { value: "secondary", label: "High School / Secondary" },
  { value: "college", label: "College" },
  { value: "university", label: "University" },
  { value: "training", label: "Training Institute" },
  { value: "international", label: "International School" },
];

const getSchoolTypeLabel = (value: string) =>
  SCHOOL_TYPES.find((type) => type.value === value)?.label || value || "School";

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState("primary");
  const [locationValue, setLocationValue] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [subscription, setSubscription] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BookOpen, label: "Streams", path: "/streams" },
    { icon: Users, label: "Teachers", path: "/teachers" },
    { icon: Calendar, label: "Timetables", path: "/timetables" },
  ];

  const fetchSchoolData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    setSchoolEmail(user.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (profile?.school_id) {
      setSchoolId(profile.school_id);

      const [{ data: school }, { data: subscriptionData }] = await Promise.all([
        supabase
          .from("schools")
          .select("name, type, location")
          .eq("id", profile.school_id)
          .single(),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("school_id", profile.school_id)
          .single(),
      ]);

      if (school) {
        setSchoolName(school.name || "");
        setSchoolType(school.type || "primary");
        setLocationValue(school.location || "");
      }

      setSubscription(subscriptionData);
    }
  };

  useEffect(() => {
    void fetchSchoolData();
  }, [navigate, location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const handleSaveProfile = async () => {
    if (!schoolId) return;

    setSaving(true);
    const { data: updatedSchool, error } = await supabase
      .from("schools")
      .update({
        name: schoolName,
        type: schoolType,
        location: locationValue,
      })
      .eq("id", schoolId)
      .select("name, type, location")
      .single();

    setSaving(false);

    if (error || !updatedSchool) {
      toast.error("Failed to update school profile");
      return;
    }

    setSchoolName(updatedSchool.name || "");
    setSchoolType(updatedSchool.type || "primary");
    setLocationValue(updatedSchool.location || "");

    toast.success("School profile updated");
    setSettingsOpen(false);
  };

  const profileMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full bg-transparent text-white shadow-none hover:bg-white/10 ${
            sidebarOpen
              ? "justify-start gap-3 rounded-2xl px-3 py-3 text-base font-semibold"
              : "justify-center rounded-2xl p-3"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg shadow-black/10">
            <UserCircle2 className="h-7 w-7 text-primary" />
          </span>
          {sidebarOpen && (
            <div className="min-w-0 text-left">
              <p className="truncate text-white">{schoolName || "Profile"}</p>
              <p className="truncate text-xs font-normal text-white/70">{getSchoolTypeLabel(schoolType)}</p>
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-2xl border-primary/10 p-2">
        <DropdownMenuLabel className="px-3 py-3">
          <div className="flex items-start gap-3">
            <UserCircle2 className="mt-0.5 h-10 w-10 text-primary" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{schoolName || "School Profile"}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{getSchoolTypeLabel(schoolType)}</p>
              <p className="truncate text-sm font-normal text-muted-foreground">{schoolEmail || "No email available"}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="rounded-xl px-3 py-3" onClick={() => setSettingsOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-xl px-3 py-3" onClick={() => setSubscriptionOpen(true)}>
          <CreditCard className="mr-2 h-4 w-4" />
          Subscription
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-xl px-3 py-3 text-destructive focus:text-destructive"
          onClick={() => setLogoutConfirmOpen(true)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="relative flex min-h-screen overflow-x-hidden overflow-y-visible">
      <div className="fixed inset-0 -z-10 bg-[hsl(var(--background))]" />
      <div className="brand-grid-bg fixed inset-0 -z-10 opacity-100" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_32%),radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,247,255,0.94))]" />

      <aside
        className={`fixed left-0 top-0 z-40 hidden h-screen flex-col bg-[hsl(var(--foreground))] text-white transition-all duration-300 md:flex ${
          sidebarOpen ? "w-64" : "w-24"
        }`}
      >
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0))] p-6">
          {sidebarOpen ? (
            <div className="flex items-center justify-between gap-3">
              <img src={logo} alt="ElimuTime logo" className="h-14 w-auto flex-shrink-0 object-contain" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="h-10 w-10 rounded-xl bg-transparent p-0 text-white hover:bg-transparent hover:text-white/80"
                aria-label="Collapse sidebar"
              >
                <Sidebar className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <img src={logo} alt="ElimuTime logo" className="h-12 w-auto flex-shrink-0 object-contain" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-10 w-10 rounded-xl bg-transparent p-0 text-white hover:bg-transparent hover:text-white/80"
                aria-label="Expand sidebar"
              >
                <Sidebar className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        <nav className={`flex-1 space-y-4 py-4 ${sidebarOpen ? "pl-4" : "px-3"}`}>
          {menuItems.map((item) => (
            <div key={item.path} className="relative">
              <button
                onClick={() => navigate(item.path)}
                className={`group relative flex w-full items-center px-4 py-3 transition-all duration-300 ${
                  location.pathname === item.path
                    ? `bg-white/95 font-semibold shadow-lg shadow-black/10 ${sidebarOpen ? "gap-4 rounded-l-full" : "justify-center rounded-2xl"}`
                    : `text-white/80 hover:bg-white/10 ${sidebarOpen ? "gap-4 rounded-2xl" : "justify-center rounded-2xl"}`
                }`}
              >
                <item.icon
                  className={`h-5 w-5 flex-shrink-0 transition-colors ${
                    location.pathname === item.path ? "text-primary" : "text-white/80 group-hover:text-white"
                  }`}
                />
                {sidebarOpen && (
                  <span
                    className={`text-sm font-normal transition-colors ${
                      location.pathname === item.path ? "text-primary" : "text-white/80 group-hover:text-white"
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </button>

              {location.pathname === item.path && sidebarOpen && (
                <>
                  <div className="absolute -top-4 right-0 h-4 w-4 bg-transparent">
                    <div className="h-full w-full rounded-r-lg bg-[hsl(var(--foreground))]" />
                  </div>
                  <div className="absolute -bottom-4 right-0 h-4 w-4 bg-transparent">
                    <div className="h-full w-full rounded-r-lg bg-[hsl(var(--foreground))]" />
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">{profileMenu}</div>
      </aside>

      <div
        className={`min-h-screen w-full flex-1 overflow-x-hidden overflow-y-auto transition-[margin] duration-300 ${
          sidebarOpen ? "md:ml-64" : "md:ml-24"
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-primary/10 bg-white/95 shadow-sm backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <div className="min-w-0 flex-1 text-center">
              <h2 className="truncate text-sm font-bold text-foreground">{schoolName}</h2>
              <p className="text-xs text-muted-foreground">{getSchoolTypeLabel(schoolType)}</p>
            </div>
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <UserCircle2 className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 rounded-2xl border-primary/10 p-2">
                  <DropdownMenuLabel className="px-3 py-3">
                    <div className="flex items-start gap-3">
                      <UserCircle2 className="mt-0.5 h-10 w-10 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{schoolName || "School Profile"}</p>
                        <p className="truncate text-xs font-normal text-muted-foreground">{getSchoolTypeLabel(schoolType)}</p>
                        <p className="truncate text-sm font-normal text-muted-foreground">{schoolEmail || "No email available"}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-xl px-3 py-3" onClick={() => setSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-xl px-3 py-3" onClick={() => setSubscriptionOpen(true)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-xl px-3 py-3 text-destructive focus:text-destructive"
                    onClick={() => setLogoutConfirmOpen(true)}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="overflow-x-hidden px-4 py-6 pb-24 md:p-8">
          <div className="mx-auto max-w-6xl overflow-x-hidden">
            <div className="overflow-x-hidden rounded-[2rem] border border-primary/10 bg-white/95 p-4 shadow-[0_24px_60px_rgba(1,16,39,0.08)] backdrop-blur-sm sm:p-6 md:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-40 rounded-[1.75rem] border border-primary/10 bg-white/95 p-2 shadow-[0_24px_60px_rgba(1,16,39,0.14)] backdrop-blur-md md:hidden">
        <div className="grid grid-cols-4 gap-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="text-center leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,255,0.96))]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <UserCircle2 className="h-7 w-7 text-primary" />
              Profile & Settings
            </DialogTitle>
            <DialogDescription>
              Review your school profile, subscription, and account actions in one place.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Card className="border-primary/10 bg-white/90 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <UserCircle2 className="h-12 w-12 text-primary" />
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground">{schoolName || "School Profile"}</p>
                  <p className="text-sm text-muted-foreground">{schoolEmail || "No email available"}</p>
                </div>
              </div>
            </Card>

            <Card className="border-primary/10 bg-white/90 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">School Information</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="school-name">School Name</Label>
                  <Input
                    id="school-name"
                    value={schoolName}
                    onChange={(event) => setSchoolName(event.target.value)}
                    placeholder="Enter school name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-type">School Type</Label>
                  <Select value={schoolType} onValueChange={setSchoolType}>
                    <SelectTrigger id="school-type">
                      <SelectValue placeholder="Select school type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOL_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-location">Location</Label>
                  <Input
                    id="school-location"
                    value={locationValue}
                    onChange={(event) => setLocationValue(event.target.value)}
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </Card>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" className="border-primary/15" onClick={() => setSettingsOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving} className="gradient-primary text-white hover:opacity-90">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
        <DialogContent className="max-w-xl rounded-[2rem] border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,255,0.96))]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <CreditCard className="h-7 w-7 text-primary" />
              Subscription
            </DialogTitle>
            <DialogDescription>
              Review your plan details and manage your billing settings.
            </DialogDescription>
          </DialogHeader>

          {subscription ? (
            <Card className="relative overflow-hidden border-primary/10 bg-white/90 p-6 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-secondary/10 to-primary/10" />
              <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-primary">
                    <CreditCard className="h-5 w-5" />
                    Subscription Status
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Plan: <span className="font-semibold">{subscription.plan_type}</span>
                  </p>
                  {subscription.expires_at && (
                    <p className="text-sm text-muted-foreground">
                      Expires: {new Date(subscription.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setSubscriptionOpen(false);
                    navigate("/billing");
                  }}
                  className="gradient-primary font-semibold text-white hover:opacity-90"
                >
                  Manage Plan
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border-primary/10 bg-white/90 p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">No active subscription details are available right now.</p>
            </Card>
          )}

          <DialogFooter>
            <Button variant="outline" className="border-primary/15" onClick={() => setSubscriptionOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out of your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of ElimuTime and returned to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Log Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardLayout;
