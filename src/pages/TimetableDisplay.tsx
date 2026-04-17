import { useState } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Edit3, Save, X, Coffee } from "lucide-react";
import { toast } from "sonner";

interface TimetableEntry {
  id: string;
  day: string;
  period: number;
  subject: string;
  teacher: string;
  room?: string;
  isBreak?: boolean;
  breakType?: string;
}

interface TimetableDisplayProps {
  timetableData: TimetableEntry[];
  editable?: boolean;
  onSave?: (data: TimetableEntry[]) => void;
  subjects?: Array<{ id: string; name: string }>;
  teachers?: Array<{ id: string; name: string }>;
  rooms?: Array<{ id: string; name: string }>;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const SortableCell = ({ entry, onEdit, editable }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (entry.isBreak) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="p-3 bg-amber-50 border-2 border-amber-200 rounded-lg flex items-center justify-center gap-2"
      >
        <Coffee className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-700">
          {entry.breakType || "Break"}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-primary transition-colors ${
        editable ? "cursor-move" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        {editable && <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{entry.subject}</p>
          <p className="text-xs text-muted-foreground truncate">{entry.teacher}</p>
          {entry.room && (
            <Badge variant="outline" className="mt-1 text-xs">
              {entry.room}
            </Badge>
          )}
        </div>
        {editable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={() => onEdit(entry)}
          >
            <Edit3 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const TimetableDisplay = ({
  timetableData,
  editable = false,
  onSave,
  subjects = [],
  teachers = [],
  rooms = [],
}: TimetableDisplayProps) => {
  const [entries, setEntries] = useState<TimetableEntry[]>(timetableData);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newEntries = [...entries];
      const [movedEntry] = newEntries.splice(oldIndex, 1);
      newEntries.splice(newIndex, 0, movedEntry);
      setEntries(newEntries);
      toast.success("Entry moved successfully");
    }
  };

  const handleEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;

    const updatedEntries = entries.map((e) =>
      e.id === editingEntry.id ? editingEntry : e
    );
    setEntries(updatedEntries);
    setIsEditing(false);
    setEditingEntry(null);
    toast.success("Entry updated successfully");
  };

  const handleSaveAll = () => {
    if (onSave) {
      onSave(entries);
      toast.success("Timetable saved successfully");
    }
  };

  // Group entries by day and period
  const groupedEntries = entries.reduce((acc, entry) => {
    const key = `${entry.day}-${entry.period}`;
    acc[key] = entry;
    return acc;
  }, {} as Record<string, TimetableEntry>);

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Drag entries to rearrange • Click edit icon to modify
          </p>
          <Button onClick={handleSaveAll} className="gap-2">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-2 border-gray-300 bg-gray-100 p-3 text-left font-semibold">
                  Period / Day
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="border-2 border-gray-300 bg-primary/10 p-3 text-center font-semibold"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period}>
                  <td className="border-2 border-gray-300 bg-gray-50 p-3 text-center font-medium">
                    Period {period}
                  </td>
                  {DAYS.map((day) => {
                    const key = `${day}-${period}`;
                    const entry = groupedEntries[key];

                    return (
                      <td key={key} className="border-2 border-gray-300 p-2">
                        {entry ? (
                          <SortableCell
                            entry={entry}
                            onEdit={handleEdit}
                            editable={editable}
                          />
                        ) : (
                          <div className="p-3 text-center text-gray-400 text-sm">
                            {editable ? "Empty" : "-"}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DndContext>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Timetable Entry</DialogTitle>
            <DialogDescription>
              Modify the subject, teacher, or room for this period
            </DialogDescription>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                {subjects.length > 0 ? (
                  <Select
                    value={editingEntry.subject}
                    onValueChange={(value) =>
                      setEditingEntry({ ...editingEntry, subject: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.name}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editingEntry.subject}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, subject: e.target.value })
                    }
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Teacher</label>
                {teachers.length > 0 ? (
                  <Select
                    value={editingEntry.teacher}
                    onValueChange={(value) =>
                      setEditingEntry({ ...editingEntry, teacher: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.name}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editingEntry.teacher}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, teacher: e.target.value })
                    }
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Room (Optional)
                </label>
                {rooms.length > 0 ? (
                  <Select
                    value={editingEntry.room || ""}
                    onValueChange={(value) =>
                      setEditingEntry({ ...editingEntry, room: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.name}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editingEntry.room || ""}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, room: e.target.value })
                    }
                    placeholder="e.g., Lab 1, Room 3A"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingEntry(null);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};