import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Type } from 'lucide-react';

export const FONT_OPTIONS = [
  { label: 'Galano Grotesque', value: "'Galano Grotesque', 'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'Arial', value: "Arial, 'Helvetica Neue', Helvetica, sans-serif" },
  { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, Georgia, serif" },
  { label: 'Georgia', value: "Georgia, 'Times New Roman', Times, serif" },
  { label: 'Verdana', value: "Verdana, Geneva, Tahoma, sans-serif" },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', 'Lucida Grande', 'Lucida Sans', sans-serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'Tahoma', value: "Tahoma, Geneva, Verdana, sans-serif" },
  { label: 'Palatino', value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
  { label: 'Garamond', value: "Garamond, 'Times New Roman', Times, serif" },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', 'Comic Sans', cursive, sans-serif" },
];

interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
}

export default function FontSelector({ value, onChange }: FontSelectorProps) {
  const currentLabel = FONT_OPTIONS.find(f => f.value === value)?.label || 'Select Font';

  return (
    <div className="flex items-center gap-2">
      <Type className="w-3.5 h-3.5 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs w-[180px]">
          <SelectValue placeholder="Select Font">
            <span style={{ fontFamily: value }}>{currentLabel}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {FONT_OPTIONS.map((font) => (
            <SelectItem key={font.label} value={font.value}>
              <span style={{ fontFamily: font.value }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
