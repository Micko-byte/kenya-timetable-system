import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Bell, UserPlus, FileText, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  metadata: any;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "school_registration":
      return <UserPlus className="w-4 h-4" />;
    case "timetable_generation":
      return <FileText className="w-4 h-4" />;
    case "subscription_upgrade":
      return <TrendingUp className="w-4 h-4" />;
    case "subscription_downgrade":
      return <TrendingDown className="w-4 h-4" />;
    case "error":
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case "school_registration":
      return "bg-green-500/10 text-green-500";
    case "timetable_generation":
      return "bg-blue-500/10 text-blue-500";
    case "subscription_upgrade":
      return "bg-purple-500/10 text-purple-500";
    case "subscription_downgrade":
      return "bg-orange-500/10 text-orange-500";
    case "error":
      return "bg-red-500/10 text-red-500";
    default:
      return "bg-gray-500/10 text-gray-500";
  }
};

export const ActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          setActivities(prev => [payload.new as Activity, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-start gap-3">
                <div className="w-8 h-8 bg-secondary rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Real-Time Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {activity.metadata?.status && (
                    <Badge variant={activity.metadata.status === "success" ? "default" : "destructive"}>
                      {activity.metadata.status}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
