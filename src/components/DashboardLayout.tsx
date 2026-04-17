import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import {
  GraduationCap,
  LogOut,
  Menu,
  Users,
  BookOpen,
  Calendar,
  LayoutDashboard,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [schoolName, setSchoolName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchSchoolData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id, schools(name)")
        .eq("id", user.id)
        .single();

      if (profile?.schools) {
        setSchoolName((profile.schools as any).name);
      }
    };

    fetchSchoolData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/dashboard",
    },
    { icon: BookOpen, label: "Streams & Classes", path: "/streams" },
    { icon: Users, label: "Teachers", path: "/teachers" },
    { icon: Calendar, label: "Timetables", path: "/timetables" },
  ];

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
      style={{
        fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans"',
      }}
    >
      <style>{`
        h1, h2, h3, h4, h5, h6, .heading {
          font-family: Raleway, sans-serif;
          color: #000000;
        }
        p, span, div, body, a, button {
          color: #000000;
        }
      `}</style>
      {/* White Background */}
      <div className="fixed inset-0 -z-10 bg-white" />

      {/* Sidebar */}
<aside
  className={`fixed left-0 top-0 h-screen w-60 bg-[#0D3C44] text-white flex flex-col z-40 transition-transform duration-300 ${
    sidebarOpen ? "translate-x-0" : "-translate-x-full"
  } md:translate-x-0`}
>
  {/* Logo Section */}
  <div className="p-6 border-b border-white/10">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 bg-[#FACC15] rounded-full flex items-center justify-center">
        <GraduationCap className="w-6 h-6 text-[#0D3C44]" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-white">{schoolName}</h1>
        <p className="text-base text-white font-bold">ElimuTime</p>
      </div>
    </div>
  </div>

  {/* Navigation Items */}
  <nav className="flex-1 py-4 pl-4 space-y-4">
    {menuItems.map((item) => (
      <div key={item.path} className="relative">
        <button
          onClick={() => {
            navigate(item.path);
            setSidebarOpen(false);
          }}
          className={`flex items-center gap-4 w-full px-4 py-3 rounded-l-full transition-all duration-300 group relative ${
            location.pathname === item.path
              ? "bg-white font-semibold"
              : "text-white hover:bg-white/40 rounded-lg"
          }`}
        >
          <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${
            location.pathname === item.path 
              ? "text-primary" 
              : "text-white group-hover:text-primary"
          }`} />
          <span className={`font-normal text-sm transition-colors ${
            location.pathname === item.path 
              ? "text-primary" 
              : "text-white group-hover:text-primary"
          }`}>
            {item.label}
          </span>
        </button>
        
 {/* Top rounded cutout */}
{location.pathname === item.path && (
  <>
    <div className="absolute -top-4 right-0 w-4 h-4 bg-transparent">
      <div className="w-full h-full bg-[#0D3C44] rounded-r-lg"></div>
    </div>
    {/* Bottom rounded cutout */}
    <div className="absolute -bottom-4 right-0 w-4 h-4 bg-transparent">
      <div className="w-full h-full bg-[#0D3C44] rounded-r-lg"></div>
    </div>
  </>
)}


      </div>
    ))}
  </nav>

  {/* Logout Button */}
  <div className="p-4 border-t border-white/10">
    <Button
      onClick={handleLogout}
      className="w-full justify-start gap-3 bg-[#FACC15] text-[#00000] hover:bg-white/40 hover:text-white font-semibold text-base rounded-full"
    >
      <LogOut className="w-5 h-5" />
      Logout
    </Button>
  </div>
</aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-60 w-full md:w-auto">
        {/* Top Bar with Menu Toggle */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b shadow-sm md:hidden">
          <div className="px-4 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
            <div className="text-center">
              <h2 className="text-sm font-bold text-white">{schoolName}</h2>
              <p className="text-xs text-muted-foreground">ElimuTime</p>
            </div>
            <div className="w-9" />
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl p-6 md:p-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;