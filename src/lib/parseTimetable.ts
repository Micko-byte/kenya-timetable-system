import { supabase } from "@/integrations/supabase/client";

export interface ExtractedClass {
  grade: number;
  stream: string;
}
export interface ExtractedTeacher {
  name: string;
  subjects: string[];
  classes: ExtractedClass[];
}

/** Send an uploaded timetable file to the parse-timetable edge function. */
export async function extractTeachersFromFile(fileUrl: string): Promise<ExtractedTeacher[]> {
  const { data, error } = await supabase.functions.invoke("parse-timetable", { body: { fileUrl } });
  if (error) throw new Error(error.message || "Failed to read the timetable.");
  const payload = (data?.data ?? data) as { teachers?: ExtractedTeacher[]; error?: string };
  if (payload?.error) throw new Error(payload.error);
  return Array.isArray(payload?.teachers) ? payload.teachers : [];
}

const streamKey = (grade: number, stream: string) => `${grade}|${String(stream).trim().toLowerCase()}`;

/**
 * Create the extracted teachers (with subjects + subject-class links) for a school.
 * Classes are matched to existing streams by grade + stream name; unmatched
 * classes are reported so the user can create those streams first.
 */
export async function importExtractedTeachers(
  schoolId: string,
  teachers: ExtractedTeacher[],
): Promise<{ imported: number; unmatchedClasses: string[] }> {
  const { data: streamsData } = await supabase
    .from("streams")
    .select("id, grade, stream_name")
    .eq("school_id", schoolId);
  const streams = (streamsData || []) as Array<{ id: string; grade: number; stream_name: string }>;
  const streamMap = new Map<string, string>(streams.map((s) => [streamKey(s.grade, s.stream_name), s.id]));

  // Resolve every subject name to an id in bulk, creating missing ones.
  const neededSubjects = [
    ...new Set(teachers.flatMap((t) => t.subjects).map((s) => s.trim()).filter(Boolean)),
  ];
  const subjectId = new Map<string, string>();
  if (neededSubjects.length) {
    const { data: existing } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("school_id", schoolId)
      .in("name", neededSubjects);
    (existing || []).forEach((s) => subjectId.set(s.name, s.id));
    const missing = neededSubjects.filter((n) => !subjectId.has(n));
    if (missing.length) {
      const { data: created } = await supabase
        .from("subjects")
        .insert(missing.map((name) => ({ school_id: schoolId, name })))
        .select("id, name");
      (created || []).forEach((s) => subjectId.set(s.name, s.id));
    }
  }

  let imported = 0;
  const unmatched = new Set<string>();

  for (const teacher of teachers) {
    const name = teacher.name?.trim();
    if (!name) continue;
    const emailBase = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || "teacher";
    const email = `${emailBase}.${Math.random().toString(36).slice(2, 7)}@noemail.elimutime`;

    const { data: row, error } = await supabase
      .from("teachers")
      .insert({ school_id: schoolId, name, email, max_lessons_per_week: 40 })
      .select("id")
      .single();
    if (error || !row) continue;
    imported += 1;

    const subjectIds = teacher.subjects
      .map((s) => subjectId.get(s.trim()))
      .filter((id): id is string => Boolean(id));

    if (subjectIds.length) {
      await supabase
        .from("teacher_subjects")
        .insert(subjectIds.map((subject_id) => ({ teacher_id: row.id, subject_id })));
    }

    const linkRows: Array<{ teacher_id: string; subject_id: string; stream_id: string }> = [];
    for (const subject of teacher.subjects) {
      const sid = subjectId.get(subject.trim());
      if (!sid) continue;
      for (const cls of teacher.classes || []) {
        const sId = streamMap.get(streamKey(cls.grade, cls.stream));
        if (sId) linkRows.push({ teacher_id: row.id, subject_id: sid, stream_id: sId });
        else unmatched.add(`Grade ${cls.grade} ${cls.stream}`);
      }
    }
    if (linkRows.length) {
      await supabase.from("teacher_subject_classes").insert(linkRows);
    }
  }

  return { imported, unmatchedClasses: [...unmatched] };
}
