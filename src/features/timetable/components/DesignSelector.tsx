import { DesignTheme, DESIGN_THEMES } from '../lib/timetableData';
import { Paintbrush, Plus, X } from 'lucide-react';

interface DesignSelectorProps {
  theme: DesignTheme;
  onThemeChange: (theme: DesignTheme) => void;
  days: string[];
  canAddDay: boolean;
  onAddDay: () => void;
  onRemoveDay: (index: number) => void;
}

export default function DesignSelector({
  theme,
  onThemeChange,
  days,
  canAddDay,
  onAddDay,
  onRemoveDay,
}: DesignSelectorProps) {
  const themes = Object.entries(DESIGN_THEMES) as [DesignTheme, typeof DESIGN_THEMES[DesignTheme]][];

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-display font-bold text-foreground">
        <Paintbrush className="h-4 w-4" /> Design Template
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {themes.map(([key, t]) => (
          <button
            key={key}
            onClick={() => onThemeChange(key)}
            className={`relative rounded-lg border-2 p-2 text-center transition-all ${
              theme === key
                ? 'scale-105 border-primary ring-2 ring-primary/30'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className={`mb-1 h-5 rounded-sm ${t.headerBg}`} />
            <div className={`mb-0.5 h-2.5 rounded-sm ${t.dayBg}`} />
            <div className="h-1.5 rounded-sm bg-muted" />
            <span className="mt-0.5 block text-[8px] font-semibold leading-tight text-foreground">{t.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Days</p>
            <p className="text-xs text-muted-foreground">Add or remove teaching days inside the active template.</p>
          </div>
          {canAddDay && (
            <button
              type="button"
              onClick={onAddDay}
              className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Day
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {days.map((day, index) => (
            <span
              key={day}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {day}
              {days.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveDay(index)}
                  className="rounded-full text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Remove ${day}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
