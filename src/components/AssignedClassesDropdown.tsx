import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

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
      <Label htmlFor="assigned-classes">Classes Taught</Label>
      <p className="text-xs text-muted-foreground">
        Select one or more classes this teacher teaches
      </p>

      {classes.length === 0 ? (
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            ⚠️ No classes available yet. Please create classes in the Classes & Streams section first.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              disabled={disabled || classes.length === 0}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between hover:bg-accent transition-colors"
            >
              <span className="text-left">
                {selectedClassIds.length === 0
                  ? "Select classes..."
                  : selectedClassIds.length === 1
                    ? `${selectedClasses[0].grade} - ${selectedClasses[0].stream_name}`
                    : `${selectedClassIds.length} classes selected`}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 border border-input bg-background rounded-md shadow-lg z-50 p-2 max-h-72 overflow-y-auto">
                {/* Select All Option */}
                <div className="p-2 border-b border-border mb-2">
                  <div className="flex items-center space-x-2 cursor-pointer hover:bg-accent p-2 rounded">
                    <Checkbox
                      id="select-all-classes"
                      checked={selectedClassIds.length === classes.length && classes.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label
                      htmlFor="select-all-classes"
                      className="cursor-pointer font-semibold text-sm"
                    >
                      Select All
                    </Label>
                  </div>
                </div>

                {/* Class Options */}
                <div className="space-y-1">
                  {sortedClasses.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-accent rounded transition-colors"
                      onClick={() => handleToggleClass(classItem.id)}
                    >
                      <Checkbox
                        id={`class-${classItem.id}`}
                        checked={selectedClassIds.includes(classItem.id)}
                        onCheckedChange={() => handleToggleClass(classItem.id)}
                      />
                      <Label
                        htmlFor={`class-${classItem.id}`}
                        className="cursor-pointer text-sm flex-1"
                      >
                        Grade {classItem.grade} - {classItem.stream_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected Classes Display */}
          {selectedClassIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedClasses.map((classItem) => (
                <Badge
                  key={classItem.id}
                  variant="default"
                  className="cursor-pointer hover:scale-105 transition-transform gap-1"
                  onClick={() => handleToggleClass(classItem.id)}
                >
                  Grade {classItem.grade} - {classItem.stream_name}
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
