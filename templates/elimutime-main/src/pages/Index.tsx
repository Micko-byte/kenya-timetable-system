import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download, RotateCcw, FileText, GraduationCap, Plus, X, Palette } from 'lucide-react';
import SchoolHeader from '@/components/SchoolHeader';
import TimetableGridComponent from '@/components/TimetableGrid';
import SubjectManager from '@/components/SubjectManager';
import DesignSelector from '@/components/DesignSelector';
import FontSelector, { FONT_OPTIONS } from '@/components/FontSelector';
import {
  createGridForLevel, CellData, TimetableGrid, DesignTheme, parseTimetableJSON,
  EducationLevel, EDUCATION_LEVELS, LEVEL_PERIODS, PeriodSlot, getSubjectsByLevel,
  DEFAULT_DAYS, ALL_DAYS,
} from '@/lib/timetableData';
import { exportTimetableToXls } from '@/lib/exportToXls';
import { exportTimetableToPdf } from '@/lib/exportToPdf';
import { useToast } from '@/hooks/use-toast';

type ActiveLevel = Exclude<EducationLevel, 'common'>;
const LEVELS: { key: ActiveLevel; defaultSchool: string; defaultClass: string }[] = [
  { key: 'pre_primary', defaultSchool: 'Brightstone Schools Pre-School', defaultClass: 'PP2' },
  { key: 'lower_primary', defaultSchool: 'Brightstone Schools Primary', defaultClass: 'Grade 2' },
  { key: 'upper_primary', defaultSchool: 'Brightstone Schools Primary', defaultClass: 'Grade 5' },
  { key: 'junior_secondary', defaultSchool: 'Brightstone Schools Junior Secondary', defaultClass: 'Grade 8' },
  { key: 'senior_secondary', defaultSchool: 'Brightstone Schools Senior School', defaultClass: 'Grade 11 - STEM' },
  { key: 'eight_four_four', defaultSchool: 'Brightstone Schools Secondary', defaultClass: 'Form 2A' },
];

