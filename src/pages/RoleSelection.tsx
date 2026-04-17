import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, Shield } from "lucide-react";
import { toast } from "sonner";

const RoleSelection = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role from database
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (!roleData) {
        navigate("/dashboard");
        return;
      }

      setEmail(user.email || "");
    };

    checkUser();
  }, [navigate]);

  const handleSelection = (role: "user" | "admin") => {
    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
    toast.success(`Redirecting to ${role} portal`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <Card className="w-full max-w-2xl p-8 shadow-2xl animate-scale-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2">Notify Tech Group</h1>
          <p className="text-muted-foreground text-center">
            Welcome, {email}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Select your portal
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => handleSelection("user")}
            className="group relative overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-all duration-300 p-8 bg-card hover:bg-accent/50"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">User Portal</h3>
              <p className="text-sm text-muted-foreground text-center">
                Access school management and timetable generation
              </p>
            </div>
          </button>

          <button
            onClick={() => handleSelection("admin")}
            className="group relative overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-all duration-300 p-8 bg-card hover:bg-accent/50"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Admin Dashboard</h3>
              <p className="text-sm text-muted-foreground text-center">
                Manage templates, users, and system settings
              </p>
            </div>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default RoleSelection;
