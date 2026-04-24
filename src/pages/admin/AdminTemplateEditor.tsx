import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RotateCcw, GraduationCap, Palette, Save, ArrowLeft, Globe, Layout, Type } from 'lucide-react';
import SchoolHeader from '@/features/timetable/components/SchoolHeader';
import TimetableGridComponent from '@/features/timetable/components/TimetableGrid';
import DesignSelector from '@/features/timetable/components/DesignSelector';
import FontSelector, { FONT_OPTIONS } from '@/features/timetable/components/FontSelector';
import {
  createGridForLevel, CellData, TimetableGrid, DesignTheme,
  EducationLevel, EDUCATION_LEVELS, LEVEL_PERIODS, PeriodSlot,
  DEFAULT_DAYS, ALL_DAYS, DESIGN_THEMES
} from '@/features/timetable/lib/timetableData';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TimetableTemplate } from '@/features/timetable/types';
import AdminLayout from '@/components/AdminLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ActiveLevel = Exclude<EducationLevel, 'common'>;

export default function AdminTemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  // Template metadata
  const [name, setName] = useState('New Template');
  const [description, setDescription] = useState('');
  const [activeLevel, setActiveLevel] = useState<ActiveLevel>('eight_four_four');
  const [isFeatured, setIsFeatured] = useState(false);
  
  // Visuals
  const [theme, setTheme] = useState<DesignTheme>('classic_kenya');
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [colorless, setColorless] = useState(false);
  
  // Timetable content
  const [schoolName, setSchoolName] = useState('Sample School Name');
  const [className, setClassName] = useState('Sample Class');
  const [term, setTerm] = useState('Term 1');
  const [year, setYear] = useState('2026');
  const [days, setDays] = useState<string[]>([...DEFAULT_DAYS]);
  const [periods, setPeriods] = useState<PeriodSlot[]>([...LEVEL_PERIODS.eight_four_four]);
  const [grid, setGrid] = useState<TimetableGrid>(() => createGridForLevel('eight_four_four'));
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [rowColors, setRowColors] = useState<Record<number, string>>({});
  const [colColors, setColColors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isNew && id) {
      fetchTemplate(id);
    }
  }, [id, isNew]);

  const fetchTemplate = async (templateId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('timetable_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      const t = data as TimetableTemplate;
      
      setName(t.name);
      setDescription(t.description || '');
      setActiveLevel(t.level as ActiveLevel);
      setIsFeatured(t.is_featured);
      setTheme(t.design);
      setFontFamily(t.font_family);
      setDays(t.days);
      setPeriods(t.periods);
      setGrid(t.grid_json);
      setCustomSubjects(t.custom_subjects);
      setRowColors(t.row_colors);
      setColColors(t.col_colors);
      
      // Note: theme_config is partially derived from the design key in the generator logic, 
      // but we store it as a snapshot in DB.
    } catch (error) {
      console.error('Error fetching template:', error);
      toast({ title: 'Error', description: 'Failed to load template.', variant: 'destructive' });
      navigate('/admin/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish = false) => {
    setSaving(true);
    try {
      const themeConfig = DESIGN_THEMES[theme];
      const templateData = {
        name,
        description,
        level: activeLevel,
        design: theme,
        font_family: fontFamily,
        days,
        periods,
        grid_json: grid,
        custom_subjects: customSubjects,
        row_colors: rowColors,
        col_colors: colColors,
        theme_config: themeConfig,
        is_featured: isFeatured,
        status: publish ? 'published' : 'draft',
        updated_at: new Date().toISOString(),
      };

      if (publish) {
        (templateData as any).published_at = new Date().toISOString();
        // In a real system, we'd also bump version and snapshot to versions table here
      }

      let error;
      if (isNew) {
        const { data, error: insertError } = await supabase
          .from('timetable_templates')
          .insert([templateData])
          .select();
        error = insertError;
        if (!error && data) {
          toast({ title: 'Created', description: 'Template created successfully.' });
          navigate(`/admin/templates/${data[0].id}/edit`);
        }
      } else {
        const { error: updateError } = await supabase
          .from('timetable_templates')
          .update(templateData)
          .eq('id', id);
        error = updateError;
        if (!error) {
          toast({ title: 'Saved', description: publish ? 'Template published!' : 'Changes saved.' });
        }
      }

      if (error) throw error;
    } catch (error) {
      console.error('Error saving template:', error);
      toast({ title: 'Error', description: 'Failed to save template.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCellChange = useCallback((dayIdx: number, periodIdx: number, data: CellData) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[dayIdx][periodIdx] = data;
      return next;
    });
  }, []);

  const handlePeriodChange = useCallback((periodIdx: number, slot: PeriodSlot) => {
    setPeriods((prev) => {
      const next = [...prev];
      next[periodIdx] = slot;
      return next;
    });
  }, []);

  const addPeriod = () => {
    const nextIndex = periods.length + 1;
    const newSlot: PeriodSlot = { time: `Period ${nextIndex}`, label: `Lesson ${nextIndex}` };
    setPeriods((prev) => [...prev, newSlot]);
    setGrid((prev) => prev.map((row) => [...row, { subject: '', teacher: '' }]));
  };

  const removePeriod = () => {
    if (periods.length <= 1) return;
    setPeriods((prev) => prev.slice(0, -1));
    setGrid((prev) => prev.map((row) => row.slice(0, -1)));
  };

  const addDay = () => {
    const available = ALL_DAYS.filter((day) => !days.includes(day));
    if (available.length === 0) return;
    const newDay = available[0];
    setDays((prev) => [...prev, newDay]);
    setGrid((prev) => [...prev, periods.map(() => ({ subject: '', teacher: '' }))]);
  };

  const removeDay = (index: number) => {
    if (days.length <= 1) return;
    setDays((prev) => prev.filter((_, idx) => idx !== index));
    setGrid((prev) => prev.filter((_, idx) => idx !== index));
  };

  const switchLevel = (level: ActiveLevel) => {
    if (!confirm('Switching levels will reset the current grid. Continue?')) return;
    setActiveLevel(level);
    const newPeriods = [...LEVEL_PERIODS[level]];
    setPeriods(newPeriods);
    setGrid(createGridForLevel(level, newPeriods));
    toast({ title: 'Level Switched', description: `Loaded ${EDUCATION_LEVELS[level].label} defaults.` });
  };

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading editor...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20">
        {/* Header Actions */}
        <div className="flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-md py-3 border-b mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/templates')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h1 className="text-xl font-bold">{isNew ? 'New Template' : `Editing: ${name}`}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> Save Draft
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} className="bg-green-600 hover:bg-green-700">
              <Globe className="w-4 h-4 mr-2" /> Publish Template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Controls */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-4 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2"><Layout className="w-4 h-4" /> Template Details</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Primary Classic" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="desc">Description</Label>
                  <textarea 
                    id="desc" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full h-20 text-xs p-2 rounded border border-input bg-background"
                    placeholder="Describe this design..."
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                   <input 
                    type="checkbox" 
                    id="featured" 
                    checked={isFeatured} 
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                   />
                   <Label htmlFor="featured" className="text-xs cursor-pointer">Feature this template in gallery</Label>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Education Level</h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(EDUCATION_LEVELS) as ActiveLevel[]).filter(k => k !== 'common').map((key) => (
                  <button
                    key={key}
                    onClick={() => switchLevel(key)}
                    className={`text-[10px] p-2 rounded border text-left transition-all ${
                      activeLevel === key ? 'border-primary bg-primary/5 font-bold' : 'border-border hover:bg-muted'
                    }`}
                  >
                    {EDUCATION_LEVELS[key].emoji} {EDUCATION_LEVELS[key].label.split('(')[0]}
                  </button>
                ))}
              </div>
            </Card>

            <DesignSelector
              theme={theme}
              onThemeChange={setTheme}
              days={days}
              canAddDay={days.length < ALL_DAYS.length}
              onAddDay={addDay}
              onRemoveDay={removeDay}
            />
            
            <Card className="p-4 space-y-4">
               <h3 className="font-bold text-sm flex items-center gap-2"><Type className="w-4 h-4" /> Typography</h3>
               <FontSelector value={fontFamily} onChange={setFontFamily} />
            </Card>
          </div>

          {/* Main Editor Canvas */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-2">
               <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="xs" onClick={addPeriod}>
                    <Plus className="w-3 h-3 mr-1" /> Add Period
                  </Button>
                  <Button variant="outline" size="xs" onClick={removePeriod} disabled={periods.length <= 1}>
                    <X className="w-3 h-3 mr-1" /> Remove Period
                  </Button>
                  <Button variant="outline" size="xs" onClick={() => setColorless(!colorless)} className={colorless ? 'bg-foreground text-background' : ''}>
                    <Palette className="w-3 h-3 mr-1" /> {colorless ? 'B&W Mode' : 'Color Mode'}
                  </Button>
               </div>
               <div className="flex gap-2">
                  <Button variant="ghost" size="xs" onClick={() => {
                    setGrid(createGridForLevel(activeLevel, periods));
                    toast({ title: 'Grid Reset' });
                  }}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Reset Grid
                  </Button>
               </div>
            </div>

            <div
              id="template-canvas"
              className="bg-card rounded-xl shadow-2xl border border-border overflow-hidden ring-1 ring-black/5"
              style={{ fontFamily }}
            >
              <SchoolHeader
                schoolName={schoolName}
                className={className}
                term={term}
                year={year}
                onSchoolNameChange={setSchoolName}
                onClassNameChange={setClassName}
                onTermChange={setTerm}
                onYearChange={setYear}
                theme={theme}
              />
              <div className="p-2">
                <TimetableGridComponent
                  grid={grid}
                  days={days}
                  periods={periods}
                  onCellChange={handleCellChange}
                  onPeriodChange={handlePeriodChange}
                  theme={theme}
                  customSubjects={customSubjects}
                  colorless={colorless}
                  rowColors={rowColors}
                  colColors={colColors}
                  onRowColorChange={(idx, c) => setRowColors(prev => ({ ...prev, [idx]: c }))}
                  onColColorChange={(idx, c) => setColColors(prev => ({ ...prev, [idx]: c }))}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
