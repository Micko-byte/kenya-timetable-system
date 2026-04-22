-- Seeding the 10 core designs for ElimuTime
-- These will be visible in the gallery for schools to choose from.

DO $$
DECLARE
    level_val public.education_level := 'eight_four_four';
    status_val public.template_status := 'published';
    days_json jsonb := '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb;
    periods_json jsonb := '[
        {"time": "8:00-8:40", "label": "Lesson 1"},
        {"time": "8:40-9:20", "label": "Lesson 2"},
        {"time": "9:20-10:00", "label": "Lesson 3"},
        {"time": "10:00-10:20", "label": "BREAK"},
        {"time": "10:20-11:00", "label": "Lesson 4"},
        {"time": "11:00-11:40", "label": "Lesson 5"},
        {"time": "11:40-12:20", "label": "Lesson 6"},
        {"time": "12:20-1:20", "label": "LUNCH"},
        {"time": "1:20-2:00", "label": "Lesson 7"},
        {"time": "2:00-2:40", "label": "Lesson 8"},
        {"time": "2:40-3:20", "label": "Games"}
    ]'::jsonb;
    -- Pre-generated basic grid (5 days x 11 periods)
    grid_json_val jsonb := '[
        [{"subject": "Mathematics", "teacher": ""}, {"subject": "English", "teacher": ""}, {"subject": "Kiswahili", "teacher": ""}, {"subject": "BREAK", "teacher": ""}, {"subject": "Science", "teacher": ""}, {"subject": "Social Studies", "teacher": ""}, {"subject": "CRE", "teacher": ""}, {"subject": "LUNCH", "teacher": ""}, {"subject": "Music", "teacher": ""}, {"subject": "Art", "teacher": ""}, {"subject": "Games", "teacher": ""}],
        [{"subject": "English", "teacher": ""}, {"subject": "Mathematics", "teacher": ""}, {"subject": "Science", "teacher": ""}, {"subject": "BREAK", "teacher": ""}, {"subject": "Kiswahili", "teacher": ""}, {"subject": "Social Studies", "teacher": ""}, {"subject": "CRE", "teacher": ""}, {"subject": "LUNCH", "teacher": ""}, {"subject": "Art", "teacher": ""}, {"subject": "Music", "teacher": ""}, {"subject": "Games", "teacher": ""}],
        [{"subject": "Science", "teacher": ""}, {"subject": "Social Studies", "teacher": ""}, {"subject": "Mathematics", "teacher": ""}, {"subject": "BREAK", "teacher": ""}, {"subject": "English", "teacher": ""}, {"subject": "Kiswahili", "teacher": ""}, {"subject": "CRE", "teacher": ""}, {"subject": "LUNCH", "teacher": ""}, {"subject": "Games", "teacher": ""}, {"subject": "Games", "teacher": ""}, {"subject": "Games", "teacher": ""}],
        [{"subject": "Social Studies", "teacher": ""}, {"subject": "Kiswahili", "teacher": ""}, {"subject": "English", "teacher": ""}, {"subject": "BREAK", "teacher": ""}, {"subject": "Mathematics", "teacher": ""}, {"subject": "Science", "teacher": ""}, {"subject": "CRE", "teacher": ""}, {"subject": "LUNCH", "teacher": ""}, {"subject": "Music", "teacher": ""}, {"subject": "Art", "teacher": ""}, {"subject": "Games", "teacher": ""}],
        [{"subject": "CRE", "teacher": ""}, {"subject": "Science", "teacher": ""}, {"subject": "Social Studies", "teacher": ""}, {"subject": "BREAK", "teacher": ""}, {"subject": "Kiswahili", "teacher": ""}, {"subject": "English", "teacher": ""}, {"subject": "Mathematics", "teacher": ""}, {"subject": "LUNCH", "teacher": ""}, {"subject": "Games", "teacher": ""}, {"subject": "Games", "teacher": ""}, {"subject": "Games", "teacher": ""}]
    ]'::jsonb;
