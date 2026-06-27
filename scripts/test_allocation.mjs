/**
 * Pure (no-DB) check that the generator only places a teacher in streams they
 * are ALLOCATED to. Mirrors the fixed logic in pages/Timetables.tsx.
 *   node scripts/test_allocation.mjs
 */
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [
  { time: "8:00-8:40", label: "Lesson 1" }, { time: "8:40-9:20", label: "Lesson 2" },
  { time: "9:20-10:00", label: "Lesson 3" }, { time: "10:00-10:20", label: "BREAK" },
  { time: "10:20-11:00", label: "Lesson 4" }, { time: "11:00-11:40", label: "Lesson 5" },
  { time: "11:40-12:20", label: "Lesson 6" }, { time: "1:00-2:00", label: "LUNCH" },
  { time: "2:00-2:40", label: "Lesson 7" }, { time: "2:40-3:20", label: "Lesson 8" },
];
const norm = (v) => String(v).trim().toLowerCase();
const slotKey = (d, p) => `${d}:${p}`;
function load(cal, id) { if (!cal[id]) cal[id] = { slots: new Set(), total: 0, byDay: {} }; return cal[id]; }
function score(t, priority, dayIdx, cal, ppd) {
  const l = load(cal, t.id); const dailyLoad = l.byDay[dayIdx] || 0;
  const cap = Math.max(1, Math.ceil(ppd / 2));
  const max = t.maxLessonsPerWeek > 0 ? t.maxLessonsPerWeek : Infinity;
  if (l.total >= max) return null;
  return { teacher: t, priority, dailyLoad, totalLoad: l.total, overDailyCap: dailyLoad >= cap };
}
// === the FIXED allocation logic (exact + assigned only; no general fallback) ===
function pickTeacher(teachers, stream, subject, dayIdx, periodIdx, ppd, cal) {
  const slot = slotKey(dayIdx, periodIdx);
  const exact = teachers.filter((t) => t.subjectClassLinks.some((l) => l.streamId === stream.id && norm(l.subject) === norm(subject)));
  const assigned = teachers.filter((t) => t.assignedStreamIds.includes(stream.id) && t.subjects.some((s) => norm(s) === norm(subject)));
  const candidates = [...exact, ...assigned].filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i);
  const scored = candidates
    .map((t) => score(t, exact.some((x) => x.id === t.id) ? 0 : 1, dayIdx, cal, ppd))
    .filter(Boolean)
    .filter((it) => !load(cal, it.teacher.id).slots.has(slot));
  const sortFn = (a, b) => a.priority - b.priority || a.dailyLoad - b.dailyLoad || a.totalLoad - b.totalLoad || a.teacher.name.localeCompare(b.teacher.name);
  const chosen = scored.filter((it) => !it.overDailyCap).sort(sortFn)[0] || scored.sort(sortFn)[0];
  if (chosen) { const l = load(cal, chosen.teacher.id); l.slots.add(slot); l.total++; l.byDay[dayIdx] = (l.byDay[dayIdx] || 0) + 1; return chosen.teacher.name; }
  return "";
}
function fixedCell(p) { const lbl = p.label.toUpperCase(); if (lbl === "BREAK") return { subject: "BREAK", teacher: "" }; if (lbl === "LUNCH") return { subject: "LUNCH", teacher: "" }; return null; }
function buildStreamGrid(stream, teachers, days, periods, cal) {
  const linked = teachers.flatMap((t) => t.subjectClassLinks.filter((l) => l.streamId === stream.id).map((l) => l.subject));
  const assigned = teachers.flatMap((t) => (t.assignedStreamIds.includes(stream.id) ? t.subjects : []));
  const pool = [...new Set([...linked, ...assigned].filter(Boolean))];
  const grid = days.map(() => periods.map(() => ({ subject: "", teacher: "" })));
  const slots = [];
  days.forEach((_, d) => periods.forEach((p, pi) => { const f = fixedCell(p); if (f) grid[d][pi] = f; else slots.push({ d, pi }); }));
  if (!pool.length || !slots.length) return grid;
  const remaining = {}; pool.forEach((s) => (remaining[s] = days.length));
  const placedToday = days.map(() => new Set());
  const ordered = [...slots].sort((a, b) => a.pi - b.pi || a.d - b.d);
  ordered.forEach(({ d, pi }) => {
    const avail = pool.filter((s) => remaining[s] > 0 && !placedToday[d].has(s));
    for (const subject of avail) {
      const teacher = pickTeacher(teachers, stream, subject, d, pi, periods.length, cal);
      if (teacher) { grid[d][pi] = { subject, teacher }; remaining[subject]--; placedToday[d].add(subject); return; }
    }
  });
  return grid;
}

