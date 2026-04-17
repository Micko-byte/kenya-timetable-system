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
import { Search, Calendar, School } from "lucide-react";
import { toast } from "sonner";

interface TimetableData {
  id: string;
  school_id: string;
  stream_id: string;
  template_id: string | null;
  template_type: string | null;
  generated_by: string | null;
  generated_at: string;
  school_name?: string;
  stream_name?: string;
  templates?: {
    id: string;
    name: string;
  } | null;
}

const AdminTimetables = () => {
  const [timetables, setTimetables] = useState<TimetableData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    setLoading(true);
    try {
      const { data: timetablesData, error } = await supabase
        .from("timetables")
        .select(
          `
          *,
          schools(name),
          streams(stream_name, grade),
          templates(id, name)
        `
        )
        .order("generated_at", { ascending: false });

      if (error) throw error;

      const formattedData = timetablesData?.map((tt) => ({
        ...tt,
        school_name: (tt.schools as any)?.name || "Unknown",
        stream_name: `Grade ${(tt.streams as any)?.grade} - ${
          (tt.streams as any)?.stream_name
        }`,
      }));

      setTimetables(formattedData || []);
    } catch (error: any) {
      toast.error("Failed to fetch timetables: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTimetables = timetables.filter(
    (tt) =>
      tt.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tt.stream_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            Timetable Management
          </h1>
          <p className="text-muted-foreground">
            View all generated timetables across schools
          </p>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search timetables by school or stream..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">
                  {timetables.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Timetables
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <School className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">
                  {new Set(timetables.map((tt) => tt.school_id)).size}
                </p>
                <p className="text-sm text-muted-foreground">
                  Schools with Timetables
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">
                  {
                    timetables.filter(
                      (tt) =>
                        new Date(tt.generated_at) >
                        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length
                  }
                </p>
                <p className="text-sm text-muted-foreground">This Week</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Timetables Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Generated By</TableHead>
                <TableHead>Generated At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTimetables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No timetables found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTimetables.map((tt) => (
                  <TableRow key={tt.id}>
                    <TableCell className="font-medium">
                      {tt.school_name}
                    </TableCell>
                    <TableCell>{tt.stream_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tt.templates?.name || tt.template_type || "Classic"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge>{tt.generated_by || "AI"}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(tt.generated_at).toLocaleDateString()}
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

export default AdminTimetables;
