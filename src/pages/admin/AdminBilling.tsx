import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign, TrendingUp, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface SubscriptionData {
  id: string;
  school_id: string;
  plan_type: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  school_name?: string;
}

const AdminBilling = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(
          `
          *,
          schools(name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((sub) => ({
        ...sub,
        school_name: (sub.schools as any)?.name || "Unknown",
      }));

      setSubscriptions(formattedData || []);
    } catch (error: any) {
      toast.error("Failed to fetch subscriptions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter((sub) =>
    sub.school_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === "active"
  ).length;
  const freeTrialCount = subscriptions.filter(
    (sub) => sub.plan_type === "free_trial"
  ).length;
  const paidPlans = subscriptions.filter(
    (sub) => sub.plan_type !== "free_trial" && sub.status === "active"
  ).length;
  
  // Calculate MRR (assuming basic pricing structure)
  const planPricing: Record<string, number> = {
    basic: 199,
    premium: 499,
    enterprise: 1299,
  };
  
  const mrr = subscriptions.reduce((total, sub) => {
    if (sub.status === "active" && sub.plan_type !== "free_trial") {
      return total + (planPricing[sub.plan_type] || 0);
    }
    return total;
  }, 0);
  
  const arr = mrr * 12;
  const avgRevenuePerUser = paidPlans > 0 ? mrr / paidPlans : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            Billing & Subscriptions
          </h1>
          <p className="text-muted-foreground">
            Manage all school subscriptions and billing
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  ${mrr.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Monthly Recurring Revenue
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  ${arr.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Annual Recurring Revenue</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {activeSubscriptions}
                </p>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {freeTrialCount} trials, {paidPlans} paid
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  ${avgRevenuePerUser.toFixed(0)}
                </p>
                <p className="text-sm text-muted-foreground">ARPU</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg Revenue Per User
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions by school..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Subscriptions Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Plan Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires At</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No subscriptions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      {sub.school_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sub.plan_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === "active" ? "default" : "secondary"
                        }
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.expires_at
                        ? new Date(sub.expires_at).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {new Date(sub.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBilling;
