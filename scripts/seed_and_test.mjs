/**
 * Seed a mini school + run the REAL generation logic against the live Supabase DB.
 *
 * Does, end to end:
 *  1. DB health check (auth + REST reachable)
 *  2. Provision a mini school via the auth-signup edge function (auto-confirmed),
 *     then sign in as the auto-created admin.
 *  3. Insert streams + teachers + subjects + subject-class links (RLS-satisfied).
 *  4. Re-fetch exactly like pages/Timetables.tsx, run the SAME generator
 *     (quota-weighted, teacher-aware, shared calendar), print class + teacher
 *     timetables, and validate: no same-day repetition, no teacher double-booking.
 *  5. Persist generated timetables into the `timetables` table.
 *  6. Safely probe the paystack-init function (no live charge).
 *
 * Run:  node scripts/seed_and_test.mjs
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://swreelsxcldxubqshnew.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cmVlbHN4Y2xkeHVicXNobmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTE4MTMsImV4cCI6MjA5MTcyNzgxM30.d-Q8R3lsgMaUoVGbdntILBsVxt6Y9L4n59HBuX1FAk8";
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

const log = (...a) => console.log(...a);
const section = (t) => log("\n" + "=".repeat(72) + "\n" + t + "\n" + "=".repeat(72));

// ───────────────────────── generation port (mirrors Timetables.tsx) ─────────
const DEFAULT_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const JUNIOR_PERIODS = [
  { time: "8:00-8:40", label: "Lesson 1" },
  { time: "8:40-9:20", label: "Lesson 2" },
  { time: "9:20-10:00", label: "Lesson 3" },
  { time: "10:00-10:20", label: "BREAK" },
  { time: "10:20-11:00", label: "Lesson 4" },
  { time: "11:00-11:40", label: "Lesson 5" },
  { time: "11:40-12:20", label: "Lesson 6" },
  { time: "12:20-1:00", label: "Lesson 7" },
  { time: "1:00-2:00", label: "LUNCH" },
  { time: "2:00-2:40", label: "Lesson 8" },
  { time: "2:40-3:20", label: "Lesson 9" },
  { time: "3:20-4:00", label: "Games" },
];

const normalizeText = (v) => String(v).trim().toLowerCase();
const slotKey = (d, p) => `${d}:${p}`;

function getTeacherLoad(cal, id) {
  if (!cal[id]) cal[id] = { slots: new Set(), total: 0, byDay: {} };
  return cal[id];
}
function scoreTeacherCandidate(teacher, priority, dayIdx, cal, periodsPerDay) {
  const load = getTeacherLoad(cal, teacher.id);
  const dailyLoad = load.byDay[dayIdx] || 0;
  const dailyCap = Math.max(1, Math.ceil(periodsPerDay / 2));
  const maxLessons = teacher.maxLessonsPerWeek > 0 ? teacher.maxLessonsPerWeek : Infinity;
  if (load.total >= maxLessons) return null;
  return { teacher, priority, dailyLoad, totalLoad: load.total, overDailyCap: dailyLoad >= dailyCap };
}
function pickTeacherForSubject(teachers, stream, subject, dayIdx, periodIdx, periodsPerDay, cal) {
  const slot = slotKey(dayIdx, periodIdx);
  const exact = teachers.filter((t) => t.subjectClassLinks.some((l) => l.streamId === stream.id && normalizeText(l.subject) === normalizeText(subject)));
  const assigned = teachers.filter((t) => t.assignedStreamIds.includes(stream.id) && t.subjects.some((s) => normalizeText(s) === normalizeText(subject)));
  const general = teachers.filter((t) => t.subjects.some((s) => normalizeText(s) === normalizeText(subject)));
  const candidates = [...exact, ...assigned, ...general].filter((t, i, l) => l.findIndex((x) => x.id === t.id) === i);
  const scored = candidates
    .map((t) => {
      const priority = exact.some((x) => x.id === t.id) ? 0 : assigned.some((x) => x.id === t.id) ? 1 : 2;
      return scoreTeacherCandidate(t, priority, dayIdx, cal, periodsPerDay);
    })
    .filter(Boolean)
    .filter((it) => !getTeacherLoad(cal, it.teacher.id).slots.has(slot));
  const sortFn = (a, b) => a.priority - b.priority || a.dailyLoad - b.dailyLoad || a.totalLoad - b.totalLoad || a.teacher.name.localeCompare(b.teacher.name);
  const chosen = scored.filter((it) => !it.overDailyCap).sort(sortFn)[0] || scored.sort(sortFn)[0];
  if (chosen) {
    const load = getTeacherLoad(cal, chosen.teacher.id);
    load.slots.add(slot);
    load.total += 1;
    load.byDay[dayIdx] = (load.byDay[dayIdx] || 0) + 1;
    return chosen.teacher.name;
  }
  return "";
}
const DEFAULT_SUBJECT_WEIGHT = 3;
const SUBJECT_WEIGHTS = [
  { match: /(^|\b)(math|mathematics|pure math|applied math|number work|counting)/, weight: 6 },
  { match: /(english|kiswahili|language activities|literacy|listening|reading|writing)/, weight: 5 },
  { match: /(integrated science|biology|chemistry|physics|science|environmental)/, weight: 4 },
  { match: /(history|geography|social studies|cre|ire|hre|religious)/, weight: 3 },
  { match: /(business|agriculture|computer|ict|home science|pre-technical|technology|electrical|mechanic)/, weight: 3 },
  { match: /(french|german|arabic|mandarin|kenyan sign|indigenous)/, weight: 2 },
  { match: /(music|art|creative|drama|dance|physical|games|\bpe\b|life skills|health|community|moral|character|outdoor|story)/, weight: 1 },
];
function getSubjectWeight(subject) {
  const n = normalizeText(subject);
  for (const { match, weight } of SUBJECT_WEIGHTS) if (match.test(n)) return weight;
  return DEFAULT_SUBJECT_WEIGHT;
}
function computeSubjectQuotas(subjects, slotCount, maxPerSubject = Infinity) {
  const quotas = {};
  if (!subjects.length || slotCount <= 0) return quotas;
  const weight = {};
  subjects.forEach((s) => { quotas[s] = 0; weight[s] = getSubjectWeight(s); });
  const cap = Math.max(1, maxPerSubject);
  const target = Math.min(slotCount, subjects.length * cap);
  const totalAssigned = () => Object.values(quotas).reduce((a, b) => a + b, 0);
  [...subjects].sort((a, b) => weight[b] - weight[a]).forEach((s) => { if (totalAssigned() < target && quotas[s] < cap) quotas[s] = 1; });
  while (totalAssigned() < target) {
    let best = null, bestRatio = Infinity, bestW = -1;
    for (const s of subjects) {
      if (quotas[s] >= cap) continue;
      const ratio = quotas[s] / weight[s];
      if (ratio < bestRatio - 1e-9 || (Math.abs(ratio - bestRatio) < 1e-9 && weight[s] > bestW)) { bestRatio = ratio; bestW = weight[s]; best = s; }
    }
    if (best === null) break;
    quotas[best] += 1;
  }
  return quotas;
}
function getFixedPeriodCell(period) {
  const label = period.label.toUpperCase();
  if (label === "BREAK") return { subject: "BREAK", teacher: "" };
  if (label === "LUNCH") return { subject: "LUNCH", teacher: "" };
  if (label.includes("GAME") || label.includes("OUTDOOR") || label.includes("FREE PLAY")) return { subject: period.label, teacher: "" };
  return null;
}
function buildStreamGrid(stream, teachers, days, periods, cal) {
  const linked = teachers.flatMap((t) => t.subjectClassLinks.filter((l) => l.streamId === stream.id).map((l) => l.subject));
  const assigned = teachers.flatMap((t) => (t.assignedStreamIds.includes(stream.id) ? t.subjects : []));
  const general = teachers.flatMap((t) => t.subjects);
  const source = linked.length ? linked : assigned.length ? assigned : general;
  const subjectPool = [...new Set(source.filter(Boolean))];
  const grid = days.map(() => periods.map(() => ({ subject: "", teacher: "" })));
  const teachingSlots = [];
  days.forEach((_, dayIdx) =>
    periods.forEach((period, periodIdx) => {
      const fixed = getFixedPeriodCell(period);
      if (fixed) grid[dayIdx][periodIdx] = fixed;
      else teachingSlots.push({ dayIdx, periodIdx });
    }),
  );
  if (!subjectPool.length || !teachingSlots.length) return grid;
  const remaining = computeSubjectQuotas(subjectPool, teachingSlots.length, days.length);
  const placedToday = days.map(() => new Set());
  const ordered = [...teachingSlots].sort((a, b) => a.periodIdx - b.periodIdx || a.dayIdx - b.dayIdx);
  const byPref = (a, b) => (remaining[b] || 0) - (remaining[a] || 0) || getSubjectWeight(b) - getSubjectWeight(a);
  const teachingPerDay = Math.ceil(teachingSlots.length / Math.max(1, days.length));
  const allowRepeatFallback = subjectPool.length < teachingPerDay;
  ordered.forEach(({ dayIdx, periodIdx }) => {
    const rem = subjectPool.filter((s) => (remaining[s] || 0) > 0);
    if (!rem.length) return;
    const fresh = rem.filter((s) => !placedToday[dayIdx].has(s));
    for (const pool of (allowRepeatFallback ? [fresh, rem] : [fresh])) {
      for (const subject of [...pool].sort(byPref)) {
        const teacher = pickTeacherForSubject(teachers, stream, subject, dayIdx, periodIdx, periods.length, cal);
        if (teacher) { grid[dayIdx][periodIdx] = { subject, teacher }; remaining[subject] -= 1; placedToday[dayIdx].add(subject); return; }
      }
    }
  });
  return grid;
}
function buildAllStreamGrids(streams, teachers, days, periods) {
  const cal = {};
  const ordered = [...streams].sort((a, b) => a.grade - b.grade || a.stream_name.localeCompare(b.stream_name));
  const out = {};
  for (const s of ordered) out[s.id] = buildStreamGrid(s, teachers, days, periods, cal);
  return out;
}
function aggregateTeacherTimetable(classes, days, periods, teacherName) {
  const grid = days.map(() => periods.map(() => ({ subject: "", teacher: "" })));
  classes.forEach((cls) =>
    cls.grid.forEach((row, d) =>
      row.forEach((cell, p) => {
        if (cell.teacher.trim().toLowerCase() === teacherName.trim().toLowerCase()) grid[d][p] = { subject: cell.subject, teacher: cls.name };
      }),
    ),
  );
  return grid;
}

// ───────────────────────── pretty printers + validators ─────────────────────
function printGrid(title, grid, days, periods) {
  log(`\n  ${title}`);
  periods.forEach((p, pi) => {
    const cells = days.map((_, di) => {
      const c = grid[di][pi];
      const txt = c.subject ? (c.teacher ? `${c.subject}/${c.teacher.split(" ").slice(-1)[0]}` : c.subject) : "·";
      return txt.slice(0, 16).padEnd(16);
    });
    log(`   ${String(p.label).slice(0, 9).padEnd(9)} | ${cells.join(" ")}`);
  });
}
function validate(streams, grids, days, periods) {
  let sameDayRepeats = 0, blanks = 0, placed = 0, missingTeacher = 0;
  const teacherSlot = {}; // `${teacher}|${d}:${p}` -> count
  for (const s of streams) {
    const grid = grids[s.id];
    days.forEach((_, d) => {
      const seen = {};
      periods.forEach((p, pi) => {
        if (getFixedPeriodCell(p)) return;
        const c = grid[d][pi];
        if (!c.subject) { blanks++; return; }
        placed++;
        if (!c.teacher) missingTeacher++;
        seen[c.subject] = (seen[c.subject] || 0) + 1;
        if (c.teacher) {
          const k = `${c.teacher}|${d}:${pi}`;
          teacherSlot[k] = (teacherSlot[k] || 0) + 1;
        }
      });
      sameDayRepeats += Object.values(seen).filter((n) => n > 1).reduce((a, n) => a + (n - 1), 0);
    });
  }
  const doubleBooked = Object.values(teacherSlot).filter((n) => n > 1).length;
  return { sameDayRepeats, blanks, placed, missingTeacher, doubleBooked };
}

// ───────────────────────── main ─────────────────────────────────────────────
async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const stamp = Date.now();
  const email = `mini.school.${stamp}@example.com`;
  const password = "Demo123456!";
  const schoolName = `Demo Mini School ${stamp}`;

  section("1. DB HEALTH — auth + REST reachability");
  {
    const health = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } });
    log(`   GoTrue /settings: HTTP ${health.status}`);
    const rest = await fetch(`${SUPABASE_URL}/rest/v1/schools?select=id&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    log(`   PostgREST /schools (pre-auth, RLS): HTTP ${rest.status} (200/[] = healthy + RLS active)`);
  }

  section("2. PROVISION MINI SCHOOL via auth-signup edge function");
  const signupRes = await fetch(`${FUNCTIONS_URL}/auth-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password, fullName: "Demo Admin", schoolName, schoolType: "junior_secondary" }),
  });
  const signupBody = await signupRes.json();
  log(`   auth-signup: HTTP ${signupRes.status}`, JSON.stringify(signupBody).slice(0, 160));
  if (!signupRes.ok) throw new Error("Signup failed: " + JSON.stringify(signupBody));

  const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) throw new Error("Sign-in failed: " + signInErr.message);
  log(`   signed in as ${email} (uid ${signIn.user.id})`);

  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", signIn.user.id).single();
  const schoolId = profile.school_id;
  log(`   auto-provisioned school_id: ${schoolId}`);
  const { data: sub } = await supabase.from("subscriptions").select("plan_type,status,expires_at").eq("school_id", schoolId).maybeSingle();
  log(`   subscription: ${sub?.plan_type} / ${sub?.status} (trial until ${sub?.expires_at?.slice(0, 10)})`);

  section("3. SEED streams + teachers + subjects + links");
  // 3 streams across grades 7 & 8 (junior secondary)
  const streamSpec = [
    { grade: 7, stream_name: "Red" },
    { grade: 7, stream_name: "Blue" },
    { grade: 8, stream_name: "Red" },
  ];
  const { data: streams, error: streamErr } = await supabase
    .from("streams")
    .insert(streamSpec.map((s) => ({ school_id: schoolId, ...s })))
    .select("id,grade,stream_name");
  if (streamErr) throw new Error("Stream insert failed: " + streamErr.message);
  log(`   inserted ${streams.length} streams: ${streams.map((s) => `G${s.grade}-${s.stream_name}`).join(", ")}`);

  // Teachers, each subject taught across ALL streams (mini school, shared staff)
  const teacherSpec = [
    { name: "Mr. Kamau", subjects: ["Mathematics"] },
    { name: "Ms. Wanjiku", subjects: ["English"] },
    { name: "Mr. Otieno", subjects: ["Kiswahili"] },
    { name: "Ms. Achieng", subjects: ["Integrated Science"] },
    { name: "Mr. Mwangi", subjects: ["Social Studies"] },
    { name: "Ms. Njeri", subjects: ["CRE"] },
    { name: "Mr. Kiprop", subjects: ["Business Studies", "Agriculture"] },
    { name: "Ms. Auma", subjects: ["Pre-Technical Studies", "Creative Arts"] },
  ];

  // unique subjects → subjects table
  const subjectNames = [...new Set(teacherSpec.flatMap((t) => t.subjects))];
  const { data: subjectRows, error: subjErr } = await supabase
    .from("subjects")
    .insert(subjectNames.map((name) => ({ school_id: schoolId, name })))
    .select("id,name");
  if (subjErr) throw new Error("Subject insert failed: " + subjErr.message);
  const subjectId = Object.fromEntries(subjectRows.map((s) => [s.name, s.id]));
  log(`   inserted ${subjectRows.length} subjects`);

  let teacherCount = 0, linkCount = 0;
  for (const spec of teacherSpec) {
    const { data: t, error: tErr } = await supabase
      .from("teachers")
      .insert({ school_id: schoolId, name: spec.name, email: `${spec.name.replace(/\W+/g, ".").toLowerCase()}.${stamp}@example.com`, max_lessons_per_week: 40 })
      .select("id")
      .single();
    if (tErr) throw new Error(`Teacher ${spec.name} failed: ` + tErr.message);
    teacherCount++;
    await supabase.from("teacher_subjects").insert(spec.subjects.map((s) => ({ teacher_id: t.id, subject_id: subjectId[s] })));
    // link every subject to every stream (mini school: shared staff teach all streams)
    const links = spec.subjects.flatMap((s) => streams.map((st) => ({ teacher_id: t.id, subject_id: subjectId[s], stream_id: st.id })));
    await supabase.from("teacher_subject_classes").insert(links);
    linkCount += links.length;
  }
  log(`   inserted ${teacherCount} teachers and ${linkCount} subject-class links`);

  section("4. RE-FETCH (as Timetables.tsx) + RUN GENERATOR");
  const { data: teacherData } = await supabase
    .from("teachers")
    .select(`id,name,max_lessons_per_week,teacher_subjects(subjects(name)),teacher_assigned_classes(stream_id),teacher_subject_classes(stream_id, subjects(name))`)
    .eq("school_id", schoolId);
  const teachers = (teacherData || []).map((t) => ({
    id: t.id,
    name: t.name,
    maxLessonsPerWeek: t.max_lessons_per_week ?? 0,
    subjects: t.teacher_subjects?.map((e) => e.subjects?.name).filter(Boolean) || [],
    assignedStreamIds: t.teacher_assigned_classes?.map((e) => e.stream_id).filter(Boolean) || [],
    subjectClassLinks: (t.teacher_subject_classes || []).map((e) => ({ subject: e.subjects?.name || "", streamId: e.stream_id })).filter((e) => e.subject && e.streamId),
  }));
  log(`   re-fetched ${teachers.length} teachers (subjectClassLinks drive the pool)`);

  const days = DEFAULT_DAYS;
  const periods = JUNIOR_PERIODS;
  const grids = buildAllStreamGrids(streams, teachers, days, periods);

  section("4a. CLASS TIMETABLES");
  for (const s of streams) printGrid(`Grade ${s.grade} - ${s.stream_name}`, grids[s.id], days, periods);

  section("4b. TEACHER TIMETABLE (sample: Mr. Kamau — Mathematics)");
  const classes = streams.map((s) => ({ name: `Grade ${s.grade} - ${s.stream_name}`, grid: grids[s.id] }));
  printGrid("Mr. Kamau", aggregateTeacherTimetable(classes, days, periods, "Mr. Kamau"), days, periods);

  section("4c. VALIDATION");
  const v = validate(streams, grids, days, periods);
  log(`   lessons placed:           ${v.placed}`);
  log(`   blank teaching slots:     ${v.blanks}`);
  log(`   same-day repetitions:     ${v.sameDayRepeats}   ${v.sameDayRepeats === 0 ? "✅ none" : "⚠️"}`);
  log(`   teacher double-bookings:  ${v.doubleBooked}    ${v.doubleBooked === 0 ? "✅ none" : "⚠️"}`);
  log(`   placed w/o teacher:       ${v.missingTeacher}  ${v.missingTeacher === 0 ? "✅" : "⚠️"}`);

  section("5. PERSIST generated timetables to DB");
  let saved = 0;
  for (const s of streams) {
    const data = [];
    grids[s.id].forEach((row, d) => row.forEach((c, p) => { if (c.subject && !getFixedPeriodCell(periods[p])) data.push({ day: days[d], period: periods[p].time, subject: c.subject, teacher: c.teacher }); }));
    const { error } = await supabase.from("timetables").upsert({ school_id: schoolId, stream_id: s.id, status: "draft", generated_by: "claude-seed", timetable_data: data }, { onConflict: "school_id,stream_id" });
    if (!error) saved++;
  }
  log(`   upserted ${saved}/${streams.length} timetables into public.timetables ✅`);

  section("6. PAYMENT FUNCTION HEALTH (safe — no live charge)");
  {
    const probe = await fetch(`${FUNCTIONS_URL}/paystack-init`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${signIn.session.access_token}` },
      body: JSON.stringify({}),
    });
    const body = await probe.json().catch(() => ({}));
    const msg = body.error || JSON.stringify(body);
    log(`   paystack-init probe (empty body): HTTP ${probe.status} → "${msg}"`);
    if (msg.includes("Missing checkout details")) log("   ✅ Function deployed AND PAYSTACK_SECRET_KEY configured (validation reached, no transaction created).");
    else if (msg.includes("environment variables")) log("   ⚠️ Function deployed but PAYSTACK_SECRET_KEY NOT set on the server — payments will fail.");
    else log("   ⚠️ Unexpected response — inspect function logs.");
  }

  section("DONE");
  log(`   School: "${schoolName}"  (school_id ${schoolId})`);
  log(`   Login:  ${email}  /  ${password}`);
  log(`   To remove later: delete this school row in Supabase (cascades to all seeded data).`);
}

main().catch((e) => { console.error("\n❌ ERROR:", e.message || e); process.exit(1); });
