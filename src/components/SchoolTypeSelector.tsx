import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

const SCHOOL_TYPES = [
  { value: "primary", label: "Primary School" },
  { value: "secondary", label: "High School / Secondary" },
  { value: "college", label: "College" },
  { value: "university", label: "University" },
  { value: "training", label: "Training Institute" },
  { value: "international", label: "International School" },
];

export const SchoolTypeSelector = () => {
  const [schoolType, setSchoolType] = useState<string>("primary");
  const [location, setLocation] = useState<string>("");
  const [schoolId, setSchoolId] = useState<string>("");

  useEffect(() => {
    fetchSchoolInfo();
  }, []);

  const fetchSchoolInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (profile) {
      setSchoolId(profile.school_id);
      
      const { data: school } = await supabase
        .from("schools")
        .select("type, location")
        .eq("id", profile.school_id)
        .single();

      if (school) {
        setSchoolType(school.type || "primary");
        setLocation(school.location || "");
      }
    }
  };

  const handleUpdate = async (field: string, value: string) => {
    const { error } = await supabase
      .from("schools")
      .update({ [field]: value })
      .eq("id", schoolId);

    if (error) {
      toast.error(`Failed to update ${field}`);
    } else {
      toast.success("School information updated");
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">School Information</h3>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="school-type">School Type</Label>
          <Select 
            value={schoolType} 
            onValueChange={(value) => {
              setSchoolType(value);
              handleUpdate("type", value);
            }}
          >
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
          <Label htmlFor="location">Location (Optional)</Label>
          <Input
            id="location"
            placeholder="City, Country"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onBlur={(e) => handleUpdate("location", e.target.value)}
          />
        </div>
      </div>
    </Card>
  );
};
