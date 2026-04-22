import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Palette, Plus, Edit, Trash2, Archive, Globe, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TimetableTemplate } from '@/features/timetable/types';
import { EDUCATION_LEVELS } from '@/features/timetable/lib/timetableData';

const AdminTemplates = () => {
  const [templates, setTemplates] = useState<TimetableTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('timetable_templates')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({ title: 'Error', description: 'Failed to load templates.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const { error } = await supabase.from('timetable_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates(templates.filter(t => t.id !== id));
      toast({ title: 'Deleted', description: 'Template removed successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete template.', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-primary flex items-center gap-2'>
              <Palette className='w-7 h-7' />
              Template Management
            </h1>
            <p className='text-muted-foreground'>Manage master designs and education levels</p>
          </div>
          <Button onClick={() => navigate('/admin/templates/new')} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Template
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Card key={i} className="h-64 animate-pulse bg-muted" />)}
          </div>
        ) : templates.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <p className="text-muted-foreground">No templates found. Create your first design!</p>
            <Button onClick={() => navigate('/admin/templates/new')}>Create Template</Button>
          </Card>
        ) : (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {templates.map((template) => (
              <Card key={template.id} className='p-5 flex flex-col'>
                {/* Header Preview */}
                <div 
                  className={`h-24 rounded-lg flex flex-col items-center justify-center mb-4 ${template.theme_config.headerBg} ${template.theme_config.headerText} ${template.theme_config.accent}`}
                >
                  <span className="text-xs opacity-80">{template.design.replace('_', ' ').toUpperCase()}</span>
                  <span className="font-bold">{template.name}</span>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className='font-semibold'>{template.name}</h3>
                      <p className='text-xs text-muted-foreground line-clamp-2'>{template.description || 'No description provided.'}</p>
                    </div>
                    <Badge variant={template.status === 'published' ? 'default' : 'secondary'}>
                      {template.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {EDUCATION_LEVELS[template.level]?.label || template.level}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      v{template.version}
                    </Badge>
                    {template.is_featured && (
                      <Badge className="bg-yellow-500 text-black text-[10px] hover:bg-yellow-600">FEATURED</Badge>
                    )}
                  </div>
                </div>

                <div className='flex items-center justify-between mt-6 pt-4 border-t gap-2'>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/templates/${template.id}/edit`)}>
                      <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(template.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    {template.status !== 'published' ? (
                      <Button variant="ghost" size="sm" className="text-green-600">
                        <Globe className="w-3.5 h-3.5 mr-1" /> Publish
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm">
                        <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTemplates;
