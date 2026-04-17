import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Trash2, Shield, User, Mail, Calendar, Building2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  school_id: string;
  schools: { name: string };
  user_roles: { role: string }[];
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*, schools(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user roles separately
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);

          return {
            ...profile,
            user_roles: roles || [],
          };
        })
      );

      setUsers(usersWithRoles as UserProfile[]);
    } catch (error: any) {
      toast.error("Failed to load users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(deleteId);
      if (error) throw error;

      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to delete user: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.4,
      },
    }),
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header with glow effect */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-lg blur-lg opacity-30 glow" />
          <div className="relative bg-card p-6 rounded-lg">
            <h1 className="text-4xl font-bold gradient-text mb-2">
              User Management
            </h1>
            <p className="text-muted-foreground">
              Manage all platform users and their access
            </p>
          </div>
        </motion.div>

        {/* Search Bar with shimmer */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4 shimmer">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Badge variant="secondary" className="px-4">
                {filteredUsers.length} users
              </Badge>
            </div>
          </Card>
        </motion.div>

        {/* User Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-48 bg-secondary rounded" />
              </Card>
            ))}
          </div>
        ) : (
          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user, i) => (
                <motion.div
                  key={user.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <Card className="p-6 relative overflow-hidden group card-hover">
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 space-y-4">
                      {/* User Avatar & Role */}
                      <div className="flex items-start justify-between">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center float">
                          <User className="w-8 h-8 text-white" />
                        </div>
                        {user.user_roles?.[0]?.role === "admin" && (
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-foreground">
                          {user.full_name}
                        </h3>
                        
                        {/* School Badge - Prominent Display */}
                        <div className="p-3 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <Building2 className="w-4 h-4" />
                            {user.schools?.name || "No School Assigned"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => setDeleteId(user.id)}
                          disabled={user.user_roles?.[0]?.role === "admin"}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure? This will permanently delete the user and all their data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AdminLayout>
  );
};

export default AdminUsers;
