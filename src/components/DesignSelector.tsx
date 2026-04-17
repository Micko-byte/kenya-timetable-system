import { Paintbrush } from "lucide-react";
import { DesignTheme, DESIGN_THEMES } from "@/lib/timetableData";

interface DesignSelectorProps {
  theme: DesignTheme;
  onThemeChange: (theme: DesignTheme) => void;
}

export default function DesignSelector({ theme, onThemeChange }: DesignSelectorProps) {
  const themes = Object.entries(DESIGN_THEMES) as [DesignTheme, (typeof DESIGN_THEMES)[DesignTheme]][];

  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-4">
      <h3 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
        <Paintbrush className="w-4 h-4" />
        Design Template
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {themes.map(([key, item]) => (
          <button
            key={key}
            onClick={() => onThemeChange(key)}
            className={`relative p-2 rounded-lg border-2 transition-all text-center ${
              theme === key ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border hover:border-primary/50"
            }`}
          >
            <div className={`h-5 rounded-sm mb-1 ${item.headerBg}`} />
            <div className={`h-2.5 rounded-sm mb-0.5 ${item.dayBg}`} />
            <div className="h-1.5 rounded-sm bg-muted" />
            <span className="text-[8px] font-semibold text-foreground mt-0.5 block leading-tight">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