BEGIN
    -- Classic Kenya
    INSERT INTO public.timetable_templates (name, design, level, description, theme_config, font_family, days, periods, grid_json, status, is_featured)
    VALUES ('Standard Classic', 'classic_kenya', level_val, 'The traditional Kenyan school layout.', '{
        "headerBg": "bg-primary", "headerText": "text-primary-foreground", "dayBg": "bg-secondary",
        "borderStyle": "border-2 border-border", "fontStyle": "font-display", "accent": "shadow-lg", "pattern": "",
        "palette": ["#2D9B4E", "#E88A1A", "#3B6FE8", "#E04365", "#8B45D6", "#1A8FD6", "#C9A800", "#D66A1A", "#FFFFFF", "#F5F5F5"]
    }'::jsonb, 'Inter', days_json, periods_json, grid_json_val, status_val, true)
    ON CONFLICT DO NOTHING;

    -- Modern Glass
    INSERT INTO public.timetable_templates (name, design, level, description, theme_config, font_family, days, periods, grid_json, status)
    VALUES ('Modern Professional', 'modern_glass', level_val, 'Sleek, transparent glassmorphism design.', '{
        "headerBg": "bg-gradient-to-r from-blue-600 to-indigo-700", "headerText": "text-white", "dayBg": "bg-gradient-to-r from-slate-100 to-slate-200",
        "borderStyle": "border border-white/20", "fontStyle": "font-body", "accent": "shadow-2xl backdrop-blur-sm", 
        "pattern": "bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.05),transparent)]",
        "palette": ["#3B82F6", "#6366F1", "#8B5CF6", "#2563EB", "#1D4ED8", "#4F46E5", "#E0E7FF", "#EEF2FF", "#FFFFFF", "#F1F5F9"]
    }'::jsonb, 'Roboto', days_json, periods_json, grid_json_val, status_val)
    ON CONFLICT DO NOTHING;

    -- Vibrant Colors
    INSERT INTO public.timetable_templates (name, design, level, description, theme_config, font_family, days, periods, grid_json, status)
    VALUES ('Energetic Vibrant', 'vibrant_colors', level_val, 'Warm and lively colors for active schools.', '{
        "headerBg": "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500", "headerText": "text-white", "dayBg": "bg-gradient-to-r from-amber-50 to-orange-50",
        "borderStyle": "border-2 border-orange-200", "fontStyle": "font-display", "accent": "shadow-xl shadow-orange-200/50",
        "pattern": "bg-[linear-gradient(135deg,rgba(255,165,0,0.03)_25%,transparent_25%,transparent_50%,rgba(255,165,0,0.03)_50%,rgba(255,165,0,0.03)_75%,transparent_75%)] bg-[length:20px_20px]",
        "palette": ["#F97316", "#EF4444", "#EC4899", "#F59E0B", "#FB923C", "#E11D48", "#FFF7ED", "#FEF2F2", "#FFFFFF", "#FFFBEB"]
    }'::jsonb, 'Outfit', days_json, periods_json, grid_json_val, status_val)
    ON CONFLICT DO NOTHING;

    -- Clean Minimal
    INSERT INTO public.timetable_templates (name, design, level, description, theme_config, font_family, days, periods, grid_json, status)
    VALUES ('Minimalist Pro', 'clean_minimal', level_val, 'Simple, distraction-free monochrome layout.', '{
        "headerBg": "bg-foreground", "headerText": "text-background", "dayBg": "bg-muted",
        "borderStyle": "border border-border/50", "fontStyle": "font-body", "accent": "shadow-sm", "pattern": "",
        "palette": ["#374151", "#6B7280", "#9CA3AF", "#D1D5DB", "#E5E7EB", "#F3F4F6", "#F9FAFB", "#FFFFFF", "#111827", "#1F2937"]
    }'::jsonb, 'Inter', days_json, periods_json, grid_json_val, status_val)
    ON CONFLICT DO NOTHING;

    -- Kenyan Flag
    INSERT INTO public.timetable_templates (name, design, level, description, theme_config, font_family, days, periods, grid_json, status)
    VALUES ('Patriotic Pride', 'kenyan_flag', level_val, 'Bold Kenyan national colors.', '{
        "headerBg": "bg-gradient-to-r from-black via-red-700 to-green-700", "headerText": "text-white", "dayBg": "bg-gradient-to-r from-red-50 to-green-50",
        "borderStyle": "border-2 border-green-800/30", "fontStyle": "font-display", "accent": "shadow-xl ring-2 ring-red-700/20",
        "pattern": "bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,128,0,0.02)_3px,rgba(0,128,0,0.02)_6px)]",
        "palette": ["#000000", "#B91C1C", "#15803D", "#FFFFFF", "#DC2626", "#166534", "#FEF2F2", "#F0FDF4", "#991B1B", "#14532D"]
    }'::jsonb, 'Inter', days_json, periods_json, grid_json_val, status_val)
    ON CONFLICT DO NOTHING;

    -- Midnight Black
    INSERT INTO public.timetable_templates (name, design, level, description, theme_config, font_family, days, periods, grid_json, status)
    VALUES ('Midnight Edition', 'midnight_black', level_val, 'Elegant dark mode design.', '{
        "headerBg": "bg-gradient-to-r from-gray-900 via-black to-gray-900", "headerText": "text-white", "dayBg": "bg-gray-900",
        "borderStyle": "border border-gray-700", "fontStyle": "font-body", "accent": "shadow-2xl shadow-black/40", "pattern": "",
        "palette": ["#000000", "#111827", "#1F2937", "#374151", "#4B5563", "#6B7280", "#9CA3AF", "#D1D5DB", "#FFFFFF", "#F9FAFB"]
    }'::jsonb, 'Inter', days_json, periods_json, grid_json_val, status_val)
    ON CONFLICT DO NOTHING;

    -- Slate Pro
    INSERT INTO public.timetable_templates (name, design, level, description, theme_config, font_family, days, periods, grid_json, status)
    VALUES ('Slate Professional', 'slate_pro', level_val, 'Balanced slate and gray tones.', '{
        "headerBg": "bg-gradient-to-r from-slate-700 to-slate-800", "headerText": "text-white", "dayBg": "bg-slate-100",
        "borderStyle": "border border-slate-300", "fontStyle": "font-body", "accent": "shadow-lg shadow-slate-300/50", "pattern": "",
        "palette": ["#334155", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#E2E8F0", "#F1F5F9", "#F8FAFC", "#FFFFFF", "#1E293B"]
    }'::jsonb, 'Inter', days_json, periods_json, grid_json_val, status_val)
    ON CONFLICT DO NOTHING;

    -- Monochrome
    INSERT INTO public.timetable_templates (name, design, level, description, theme_config, font_family, days, periods, grid_json, status)
    VALUES ('Classic B&W', 'monochrome', level_val, 'High contrast black and white.', '{
        "headerBg": "bg-black", "headerText": "text-white", "dayBg": "bg-white",
        "borderStyle": "border-2 border-black", "fontStyle": "font-display", "accent": "", "pattern": "",
        "palette": ["#000000", "#262626", "#404040", "#737373", "#A3A3A3", "#D4D4D4", "#E5E5E5", "#F5F5F5", "#FAFAFA", "#FFFFFF"]
    }'::jsonb, 'Inter', days_json, periods_json, grid_json_val, status_val)
    ON CONFLICT DO NOTHING;

    -- Ocean Blue
    INSERT INTO public.timetable_templates (name, design, level, description, theme_config, font_family, days, periods, grid_json, status)
    VALUES ('Ocean Breeze', 'ocean_blue', level_val, 'Calm blue and cyan gradients.', '{
        "headerBg": "bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800", "headerText": "text-white", "dayBg": "bg-gradient-to-r from-cyan-50 to-blue-50",
        "borderStyle": "border border-cyan-300", "fontStyle": "font-display", "accent": "shadow-xl shadow-blue-200/40", "pattern": "",
        "palette": ["#0891B2", "#2563EB", "#1E40AF", "#06B6D4", "#0EA5E9", "#38BDF8", "#CFFAFE", "#DBEAFE", "#FFFFFF", "#ECFEFF"]
    }'::jsonb, 'Outfit', days_json, periods_json, grid_json_val, status_val)
    ON CONFLICT DO NOTHING;

    -- Forest Green
    INSERT INTO public.timetable_templates (name, design, level, description, theme_config, font_family, days, periods, grid_json, status)
    VALUES ('Forest Nature', 'forest_green', level_val, 'Earthy green and emerald tones.', '{
        "headerBg": "bg-gradient-to-r from-emerald-800 via-green-700 to-teal-700", "headerText": "text-white", "dayBg": "bg-gradient-to-r from-emerald-50 to-green-50",
        "borderStyle": "border border-emerald-300", "fontStyle": "font-display", "accent": "shadow-xl shadow-emerald-200/40", "pattern": "",
        "palette": ["#065F46", "#15803D", "#0F766E", "#10B981", "#34D399", "#6EE7B7", "#D1FAE5", "#ECFDF5", "#FFFFFF", "#F0FDFA"]
    }'::jsonb, 'Outfit', days_json, periods_json, grid_json_val, status_val)
    ON CONFLICT DO NOTHING;

END $$;
