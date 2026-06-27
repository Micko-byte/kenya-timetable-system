import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.69.0";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

// Chunked base64 — avoids stack overflow on large files.
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Tool the model must call — gives us strict, structured JSON back.
const extractionTool = {
  name: "submit_teachers",
  description:
    "Submit the teachers found in the timetable, the subjects each teaches, and the classes (grade + stream) each teaches.",
  input_schema: {
    type: "object",
    properties: {
      teachers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Teacher's full name as written" },
            subjects: { type: "array", items: { type: "string" }, description: "Subjects this teacher teaches" },
            classes: {
              type: "array",
              description: "Classes this teacher teaches",
              items: {
                type: "object",
                properties: {
                  grade: { type: "integer", description: "Grade/Form number, e.g. 7 for 'Grade 7' or 2 for 'Form 2A'" },
                  stream: { type: "string", description: "Stream/class name, e.g. 'Red', 'A', 'East', 'Green'" },
                },
                required: ["grade", "stream"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "subjects", "classes"],
          additionalProperties: false,
        },
      },
    },
    required: ["teachers"],
    additionalProperties: false,
  },
} as const;

const INSTRUCTION =
  "Extract every teacher present in this school timetable. For each teacher, list the subject(s) they teach and the class(es) they teach. " +
  "A class is a grade number plus a stream name — map 'Grade 7 Red' to grade 7 stream 'Red', 'Form 2A' to grade 2 stream 'A', '6 Green' to grade 6 stream 'Green'. " +
  "Only include teachers actually shown in the timetable — never invent people. If a teacher's subject or class is implied but not labelled, infer it from the grid. " +
  "Respond ONLY by calling the submit_teachers tool.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("Server is missing ANTHROPIC_API_KEY. Set it as a Supabase function secret.");
    }

    const { fileUrl } = await req.json();
    if (!fileUrl) {
      throw new Error("fileUrl is required.");
    }

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      throw new Error("Could not download the uploaded file.");
    }
    const contentType = (fileRes.headers.get("content-type") || "").toLowerCase();
    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    const ext = (fileUrl.split("?")[0].split(".").pop() || "").toLowerCase();

    // Build the user content block depending on the file kind.
    let fileBlocks: unknown[];
    if (ext === "xlsx" || ext === "xls" || contentType.includes("sheet") || contentType.includes("excel")) {
      const wb = XLSX.read(bytes, { type: "array" });
      const text = wb.SheetNames
        .map((name) => `# Sheet: ${name}\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`)
        .join("\n\n")
        .slice(0, 100000);
      fileBlocks = [{ type: "text", text: `School timetable exported as CSV:\n\n${text}` }];
    } else if (ext === "pdf" || contentType.includes("pdf")) {
      fileBlocks = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: toBase64(bytes) } },
      ];
    } else {
      const media = contentType.includes("png")
        ? "image/png"
        : contentType.includes("webp")
          ? "image/webp"
          : contentType.includes("gif")
            ? "image/gif"
            : "image/jpeg";
      fileBlocks = [
        { type: "image", source: { type: "base64", media_type: media, data: toBase64(bytes) } },
      ];
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      tools: [extractionTool],
      tool_choice: { type: "tool", name: "submit_teachers" },
      messages: [
        {
          role: "user",
          content: [...fileBlocks, { type: "text", text: INSTRUCTION }] as never,
        },
      ],
    });

    const toolUse = message.content.find(
      (block: { type: string }) => block.type === "tool_use",
    ) as { input?: { teachers?: unknown[] } } | undefined;
    const teachers = Array.isArray(toolUse?.input?.teachers) ? toolUse!.input!.teachers : [];

    return Response.json(
      { data: { teachers } },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to parse the timetable." },
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
