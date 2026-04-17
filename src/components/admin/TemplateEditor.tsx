import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BreakConfig {
  afterPeriod: number;
  duration: number;
  label: string;
}

interface TemplateEditorProps {
  template?: any;
  onSave: () => void;
  onCancel: () => void;
}

export const TemplateEditor = ({ template, onSave, onCancel }: TemplateEditorProps) => {
  const [name, setName] = useState(template?.name || "");
  const [schoolType, setSchoolType] = useState(template?.school_type || "lower_primary");
  const [description, setDescription] = useState(template?.description || "");
  const [periodsPerDay, setPeriodsPerDay] = useState(template?.periods_per_day || 8);
  const [periodDuration, setPeriodDuration] = useState(template?.period_duration || 40);
  const [daysPerWeek, setDaysPerWeek] = useState(template?.days_per_week || 5);
  const [startTime, setStartTime] = useState(template?.start_time || "08:00");
  const [endTime, setEndTime] = useState(template?.end_time || "16:00");
  const [breaks, setBreaks] = useState<BreakConfig[]>(template?.break_config || []);
  const [subjects, setSubjects] = useState<string[]>(template?.structure_config?.subjects || ["Mathematics", "English", "Science"]);
  const [saving, setSaving] = useState(false);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].slice(0, daysPerWeek);

  const addBreak = () => {
    setBreaks([...breaks, { afterPeriod: 2, duration: 15, label: "Break" }]);
  };

  const removeBreak = (index: number) => {
    setBreaks(breaks.filter((_, i) => i !== index));
  };

  const updateBreak = (index: number, field: keyof BreakConfig, value: any) => {
    const newBreaks = [...breaks];
    newBreaks[index] = { ...newBreaks[index], [field]: value };
    setBreaks(newBreaks);
  };

  const addSubject = () => {
    setSubjects([...subjects, ""]);
  };

  const removeSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const updateSubject = (index: number, value: string) => {
    const newSubjects = [...subjects];
    newSubjects[index] = value;
    setSubjects(newSubjects);
  };

  const handleSave = async () => {
    if (!name || !schoolType || subjects.some(s => !s)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        name,
        school_type: schoolType,
        description,
        periods_per_day: periodsPerDay,
        period_duration: periodDuration,
        days_per_week: daysPerWeek,
        start_time: startTime,
        end_time: endTime,
        break_config: JSON.parse(JSON.stringify(breaks)),
        structure_config: JSON.parse(JSON.stringify({
          subjects,
          days,
          periods: Array.from({ length: periodsPerDay }, (_, i) => `Period ${i + 1}`)
        })),
        // default to draft on create, preserve existing flags when editing
        is_deployed: template?.is_deployed ?? false,
        is_active: template?.is_active ?? true
      };

      if (template?.id) {
        const { error } = await supabase
          .from("templates")
          .update(templateData)
          .eq("id", template.id);

        if (error) throw error;
        toast.success("Template updated successfully!");
      } else {
        const { error } = await supabase
          .from("templates")
          .insert([templateData]);

        if (error) throw error;
        toast.success("Template created successfully!");
      }

      onSave();
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Template Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Primary School Standard"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolType">School Type *</Label>
              <Select value={schoolType} onValueChange={setSchoolType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lower_primary">Lower Primary (Grade 1-3)</SelectItem>
                  <SelectItem value="middle_primary">Middle Primary (Grade 4-6)</SelectItem>
                  <SelectItem value="junior_high">Junior High School (Grade 7-9)</SelectItem>
                  <SelectItem value="senior_high">Senior High School (Grade 10-12)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this template..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periods">Periods/Day</Label>
              <Input
                id="periods"
                type="number"
                min="1"
                max="12"
                value={periodsPerDay}
                onChange={(e) => setPeriodsPerDay(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="120"
                value={periodDuration}
                onChange={(e) => setPeriodDuration(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="days">Days/Week</Label>
              <Input
                id="days"
                type="number"
                min="5"
                max="7"
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Days</Label>
              <div className="text-sm text-muted-foreground pt-2">{days.join(", ")}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start Time
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                End Time
              </Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Break Configuration</CardTitle>
            <Button onClick={addBreak} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Break
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {breaks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No breaks configured</p>
          ) : (
            breaks.map((br, index) => (
              <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={br.label}
                    onChange={(e) => updateBreak(index, "label", e.target.value)}
                    placeholder="e.g., Morning Break"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>After Period</Label>
                  <Input
                    type="number"
                    min="1"
                    max={periodsPerDay - 1}
                    value={br.afterPeriod}
                    onChange={(e) => updateBreak(index, "afterPeriod", parseInt(e.target.value))}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Duration (min)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    value={br.duration}
                    onChange={(e) => updateBreak(index, "duration", parseInt(e.target.value))}
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeBreak(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Subjects</CardTitle>
            <Button onClick={addSubject} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((subject, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={subject}
                  onChange={(e) => updateSubject(index, e.target.value)}
                  placeholder="Subject name"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSubject(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="border p-2 bg-secondary text-left font-semibold">Day/Period</th>
                  {Array.from({ length: periodsPerDay }, (_, i) => (
                    <th key={i} className="border p-2 bg-secondary text-center font-semibold">
                      P{i + 1}
                      <div className="text-xs text-muted-foreground font-normal">
                        {periodDuration}min
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day} className="border-b hover:bg-secondary/50">
                    <td className="border p-2 font-semibold">{day}</td>
                    {Array.from({ length: periodsPerDay }, (_, i) => (
                      <td key={i} className="border p-2 text-center text-sm text-muted-foreground">
                        {subjects[i % subjects.length] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : template?.id ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </div>
  );
};
