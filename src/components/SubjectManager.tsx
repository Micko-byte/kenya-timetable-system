import { useState } from "react";
import { Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECTS, EDUCATION_LEVELS, EducationLevel, getSubjectsByLevel } from "@/lib/timetableData";
import { colorClassMap } from "@/lib/subjectColors";
import { useToast } from "@/hooks/use-toast";

interface SubjectManagerProps {
  customSubjects: string[];
  onAddSubject: (name: string) => void;
  onRemoveSubject: (name: string) => void;
  onJsonImport: (json: string) => void;
}

const LEVEL_KEYS: EducationLevel[] = ["lower_primary", "upper_primary", "junior_secondary", "senior_secondary", "eight_four_four"];

export default function SubjectManager({
  customSubjects,
  onAddSubject,
  onRemoveSubject,
  onJsonImport,
}: SubjectManagerProps) {
  const { toast } = useToast();
  const [newSubject, setNewSubject] = useState("");
  const [showJsonInput, setShowJsonInput] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [filterLevel, setFilterLevel] = useState<EducationLevel | "all">("all");

  const allSubjects = Object.keys(SUBJECTS).filter((subject) => !["BREAK", "LUNCH", "Games"].includes(subject));
  const filteredSubjects =
    filterLevel === "all"
      ? allSubjects
      : getSubjectsByLevel(filterLevel).filter((subject) => !["BREAK", "LUNCH", "Games"].includes(subject));

  const handleAdd = () => {
    const trimmed = newSubject.trim();
    if (!trimmed) return;
    if (allSubjects.includes(trimmed) || customSubjects.includes(trimmed)) {
      toast({
        title: "Already exists",
        description: `"${trimmed}" is already in the list.`,
        variant: "destructive",
      });
      return;
    }
    onAddSubject(trimmed);
    setNewSubject("");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display font-bold text-foreground">Subject Manager</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowJsonInput(!showJsonInput)} className="text-xs">
          <Upload className="w-3 h-3 mr-1" />
          Import JSON
        </Button>
      </div>

      {showJsonInput && (
        <div className="mb-3 p-3 bg-muted rounded-lg">
          <textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            className="w-full h-20 text-xs p-2 rounded border border-border bg-card text-foreground font-mono resize-none"
            placeholder='{"subjects": ["Mathematics", "English"]}'
          />
          <Button
            size="sm"
            onClick={() => {
              onJsonImport(jsonText);
              setJsonText("");
              setShowJsonInput(false);
            }}
            className="mt-2 text-xs"
          >
            Import
          </Button>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <Input
          value={newSubject}
          onChange={(event) => setNewSubject(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && handleAdd()}
          placeholder="Add new subject..."
          className="text-xs h-8"
        />
        <Button size="sm" onClick={handleAdd} className="h-8 px-3">
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        <button
          onClick={() => setFilterLevel("all")}
          className={`text-[9px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
            filterLevel === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All ({allSubjects.length})
        </button>
        {LEVEL_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setFilterLevel(key)}
            className={`text-[9px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
              filterLevel === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {EDUCATION_LEVELS[key].label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
        {filteredSubjects.map((name) => {
          const color = SUBJECTS[name]?.color || "default";
          return (
            <span
              key={name}
              className={`px-2 py-0.5 text-[10px] rounded-full font-medium text-white flex items-center gap-1 ${colorClassMap[color] || "bg-slate-500"}`}
            >
              {name}
            </span>
          );
        })}
        {customSubjects.map((name) => (
          <span
            key={name}
            className="px-2 py-0.5 text-[10px] rounded-full bg-accent text-accent-foreground font-medium flex items-center gap-1"
          >
            {name}
            <button onClick={() => onRemoveSubject(name)} className="hover:text-destructive">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