// scenario: Kamau teaches Math for G7 only; Korir teaches Math for G8 only.
const streams = [
  { id: "s7red", grade: 7, stream_name: "Red" },
  { id: "s7blue", grade: 7, stream_name: "Blue" },
  { id: "s8red", grade: 8, stream_name: "Red" },
];
const L = (subject, ...streamIds) => streamIds.map((streamId) => ({ subject, streamId }));
const T = (id, name, subjects, links) => ({ id, name, maxLessonsPerWeek: 40, subjects, assignedStreamIds: [], subjectClassLinks: links });
const teachers = [
  T("kamau", "Mr. Kamau", ["Mathematics"], L("Mathematics", "s7red", "s7blue")),
  T("korir", "Mr. Korir", ["Mathematics"], L("Mathematics", "s8red")),
  T("wanjiku", "Ms. Wanjiku", ["English"], L("English", "s7red", "s7blue", "s8red")),
  T("otieno", "Mr. Otieno", ["Kiswahili"], L("Kiswahili", "s7red", "s7blue", "s8red")),
  T("achieng", "Ms. Achieng", ["Integrated Science"], L("Integrated Science", "s7red", "s7blue", "s8red")),
  T("mwangi", "Mr. Mwangi", ["Social Studies"], L("Social Studies", "s7red", "s7blue", "s8red")),
  T("njeri", "Ms. Njeri", ["CRE"], L("CRE", "s7red", "s7blue", "s8red")),
];

const cal = {};
const grids = {};
for (const s of streams) grids[s.id] = buildStreamGrid(s, teachers, DAYS, PERIODS, cal);

const allowed = {};
for (const s of streams) allowed[s.id] = new Set(teachers.filter((t) => t.subjectClassLinks.some((l) => l.streamId === s.id)).map((t) => t.name));

let leaks = 0, placed = 0;
const teacherStreams = {};
for (const s of streams) {
  for (const row of grids[s.id]) {
    for (const c of row) {
      if (!c.teacher) continue;
      placed++;
      if (!teacherStreams[c.teacher]) teacherStreams[c.teacher] = new Set();
      teacherStreams[c.teacher].add(`G${s.grade}-${s.stream_name}`);
      if (!allowed[s.id].has(c.teacher)) { leaks++; console.log(`  LEAK: ${c.teacher} placed in G${s.grade}-${s.stream_name} (not allocated)`); }
    }
  }
}

console.log("Teacher -> streams they were placed in:");
for (const [name, set] of Object.entries(teacherStreams)) console.log(`  ${name.padEnd(12)} -> ${[...set].join(", ")}`);
const kamau = [...(teacherStreams["Mr. Kamau"] || [])];
const korir = [...(teacherStreams["Mr. Korir"] || [])];
console.log(`\nlessons placed: ${placed}`);
console.log(`allocation leaks: ${leaks}   ${leaks === 0 ? "OK - no teacher leaked into an unallocated class" : "FAIL"}`);
console.log(`Mr. Kamau only in G7? ${kamau.length > 0 && kamau.every((s) => s.startsWith("G7")) ? "YES" : "NO"}  (${kamau.join(", ")})`);
console.log(`Mr. Korir only in G8? ${korir.length > 0 && korir.every((s) => s.startsWith("G8")) ? "YES" : "NO"}  (${korir.join(", ")})`);
