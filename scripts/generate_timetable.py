#!/usr/bin/env python3
"""Generate a timetable from JSON input.

Input can be provided with --input, piped through stdin, or passed as a raw JSON
string in the first CLI argument.

Expected JSON shape:
{
  "stream": {"id": "...", "grade": 7, "stream_name": "A"},
  "teachers": [
    {"id": "...", "name": "Jane Doe", "subjects": ["Math"], "assignedStreamIds": ["..."]}
  ],
  "fallback_subjects": ["Mathematics", "English"],
  "template": {
    "periods_per_day": 8,
    "days_per_week": 5,
    "break_config": [{"afterPeriod": 3, "label": "BREAK"}]
  }
}
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@dataclass(frozen=True)
class Stream:
  id: str
  grade: int
  stream_name: str


@dataclass(frozen=True)
class Teacher:
  id: str
  name: str
  subjects: list[str]
  assigned_stream_ids: list[str]


def _dedupe(values: Iterable[str]) -> list[str]:
  seen: set[str] = set()
  result: list[str] = []
  for value in values:
    if not value or value in seen:
      continue
    seen.add(value)
    result.append(value)
  return result


def _parse_stream(payload: dict[str, Any]) -> Stream:
  if "id" not in payload:
    raise ValueError("stream.id is required")
  return Stream(
    id=str(payload["id"]),
    grade=int(payload.get("grade") or 0),
    stream_name=str(payload.get("stream_name") or "Unknown"),
  )


def _parse_teachers(payload: list[dict[str, Any]]) -> list[Teacher]:
  teachers: list[Teacher] = []
  for item in payload:
    teachers.append(
      Teacher(
        id=str(item.get("id") or "unassigned"),
        name=str(item.get("name") or "Unassigned Teacher"),
        subjects=[str(subject) for subject in item.get("subjects") or [] if subject],
        assigned_stream_ids=[str(stream_id) for stream_id in item.get("assignedStreamIds") or [] if stream_id],
      )
    )
  return teachers


def _choose_teacher(subject: str, stream_id: str, teachers: list[Teacher]) -> Teacher:
  for teacher in teachers:
    if subject in teacher.subjects and stream_id in teacher.assigned_stream_ids:
      return teacher

  for teacher in teachers:
    if subject in teacher.subjects:
      return teacher

  return Teacher(
    id="unassigned",
    name="Unassigned Teacher",
    subjects=[],
    assigned_stream_ids=[],
  )


def generate_timetable(payload: dict[str, Any]) -> dict[str, Any]:
  stream = _parse_stream(payload["stream"])
  teachers = _parse_teachers(payload.get("teachers") or [])
  fallback_subjects = _dedupe(str(subject) for subject in payload.get("fallback_subjects") or [])
  template = payload.get("template") or {}

  periods_per_day = max(1, int(template.get("periods_per_day") or 8))
  days_per_week = max(1, int(template.get("days_per_week") or 5))
  break_periods = {
    int(item.get("afterPeriod"))
    for item in template.get("break_config") or []
    if isinstance(item, dict) and item.get("afterPeriod") is not None
  }

  subject_pool = fallback_subjects or ["Study Period"]
  subject_cursor = 0
  timetable_data: list[dict[str, Any]] = []

  for day in range(1, days_per_week + 1):
    for period in range(1, periods_per_day + 1):
      if (period - 1) in break_periods:
        timetable_data.append(
          {
            "id": f"{stream.id}-{day}-{period}-break",
            "period_id": f"{day}-{period}",
            "day_of_week": day,
            "subject_id": "break",
            "subject_name": "Break",
            "teacher_id": "break",
            "teacher_name": "Break",
            "stream_id": stream.id,
            "notes": f"{DAY_NAMES[day - 1] if day - 1 < len(DAY_NAMES) else 'Day'} break",
            "is_locked": False,
            "period_number": period,
          }
        )
        continue

      subject = subject_pool[subject_cursor % len(subject_pool)]
      teacher = _choose_teacher(subject, stream.id, teachers)

      timetable_data.append(
        {
          "id": f"{stream.id}-{day}-{period}",
          "period_id": f"{day}-{period}",
          "day_of_week": day,
          "subject_id": subject.lower().replace(" ", "-"),
          "subject_name": subject,
          "teacher_id": teacher.id,
          "teacher_name": teacher.name,
          "stream_id": stream.id,
          "notes": f"{DAY_NAMES[day - 1] if day - 1 < len(DAY_NAMES) else 'Day'} period {period}",
          "is_locked": False,
          "period_number": period,
        }
      )
      subject_cursor += 1

  return {
    "name": f"Grade {stream.grade} - {stream.stream_name}",
    "type": "stream",
    "status": "draft",
    "timetable_data": timetable_data,
  }


def _read_payload(args: argparse.Namespace) -> dict[str, Any]:
  if args.input_path:
    return json.loads(Path(args.input_path).read_text(encoding="utf-8"))
  if args.json_string:
    return json.loads(args.json_string)

  stdin_data = sys.stdin.read().strip()
  if stdin_data:
    return json.loads(stdin_data)

  raise SystemExit("Provide JSON via --input, a JSON argument, or stdin.")


def main() -> int:
  parser = argparse.ArgumentParser(description="Generate a timetable JSON payload.")
  parser.add_argument("--input", dest="input_path", help="Path to a JSON input file.")
  parser.add_argument("--output", help="Write the generated JSON to a file instead of stdout.")
  parser.add_argument("--pretty", action="store_true", help="Pretty-print the output JSON.")
  parser.add_argument("json_string", nargs="?", help="Raw JSON input string.")
  args = parser.parse_args()

  payload = _read_payload(args)
  result = generate_timetable(payload)
  rendered = json.dumps(result, indent=2 if args.pretty else None, ensure_ascii=True)

  if args.output:
    Path(args.output).write_text(rendered + "\n", encoding="utf-8")
  else:
    sys.stdout.write(rendered + "\n")

  return 0


if __name__ == "__main__":
  raise SystemExit(main())
