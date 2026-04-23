import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Check, Minus } from "lucide-react";

interface ClassOption {
  id: string;
  grade: number;
  stream_name: string;
}

interface SubjectClassAssignmentsEditorProps {
  subjects: string[];
  classes: ClassOption[];
  value: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
  disabled?: boolean;
}

const formatClassLabel = (classItem: ClassOption) => `Grade ${classItem.grade} - ${classItem.stream_name}`;

export const SubjectClassAssignmentsEditor = ({
  subjects,
  classes,
  value,
  onChange,
  disabled = false,
}: SubjectClassAssignmentsEditorProps) => {
  const sortedClasses = [...classes].sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.stream_name.localeCompare(b.stream_name);
  });

  const toggleClass = (subject: string, classId: string) => {
    const current = value[subject] || [];
    const next = current.includes(classId)
      ? current.filter((id) => id !== classId)
      : [...current, classId];

    onChange({
      ...value,
      [subject]: next,
    });
  };

  const clearSubject = (subject: string) => {
    const next = { ...value };
    delete next[subject];
    onChange(next);
  };

  if (subjects.length === 0) {
    return (
      <Card className="p-4 border-dashed bg-muted/20">
        <p className="text-sm text-muted-foreground">
          Add at least one subject first, then assign the classes that subject is taught in.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {subjects.map((subject) => {
        const selected = value[subject] || [];

        return (
          <Card key={subject} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="text-sm font-semibold">{subject}</Label>
                <p className="text-xs text-muted-foreground">
                  Choose the classes where this subject is taught.
                </p>
              </div>
              {selected.length > 0 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => clearSubject(subject)}
                  className="text-xs font-semibold text-muted-foreground hover:text-destructive"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {sortedClasses.map((classItem) => {
                const active = selected.includes(classItem.id);
                return (
                  <button
                    key={`${subject}-${classItem.id}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleClass(subject, classItem.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                    } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {active ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3 opacity-50" />}
                    {formatClassLabel(classItem)}
                  </button>
                );
              })}
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selected.map((classId) => {
                  const classItem = classes.find((item) => item.id === classId);
                  if (!classItem) return null;

                  return (
                    <Badge key={`${subject}-selected-${classId}`} variant="secondary">
                      {formatClassLabel(classItem)}
                    </Badge>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
