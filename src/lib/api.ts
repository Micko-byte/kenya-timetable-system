const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  // System
  health: () => request<{ status: string; timestamp: string }>("/health"),

  // Templates
  getTemplates: () => request<{ templates: Record<string, unknown> }>("/api/templates"),

  // Teachers
  getTeachers: (schoolId: string) => request<{ teachers: any[] }>(`/api/teachers?school_id=${schoolId}`),
  createTeacher: (schoolId: string, body: any) =>
    request(`/api/teachers?school_id=${schoolId}`, { method: "POST", body: JSON.stringify(body) }),

  // Classes
  getClasses: (schoolId: string) => request<{ classes: any[] }>(`/api/classes?school_id=${schoolId}`),
  createClass: (schoolId: string, body: any) =>
    request(`/api/classes?school_id=${schoolId}`, { method: "POST", body: JSON.stringify(body) }),

  // Timetables
  listTimetables: (schoolId: string, limit = 10) =>
    request<{ timetables: any[] }>(`/api/timetables?school_id=${schoolId}&limit=${limit}`),
  getTimetable: (timetableId: string) => request<any>(`/api/timetables/${timetableId}`),
  exportTimetable: (timetableId: string, format: "json" | "csv" = "json") =>
    request<any>(`/api/timetables/${timetableId}/export?format=${format}`),
  generateTimetable: (schoolId: string, body: any) =>
    request(`/api/schools/${schoolId}/timetables/generate`, { method: "POST", body: JSON.stringify(body) }),

  // Past timetable upload (multipart)
  uploadPast: (schoolId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE_URL}/api/timetables/upload-past?school_id=${schoolId}`, {
      method: "POST",
      body: form,
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    });
  },

  // Auth (optional for now)
  signup: (body: { email: string; password: string; school_name: string; school_type: string }) =>
    request("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (email: string, password: string) =>
    request(`/api/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, { method: "POST" }),

  // Analytics
  analytics: (schoolId: string) => request(`/api/schools/${schoolId}/analytics`),
};


