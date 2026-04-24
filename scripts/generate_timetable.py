#!/usr/bin/env python3
"""Generate a timetable from JSON input using explicit slot mapping.

The generator no longer compresses lessons into a continuous fill pattern.
Instead, it reads the template slots, matches each lesson to an exact slot
by day + time/period + stream + teacher, and leaves everything else blank.

Expected JSON shape:
{
  "stream": {"id": "...", "grade": 7, "stream_name": "A"},
  "teachers": [
    {"id": "...", "name": "Jane Doe", "subjects": ["Math"], "assignedStreamIds": ["..."]}
  ],
  "template": {
    "days": ["Monday", "Tuesday", ...],
    "periods": [
      {"time": "7:30-8:10", "label": "Lesson 1"},
      {"time": "9:30-9:50", "label": "BREAK"}
    ]
  },
  "lessons": [
    {
      "day": "Monday",
      "time": "7:30-8:10",
      "stream_id": "...",
      "teacher_id": "...",
      "subject_name": "Mathematics"
    }
  ]
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
    normalized = value.strip()
    if not normalized or normalized in seen:
      continue
    seen.add(normalized)
    result.append(normalized)
  return result


def _normalize(value: Any) -> str:
  return str(value or "").strip().lower()


def _safe_int(value: Any, fallback: int = 0) -> int:
  try:
    return int(value)
  except (TypeError, ValueError):
    return fallback


def _parse_stream(payload: dict[str, Any]) -> Stream:
  if "id" not in payload:
    raise ValueError("stream.id is required")
  return Stream(
    id=str(payload["id"]),
    grade=_safe_int(payload.get("grade")),
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


def _build_days(template: dict[str, Any], days_per_week: int) -> list[str]:
  days = template.get("days")
  if isinstance(days, list) and days:
    return [str(day) for day in days if str(day).strip()]
  return DAY_NAMES[:days_per_week]


def _build_periods(template: dict[str, Any], periods_per_day: int) -> list[dict[str, Any]]:
  periods = template.get("periods")
  if isinstance(periods, list) and periods:
    return [period for period in periods if isinstance(period, dict)]

  breaks = {
    _safe_int(item.get("afterPeriod"))
    for item in template.get("break_config") or []
    if isinstance(item, dict) and item.get("afterPeriod") is not None
  }

  default_periods: list[dict[str, Any]] = []
  for index in range(1, periods_per_day + 1):
    if (index - 1) in breaks:
      default_periods.append({"time": f"Period {index}", "label": "BREAK"})
      continue
    default_periods.append({"time": f"Period {index}", "label": f"Lesson {index}"})

  return default_periods


def _slot_key(day_value: Any, period_value: Any, stream_id: str, teacher_id: str) -> str:
  return "|".join((_normalize(day_value), _normalize(period_value), _normalize(stream_id), _normalize(teacher_id)))


def _lesson_candidates(payload: dict[str, Any]) -> list[dict[str, Any]]:
  for key in ("lessons", "entries", "assignments", "timetable_data"):
    value = payload.get(key)
    if isinstance(value, list):
      return [item for item in value if isinstance(item, dict)]
  return []


def _lesson_key_candidates(lesson: dict[str, Any], days: list[str], periods: list[dict[str, Any]]) -> list[str]:
  day_value = lesson.get("day", lesson.get("day_of_week"))
  period_value = lesson.get("time", lesson.get("period_id", lesson.get("period_number", lesson.get("slot"))))
  stream_id = str(lesson.get("stream_id") or lesson.get("streamId") or "")
  teacher_id = str(lesson.get("teacher_id") or lesson.get("teacherId") or "")

  candidates = [
    _slot_key(day_value, period_value, stream_id, teacher_id),
    _slot_key(day_value, period_value, stream_id, ""),
    _slot_key(day_value, period_value, "", ""),
  ]

  if isinstance(day_value, int) and 1 <= day_value <= len(days):
    day_name = days[day_value - 1]
    candidates.extend([
      _slot_key(day_name, period_value, stream_id, teacher_id),
      _slot_key(day_name, period_value, stream_id, ""),
      _slot_key(day_name, period_value, "", ""),
    ])

  period_index = _safe_int(period_value, 0)
  if period_index > 0 and period_index <= len(periods):
    period = periods[period_index - 1]
    candidates.extend([
      _slot_key(day_value, period.get("time") or period.get("label") or period_index, stream_id, teacher_id),
      _slot_key(day_value, period.get("time") or period.get("label") or period_index, stream_id, ""),
      _slot_key(day_value, period.get("time") or period.get("label") or period_index, "", ""),
    ])

  return candidates


def generate_timetable(payload: dict[str, Any]) -> dict[str, Any]:
  stream = _parse_stream(payload["stream"])
  teachers = _parse_teachers(payload.get("teachers") or [])
  template = payload.get("template") or {}
  if not isinstance(template, dict):
    template = {}

  periods_per_day = max(1, _safe_int(template.get("periods_per_day"), 8))
  days_per_week = max(1, _safe_int(template.get("days_per_week"), 5))
  days = _build_days(template, days_per_week)
  periods = _build_periods(template, periods_per_day)
  lessons = _lesson_candidates(payload)

  lesson_lookup: dict[str, dict[str, Any]] = {}
  for lesson in lessons:
    for candidate in _lesson_key_candidates(lesson, days, periods):
      if candidate not in lesson_lookup:
        lesson_lookup[candidate] = lesson

  grid: list[list[dict[str, Any] | None]] = []
  timetable_data: list[dict[str, Any]] = []

  for day_index, day_name in enumerate(days, start=1):
    day_row: list[dict[str, Any] | None] = []
    for period_index, period in enumerate(periods, start=1):
      period_value = period.get("time") or period.get("label") or period_index
      slot_candidates = [
        _slot_key(day_name, period_value, stream.id, ""),
        _slot_key(day_name, period_value, "", ""),
        _slot_key(day_index, period_index, stream.id, ""),
        _slot_key(day_index, period_index, "", ""),
      ]

      matched_lesson = None
      for key in slot_candidates:
        matched_lesson = lesson_lookup.get(key)
        if matched_lesson:
          break

      if not matched_lesson:
        day_row.append(None)
        continue

      subject_name = str(
        matched_lesson.get("subject_name")
        or matched_lesson.get("subject")
        or matched_lesson.get("title")
        or "Untitled"
      )
      teacher_id = str(matched_lesson.get("teacher_id") or matched_lesson.get("teacherId") or "unassigned")
      teacher_name = str(matched_lesson.get("teacher_name") or matched_lesson.get("teacherName") or "Unassigned Teacher")

      entry = {
        "id": str(matched_lesson.get("id") or f"{stream.id}-{day_index}-{period_index}"),
        "period_id": str(matched_lesson.get("period_id") or matched_lesson.get("periodId") or f"{day_index}-{period_index}"),
        "day_of_week": _safe_int(matched_lesson.get("day_of_week"), day_index),
        "subject_id": str(matched_lesson.get("subject_id") or subject_name.lower().replace(" ", "-")),
        "subject_name": subject_name,
        "teacher_id": teacher_id,
        "teacher_name": teacher_name,
        "stream_id": str(matched_lesson.get("stream_id") or stream.id),
        "room_id": matched_lesson.get("room_id"),
        "notes": matched_lesson.get("notes") or f"{day_name} {period.get('label') or period_index}",
        "is_locked": bool(matched_lesson.get("is_locked", False)),
        "period_number": _safe_int(matched_lesson.get("period_number"), period_index),
      }
      day_row.append(entry)
      timetable_data.append(entry)
    grid.append(day_row)

  return {
    "name": f"Grade {stream.grade} - {stream.stream_name}",
    "type": "stream",
    "status": "draft",
    "stream": {"id": stream.id, "grade": stream.grade, "stream_name": stream.stream_name},
    "days": days,
    "periods": periods,
    "grid": grid,
    "timetable_data": timetable_data,
    "teachers": [
      {
        "id": teacher.id,
        "name": teacher.name,
        "subjects": teacher.subjects,
        "assignedStreamIds": teacher.assigned_stream_ids,
      }
      for teacher in teachers
    ],
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
