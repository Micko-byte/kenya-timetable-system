import { Badge } from "@/components/ui/badge";

interface TimetableDisplayProps {
  timetableData: any;
  template: string;
}

export const TimetableDisplay = ({
  timetableData,
  template,
}: TimetableDisplayProps) => {
  const periods = ["Period 1", "Period 2", "Period 3", "Period 4", "Period 5"];
  const days = Object.keys(timetableData);

  // Map new template IDs to display styles
  const displayStyle = 
    template === "primary" || template === "highschool" || template === "classic" 
      ? "table"
      : template === "international" || template === "university" || template === "modern"
      ? "cards"
      : template === "college" || template === "training" || template === "minimal"
      ? "list"
      : "table"; // default

  if (displayStyle === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-semibold text-primary">Day</th>
              {periods.map((period) => (
                <th
                  key={period}
                  className="text-left p-3 font-semibold text-primary"
                >
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr
                key={day}
                className="border-b border-border hover:bg-secondary/50 transition-colors"
              >
                <td className="p-3 font-semibold">{day}</td>
                {timetableData[day].map((subject: string, idx: number) => (
                  <td key={idx} className="p-3">
                    <Badge variant="outline">{subject}</Badge>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (displayStyle === "cards") {
    return (
      <div className="space-y-4">
        {days.map((day) => (
          <div
            key={day}
            className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
          >
            <h3 className="font-bold text-lg mb-3 text-primary">{day}</h3>
            <div className="grid grid-cols-5 gap-3">
              {timetableData[day].map((subject: string, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-secondary/50 border border-border text-center"
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    Period {idx + 1}
                  </p>
                  <p className="font-semibold text-sm">{subject}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (displayStyle === "list") {
    return (
      <div className="space-y-3">
        {days.map((day) => (
          <div key={day} className="p-3 border-l-4 border-primary">
            <h3 className="font-bold mb-2">{day}</h3>
            <div className="flex flex-wrap gap-2">
              {timetableData[day].map((subject: string, idx: number) => (
                <span
                  key={idx}
                  className="text-sm px-3 py-1 bg-secondary/30 rounded"
                >
                  {idx + 1}. {subject}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};
