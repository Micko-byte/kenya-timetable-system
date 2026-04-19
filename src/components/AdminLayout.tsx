import { ReactNode, useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  School,
  FileText,
  Calendar,
  CreditCard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    const checkAdminAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }

      setAdminEmail(user.email || "");
    };

    checkAdminAccess();
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
      path: "/admin",
    },
    {
      icon: Users,
      label: "Users",
      path: "/admin/users",
    },
    {
      icon: School,
      label: "Schools",
      path: "/admin/schools",
    },
    {
      icon: FileText,
      label: "Templates",
      path: "/admin/templates",
    },
    {
      icon: Calendar,
      label: "Timetables",
      path: "/admin/timetables",
    },
    {
      icon: CreditCard,
      label: "Billing",
      path: "/admin/billing",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_24%),radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.08),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,255,0.96))]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <div className="flex items-center gap-3">
              <img src={logo} alt="ElimuTime logo" className="h-12 w-auto object-contain flex-shrink-0" />
              <div>
                <h1 className="text-xl font-bold text-primary">Admin Portal</h1>
                <p className="text-xs text-muted-foreground">ElimuTime</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-[hsl(var(--primary)/0.2)]"
                      : "hover:bg-accent/10"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {adminEmail}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 border-primary/20 hover:bg-primary/5">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-primary/10 bg-background p-4 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent/10"
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-8 px-4">{children}</main>
    </div>
  );
};

export default AdminLayout;
