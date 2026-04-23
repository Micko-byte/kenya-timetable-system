import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check, ChevronDown } from "lucide-react";

interface ClassOption {
  id: string;
  grade: number;
  stream_name: string;
}

interface AssignedClassesDropdownProps {
  classes: ClassOption[];
  selectedClassIds: string[];
  onSelectionChange: (classIds: string[]) => void;
  disabled?: boolean;
}

const formatClassLabel = (classItem: ClassOption) => `Grade ${classItem.grade} - ${classItem.stream_name}`;

export const AssignedClassesDropdown = ({
  classes,
  selectedClassIds,
  onSelectionChange,
  disabled = false,
}: AssignedClassesDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedClasses = classes.filter((c) => selectedClassIds.includes(c.id));

  const handleToggleClass = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      onSelectionChange(selectedClassIds.filter((id) => id !== classId));
    } else {
      onSelectionChange([...selectedClassIds, classId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedClassIds.length === classes.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(classes.map((c) => c.id));
    }
  };

  const sortedClasses = [...classes].sort((a, b) => {
    if (a.grade !== b.grade) {
      return a.grade - b.grade;
    }
    return a.stream_name.localeCompare(b.stream_name);
  });

  return (
    <div className="space-y-2">
      <Label>Classes Taught</Label>
      <p className="text-xs text-muted-foreground">Select one or more classes this teacher teaches</p>

      {classes.length === 0 ? (
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            No classes available yet. Please create classes in the Classes & Streams section first.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              disabled={disabled || classes.length === 0}
              className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-left">
                {selectedClassIds.length === 0
                  ? "Select classes..."
                  : selectedClasses.length === 1
                    ? formatClassLabel(selectedClasses[0])
                    : `${selectedClassIds.length} classes selected`}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-input bg-background p-2 shadow-lg">
                <div className="mb-2 border-b border-border p-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent"
                    onClick={handleSelectAll}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                        selectedClassIds.length === classes.length && classes.length > 0
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background"
                      }`}
                    >
                      {selectedClassIds.length === classes.length && classes.length > 0 && <Check className="h-3 w-3" />}
                    </span>
                    <span className="text-sm font-semibold">Select All</span>
                  </button>
                </div>

                <div className="space-y-1">
                  {sortedClasses.map((classItem) => {
                    const active = selectedClassIds.includes(classItem.id);

                    return (
                      <button
                        key={classItem.id}
                        type="button"
                        disabled={disabled}
                        className="flex w-full items-center gap-2 rounded p-2 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleToggleClass(classItem.id)}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                            active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                          }`}
                        >
                          {active && <Check className="h-3 w-3" />}
                        </span>
                        <span className="flex-1 text-sm">{formatClassLabel(classItem)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {selectedClassIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedClasses.map((classItem) => (
                <Badge
                  key={classItem.id}
                  variant="default"
                  className="cursor-pointer gap-1 transition-transform hover:scale-105"
                  onClick={() => handleToggleClass(classItem.id)}
                >
                  {formatClassLabel(classItem)}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleClass(classItem.id);
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