const Index = () => {
  const { toast } = useToast();
  const [activeLevel, setActiveLevel] = useState<ActiveLevel>('eight_four_four');
  const [schoolName, setSchoolName] = useState('Brightstone Schools Secondary');
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [className, setClassName] = useState('Form 2A');
  const [term, setTerm] = useState('Term 1');
  const [year, setYear] = useState('2026');
  const [days, setDays] = useState<string[]>([...DEFAULT_DAYS]);
  const [periods, setPeriods] = useState<PeriodSlot[]>([...LEVEL_PERIODS.eight_four_four]);
  const [grid, setGrid] = useState<TimetableGrid>(() => createGridForLevel('eight_four_four'));
  const [theme, setTheme] = useState<DesignTheme>('classic');
  const [customSubjects, setCustomSubjects] = useState<string[]>([]);
  const [colorless, setColorless] = useState(false);
  const [rowColors, setRowColors] = useState<Record<number, string>>({});
  const [colColors, setColColors] = useState<Record<number, string>>({});

  const switchLevel = (level: ActiveLevel) => {
    const info = LEVELS.find((l) => l.key === level)!;
    setActiveLevel(level);
    setSchoolName(info.defaultSchool);
    setClassName(info.defaultClass);
    const newPeriods = [...LEVEL_PERIODS[level]];
    setPeriods(newPeriods);
    setDays([...DEFAULT_DAYS]);
    const newGrid = createGridForLevel(level, newPeriods);
    setGrid(newGrid);
    toast({ title: `${EDUCATION_LEVELS[level].emoji} ${EDUCATION_LEVELS[level].label}`, description: 'Template loaded.' });
  };

  const addDay = () => {
    const available = ALL_DAYS.filter(d => !days.includes(d));
    if (available.length === 0) return;
    const newDay = available[0];
    setDays(prev => [...prev, newDay]);
    setGrid(prev => [...prev, periods.map(() => ({ subject: '', teacher: '' }))]);
  };

  const removeDay = (idx: number) => {
    if (days.length <= 1) return;
    setDays(prev => prev.filter((_, i) => i !== idx));
    setGrid(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCellChange = useCallback(
    (dayIdx: number, periodIdx: number, data: CellData) => {
      setGrid((prev) => {
        const next = prev.map((row) => [...row]);
        next[dayIdx][periodIdx] = data;
        return next;
      });
    },
    []
  );

  const handlePeriodChange = useCallback(
    (periodIdx: number, slot: PeriodSlot) => {
      setPeriods((prev) => {
        const next = [...prev];
        next[periodIdx] = slot;
        return next;
      });
    },
    []
  );

  const handleExportXls = () => {
    exportTimetableToXls(grid, schoolName, className, term, year, periods);
    toast({ title: 'Exported!', description: 'Downloaded as Excel file.' });
  };

  const handleExportPdf = async () => {
    try {
      await exportTimetableToPdf('timetable-print', `${schoolName.replace(/\s+/g, '_')}_Timetable_${className}.pdf`);
      toast({ title: 'Exported!', description: 'Downloaded as PDF file.' });
    } catch {
      toast({ title: 'Error', description: 'PDF export failed.', variant: 'destructive' });
    }
  };

  const handleReset = () => {
    const newPeriods = [...LEVEL_PERIODS[activeLevel]];
    setPeriods(newPeriods);
    setDays([...DEFAULT_DAYS]);
    setGrid(createGridForLevel(activeLevel, newPeriods));
    toast({ title: 'Reset', description: 'Timetable has been reset.' });
  };

  const handleAddSubject = (name: string) => setCustomSubjects((prev) => [...prev, name]);
  const handleRemoveSubject = (name: string) => setCustomSubjects((prev) => prev.filter((s) => s !== name));

  const handleJsonImport = (json: string) => {
    const result = parseTimetableJSON(json);
    if (result) {
      setGrid(result.grid);
      if (result.subjects) setCustomSubjects((prev) => [...new Set([...prev, ...result.subjects!])]);
      toast({ title: 'Imported', description: 'Timetable loaded from JSON.' });
    } else {
      toast({ title: 'Error', description: 'Invalid JSON format.', variant: 'destructive' });
    }
  };

  const levelInfo = EDUCATION_LEVELS[activeLevel];
  const subjectCount = getSubjectsByLevel(activeLevel).filter(s => !['BREAK','LUNCH','Games'].includes(s)).length;

  return (
    <div className="min-h-screen bg-background py-4 px-3">
      <div className="max-w-[1200px] mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-display font-extrabold text-foreground flex items-center gap-2">
              🇰🇪 Kenya School Timetable Creator
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Click any cell to edit • Click time headers to edit periods • CBC & 8-4-4 Curriculum
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <FontSelector value={fontFamily} onChange={setFontFamily} />
            <button
              onClick={() => setColorless(!colorless)}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-md border transition-all ${
                colorless
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-foreground border-border hover:border-primary/50'
              }`}
              title={colorless ? 'Enable subject colors' : 'Disable subject colors (B&W)'}
            >
              <Palette className="w-3 h-3" />
              {colorless ? 'B&W' : 'Color'}
            </button>
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs h-8">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="text-xs h-8">
              <FileText className="w-3 h-3 mr-1" /> PDF
            </Button>
            <Button size="sm" onClick={handleExportXls} className="text-xs h-8">
              <Download className="w-3 h-3 mr-1" /> Excel
            </Button>
          </div>
        </div>

        {/* Education Level Selector */}
        <div className="bg-card border border-border rounded-xl p-3 mb-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="text-xs font-display font-bold text-foreground">Select Education Level</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {levelInfo.emoji} {levelInfo.label} • {subjectCount} subjects • {periods.length} periods
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {LEVELS.map(({ key }) => {
              const info = EDUCATION_LEVELS[key];
              const count = getSubjectsByLevel(key).filter(s => !['BREAK','LUNCH','Games'].includes(s)).length;
              const isActive = activeLevel === key;
              return (
                <button
                  key={key}
                  onClick={() => switchLevel(key)}
                  className={`relative group rounded-lg border-2 p-2.5 text-left transition-all duration-200 ${
                    isActive
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md scale-[1.02]'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <div className="text-lg mb-0.5">{info.emoji}</div>
                  <div className={`text-[10px] font-bold leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {info.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">{count} subjects</div>
                  {isActive && (
                    <div className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Management */}
        <div className="flex items-center gap-2 mb-2 max-w-[1120px] mx-auto">
          <span className="text-[10px] font-bold text-muted-foreground">Days:</span>
          {days.map((d, i) => (
            <span key={d} className="inline-flex items-center gap-0.5 bg-muted text-foreground text-[9px] font-semibold px-2 py-0.5 rounded-full">
              {d}
              {days.length > 1 && (
                <button onClick={() => removeDay(i)} className="ml-0.5 hover:text-destructive">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          ))}
          {days.length < ALL_DAYS.length && (
            <button
              onClick={addDay}
              className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary hover:text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full"
            >
              <Plus className="w-2.5 h-2.5" /> Add Day
            </button>
          )}
        </div>

        {/* A4 Landscape Timetable */}
        <div
          id="timetable-print"
          className="bg-card rounded-xl shadow-lg border border-border overflow-hidden"
          style={{ maxWidth: '1120px', margin: '0 auto', fontFamily }}
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
          <div className="p-1.5">
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

        {/* Design & Subject Management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[1120px] mx-auto">
          <DesignSelector theme={theme} onThemeChange={setTheme} />
          <SubjectManager
            customSubjects={customSubjects}
            onAddSubject={handleAddSubject}
            onRemoveSubject={handleRemoveSubject}
            onJsonImport={handleJsonImport}
          />
        </div>

        <p className="text-center text-[9px] text-muted-foreground mt-3">
          Designed for Kenyan CBC & 8-4-4 curriculum schools • KICD aligned
        </p>
      </div>
    </div>
  );
};

export default Index;
