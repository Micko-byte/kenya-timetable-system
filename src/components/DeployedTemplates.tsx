import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { templatesApi } from '@/lib/api/templates';
import type { Template } from '@/lib/api/templates';
import { Eye, Loader2 } from 'lucide-react';

export const DeployedTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeployedTemplates();
  }, []);

  const loadDeployedTemplates = async () => {
    try {
      const data = await templatesApi.getDeployedTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load deployed templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No templates are currently deployed. Please check back later.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <Card key={template.id} className="overflow-hidden">
          <div className="relative">
            {(template.preview_image || template.content?.preview_image) ? (
              <img
                src={template.preview_image ?? template.content.preview_image}
                alt={template.name}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-secondary flex items-center justify-center">
                <Eye className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>

          <CardHeader>
            <CardTitle>{template.name}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {template.description ?? template.content?.description}
            </div>

            {template.type === 'graphical' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-1">
                  {(((template.structure_config as Record<string, unknown> | null)?.subjects as string[] | undefined) || template.content?.days || []).map((day: string, dayIndex: number) => (
                    <div
                      key={dayIndex}
                      className="text-xs font-medium p-1 bg-primary/10 rounded text-center"
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Periods per day:</span>
                  <span>{template.periods_per_day ?? template.content?.periods_per_day}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{(template.period_duration ?? template.content?.period_duration) ?? '-'}min</span>
                </div>
              </div>
            )}

            <Button className="w-full" variant="outline">
              View Template
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
