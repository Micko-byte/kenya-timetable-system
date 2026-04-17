import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Palette, Loader2, Filter, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { templatesApi } from "@/lib/api/templates";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import defaultTemplateImg from "@/assets/default-template.webp";
import templatePrimaryImg from "@/assets/template-primary.png";
import templateInternationalImg from "@/assets/template-international.png";
import templateHighschoolImg from "@/assets/template-highschool.png";
import templateCollegeImg from "@/assets/template-college.png";

interface Template {
  id: string;
  name: string;
  description: string;
  preview_image: string | null;
  school_type: string;
  periods_per_day: number;
  period_duration: number;
  days_per_week: number;
  start_time: string;
  end_time: string;
  break_config: any;
  structure_config: any;
}

interface TemplateSelectorProps {
  currentTemplate: string;
  schoolId: string;
  onTemplateChange: (template: string) => void;
}

export const TemplateSelector = ({
  currentTemplate,
  schoolId,
  onTemplateChange,
}: TemplateSelectorProps) => {
  const [updating, setUpdating] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [viewingTemplate, setViewingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fallbackImages: Record<string, string> = {
    lower_primary: templatePrimaryImg,
    middle_primary: templateInternationalImg,
    junior_high: templateHighschoolImg,
    senior_high: templateCollegeImg,
  };

  const resolveTemplateImage = (template: Template) =>
    template.preview_image || fallbackImages[template.school_type] || defaultTemplateImg;

  const fetchTemplates = async () => {
    try {
      const data = await templatesApi.getDeployedTemplates();
      setTemplates(data || []);
    } catch (error: any) {
      toast.error("Failed to load templates: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    if (templateId === currentTemplate) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("schools")
        .update({ timetable_template: templateId })
        .eq("id", schoolId);

      if (error) throw error;

      onTemplateChange(templateId);
      toast.success("Template updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update template");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Timetable Template
        </CardTitle>
        <CardDescription>
          Choose from admin-approved templates for your school
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No templates available yet</p>
            <p className="text-sm text-muted-foreground">Contact your administrator to deploy templates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filter Section */}
            <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="school-type-filter">Filter by School Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger id="school-type-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Templates</SelectItem>
                    <SelectItem value="lower_primary">Lower Primary (Grade 1-3)</SelectItem>
                    <SelectItem value="middle_primary">Middle Primary (Grade 4-6)</SelectItem>
                    <SelectItem value="junior_high">Junior High School (Grade 7-9)</SelectItem>
                    <SelectItem value="senior_high">Senior High School (Grade 10-12)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates
              .filter(template => filterType === "all" || template.school_type === filterType)
              .map((template) => {
              const isSelected = currentTemplate === template.id;

              return (
                <div
                  key={template.id}
                  className={`relative rounded-lg border-2 transition-all hover:shadow-md overflow-hidden ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 z-10">
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                  
                  <img
                    src={resolveTemplateImage(template)}
                    alt={template.name}
                    className="w-full h-32 object-cover"
                  />
                  
                  <div className="p-4">
                    <h3 className="font-semibold mb-1">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {template.school_type === "lower_primary" && "Lower Primary (Grade 1-3)"}
                      {template.school_type === "middle_primary" && "Middle Primary (Grade 4-6)"}
                      {template.school_type === "junior_high" && "Junior High School (Grade 7-9)"}
                      {template.school_type === "senior_high" && "Senior High School (Grade 10-12)"}
                    </p>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {template.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mb-3">
                      {template.periods_per_day} periods × {template.period_duration}min
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingTemplate(template);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      <Button
                        variant={isSelected ? "secondary" : "default"}
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSelectTemplate(template.id)}
                        disabled={isSelected || updating}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            
            {templates.filter(template => filterType === "all" || template.school_type === filterType).length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No templates found for the selected school type</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Template Details Dialog */}
      <Dialog open={!!viewingTemplate} onOpenChange={(open) => !open && setViewingTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewingTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  {viewingTemplate.name}
                </DialogTitle>
                <DialogDescription>
                  {viewingTemplate.description || "Template details and preview"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Preview Image */}
                <div className="rounded-lg overflow-hidden border">
                  <img
                    src={resolveTemplateImage(viewingTemplate)}
                    alt={viewingTemplate.name}
                    className="w-full h-64 object-cover"
                  />
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">School Type</Label>
                    <p className="font-medium mt-1">
                      {viewingTemplate.school_type === "lower_primary" && "Lower Primary"}
                      {viewingTemplate.school_type === "middle_primary" && "Middle Primary"}
                      {viewingTemplate.school_type === "junior_high" && "Junior High"}
                      {viewingTemplate.school_type === "senior_high" && "Senior High"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Periods per Day</Label>
                    <p className="font-medium mt-1">{viewingTemplate.periods_per_day}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Period Duration</Label>
                    <p className="font-medium mt-1">{viewingTemplate.period_duration} minutes</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Days per Week</Label>
                    <p className="font-medium mt-1">{viewingTemplate.days_per_week}</p>
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <div className="flex gap-4 text-sm">
                    <Badge variant="outline">Start: {viewingTemplate.start_time}</Badge>
                    <Badge variant="outline">End: {viewingTemplate.end_time}</Badge>
                  </div>
                </div>

                {/* Break Configuration */}
                {viewingTemplate.break_config && Array.isArray(viewingTemplate.break_config) && viewingTemplate.break_config.length > 0 && (
                  <div className="space-y-2">
                    <Label>Breaks</Label>
                    <div className="space-y-2">
                      {viewingTemplate.break_config.map((breakItem: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Badge>{breakItem.label || `Break ${index + 1}`}</Badge>
                          <span className="text-muted-foreground">
                            After period {breakItem.afterPeriod} • {breakItem.duration} minutes
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structure Preview */}
                {viewingTemplate.structure_config?.subjects && (
                  <div className="space-y-2">
                    <Label>Available Subjects</Label>
                    <div className="flex flex-wrap gap-2">
                      {viewingTemplate.structure_config.subjects.map((subject: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setViewingTemplate(null)}
                  >
                    Close
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleSelectTemplate(viewingTemplate.id);
                      setViewingTemplate(null);
                    }}
                    disabled={currentTemplate === viewingTemplate.id || updating}
                  >
                    {currentTemplate === viewingTemplate.id ? "Currently Selected" : "Select This Template"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
