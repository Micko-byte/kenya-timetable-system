import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Palette, Eye } from 'lucide-react';
import { DESIGN_THEMES, type DesignTheme } from '@/lib/timetableData';

// Sample data for preview
const SAMPLE_SUBJECTS = ['Math', 'English', 'Science', 'History', 'Art', 'PE'];
const SAMPLE_TEACHERS = ['Mr. Smith', 'Ms. Jones', 'Mr. Kimani', 'Mrs. Wanjiku', 'Mr. Omondi', 'Ms. Achieng'];

// Mini timetable preview component
function MiniTimetablePreview({ theme, templateId }: { theme: typeof DESIGN_THEMES[DesignTheme]; templateId: DesignTheme }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const periods = [1, 2, 3, 4, 5];

  return (
    <div className="w-full overflow-hidden rounded border text-xs">
      <div className={`${theme.headerBg} ${theme.headerText} px-2 py-1 font-semibold text-center`}>
        Sample Timetable Preview
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className={theme.headerBg.replace('bg-gradient-to-r', '').replace('from-black', 'bg-gray-800').replace('from-blue-600', 'bg-blue-600').replace('from-purple-600', 'bg-purple-600').replace('from-orange-500', 'bg-orange-500').replace('from-gray-900', 'bg-gray-900').replace('from-slate-700', 'bg-slate-700')}>
            <th className={`border p-1 ${theme.headerText}`}>Day</th>
            {periods.map((p) => (
              <th key={p} className={`border p-1 ${theme.headerText}`}>P{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, dayIdx) => (
            <tr key={day} style={{ backgroundColor: dayIdx % 2 === 0 ? 'white' : '#f9fafb' }}>
              <td className="border p-1 font-medium bg-gray-50">{day}</td>
              {periods.map((period, periodIdx) => {
                const subjectIdx = (dayIdx + periodIdx) % SAMPLE_SUBJECTS.length;
                const cellBg = theme.palette[subjectIdx % theme.palette.length];
                const isMonochrome = templateId === 'monochrome';
                return (
                  <td
                    key={period}
                    className="border p-1 text-center"
                    style={{
                      backgroundColor: isMonochrome ? 'white' : cellBg + '20',
                      color: isMonochrome ? 'black' : cellBg
                    }}
                  >
                    <div className="font-medium truncate">{SAMPLE_SUBJECTS[subjectIdx]}</div>
                    <div className="text-[8px] truncate opacity-70">{SAMPLE_TEACHERS[subjectIdx]}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type LocalTemplate = {
  id: DesignTheme;
  name: string;
  description: string;
  theme: DesignTheme;
};

const LOCAL_TEMPLATES: LocalTemplate[] = [
  { id: 'monochrome', name: 'Monochrome (B&W)', description: 'Clean black and white. Perfect for printing.', theme: 'monochrome' },
  { id: 'kenyan', name: 'Kenyan Flag', description: 'Black, red, green with Maasai shield pattern.', theme: 'kenyan' },
  { id: 'classic', name: 'Classic Kenya', description: 'Traditional Kenyan school colors.', theme: 'classic' },
  { id: 'modern', name: 'Modern Glass', description: 'Blue gradient with glass effect.', theme: 'modern' },
  { id: 'vibrant', name: 'Vibrant Colors', description: 'Orange, red, pink energetic gradient.', theme: 'vibrant' },
  { id: 'midnight', name: 'Midnight Black', description: 'Dark mode with sleek blacks.', theme: 'midnight' },
  { id: 'slate', name: 'Slate Pro', description: 'Professional slate gray.', theme: 'slate' },
];

const AdminTemplates = () => {
  return (
    <AdminLayout>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-primary flex items-center gap-2'>
              <Palette className='w-7 h-7' />
              Template Management
            </h1>
            <p className='text-muted-foreground'>7 built-in visual themes for timetables</p>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {LOCAL_TEMPLATES.map((template) => {
            const theme = DESIGN_THEMES[template.theme];
            return (
              <Card key={template.id} className='p-5 space-y-4'>
                {/* Header Preview */}
                <div className={`h-16 rounded-lg flex items-center justify-center text-lg font-bold ${theme.headerBg} ${theme.headerText}`}>
                  {theme.name}
                </div>

                {/* Template Info */}
                <div>
                  <h3 className='font-semibold text-lg'>{template.name}</h3>
                  <p className='text-sm text-muted-foreground'>{template.description}</p>
                </div>

                {/* Full Timetable Preview */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    <span>Timetable Preview</span>
                  </div>
                  <MiniTimetablePreview theme={theme} templateId={template.id} />
                </div>

                {/* Color Palette */}
                <div className='flex gap-1 flex-wrap'>
                  {theme.palette.slice(0, 5).map((color, i) => (
                    <div key={i} className='w-6 h-6 rounded border' style={{ backgroundColor: color }} />
                  ))}
                </div>

                {/* Badges */}
                <div className='flex gap-2 text-xs text-muted-foreground'>
                  <Badge variant='outline'>{theme.headerBg.includes('gradient') ? 'Gradient' : 'Solid'}</Badge>
                  <Badge variant='outline'>{template.theme}</Badge>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className='p-6'>
          <h3 className='font-semibold mb-2'>About Templates</h3>
          <p className='text-sm text-muted-foreground'>
            Templates are now built-in presets. Schools can select their preferred visual theme from the Templates page.
            The Monochrome (B&W) theme is the default and is optimized for printing.
          </p>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminTemplates;