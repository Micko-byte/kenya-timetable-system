import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Trash2, Shield, User, Mail, Calendar, Building2, Pencil } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { isAdminEmail } from "@/lib/adminEmails";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  school_id: string;
  schools: { name: string };
}

/** Calls the admin-user-action edge function with the caller's session token. */
async function callAdminAction(action: "update" | "delete", payload: Record<string, unknown>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session expired. Please sign in again.");

  const { data, error } = await supabase.functions.invoke("admin-user-action", {
    body: { action, ...payload },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    // Surface the function's own error message when present.
    const detail = (data as { error?: string } | null)?.error;
    throw new Error(detail || error.message || "Action failed.");
  }
  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error?: string }).error);
  }
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*, schools(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers((profiles || []) as UserProfile[]);
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
      await callAdminAction("delete", { userId: deleteId });
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to delete user: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const openEdit = (user: UserProfile) => {
    setEditUser(user);
    setEditName(user.full_name || "");
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      await callAdminAction("update", { userId: editUser.id, fullName: editName.trim() });
      toast.success("User updated");
      setEditUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to update user: " + error.message);
    } finally {
      setSaving(false);
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
                        {isAdminEmail(user.email) && (
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openEdit(user)}
                          disabled={isAdminEmail(user.email)}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => setDeleteId(user.id)}
                          disabled={isAdminEmail(user.email)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Edit User */}
        <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Email: {editUser?.email}</p>
                <p>School: {editUser?.schools?.name || "No School Assigned"}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
