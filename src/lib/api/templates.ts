import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { toast } from "sonner";

type TemplateRow = Database["public"]["Tables"]["templates"]["Row"];
type TemplateInsert = Database["public"]["Tables"]["templates"]["Insert"];

function asObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function hydrateTemplate(row: TemplateRow): Template {
  const structureConfig = asObject(row.structure_config);
  const content = {
    ...structureConfig,
    name: row.name,
    description: row.description,
    preview_image: row.preview_image,
    school_type: row.school_type,
    periods_per_day: row.periods_per_day,
    period_duration: row.period_duration,
    days_per_week: row.days_per_week,
    start_time: row.start_time,
    end_time: row.end_time,
    break_config: row.break_config,
    structure_config: row.structure_config,
    rules: (row as Template & { rules?: Json | null }).rules ?? null,
  };

  return {
    ...row,
    content,
  };
}

function buildTemplatePayload(
  templateData: TemplateInput,
  existing?: TemplateRow
): TemplateInsert {
  const content = asObject(templateData.content ?? existing?.structure_config);
  const structureConfig = asObject(templateData.structure_config ?? content.structure_config ?? content);
  const periodsPerDay =
    templateData.periods_per_day ??
    existing?.periods_per_day ??
    content.periods_per_day ??
    (Array.isArray(content.periods) ? content.periods.length : undefined);
  const daysPerWeek =
    templateData.days_per_week ??
    existing?.days_per_week ??
    content.days_per_week ??
    (Array.isArray(content.days) ? content.days.length : undefined);

  return {
    name: templateData.name ?? existing?.name ?? content.name ?? "Untitled Template",
    type: templateData.type ?? existing?.type ?? "graphical",
    status: templateData.status ?? existing?.status ?? "draft",
    is_deployed: templateData.is_deployed ?? existing?.is_deployed ?? false,
    is_active: templateData.is_active ?? existing?.is_active ?? true,
    school_type: templateData.school_type ?? existing?.school_type ?? content.school_type ?? null,
    preview_image: templateData.preview_image ?? existing?.preview_image ?? content.preview_image ?? null,
    description: templateData.description ?? existing?.description ?? content.description ?? null,
    periods_per_day: periodsPerDay ?? null,
    period_duration: templateData.period_duration ?? existing?.period_duration ?? content.period_duration ?? null,
    days_per_week: daysPerWeek ?? null,
    start_time: templateData.start_time ?? existing?.start_time ?? content.start_time ?? null,
    end_time: templateData.end_time ?? existing?.end_time ?? content.end_time ?? null,
    break_config: (templateData.break_config ?? existing?.break_config ?? content.breaks ?? content.break_config ?? null) as Json | null,
    structure_config: (Object.keys(structureConfig).length > 0 ? structureConfig : content) as Json,
    created_by: templateData.created_by ?? existing?.created_by ?? null,
  };
}

export type Template = TemplateRow & {
  content?: any;
  structure_config?: Json | null;
  rules?: Json | null;
  usage_count?: number | null;
};

// Loose input for create/update: callers pass structured objects for
// structure_config / break_config / content that get serialized to Json here.
export type TemplateInput = Partial<
  Omit<Template, "structure_config" | "break_config" | "content" | "rules">
> & {
  name?: string;
  structure_config?: unknown;
  break_config?: unknown;
  content?: unknown;
  rules?: unknown;
};

export interface UploadedImage {
  id: string;
  file_url: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
  template_id?: string;
}

export const templatesApi = {
  // Create a new template
  async createTemplate(templateData: TemplateInput) {
    try {
      const payload = buildTemplatePayload(templateData);
      const { data, error } = await supabase
        .from("templates")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return hydrateTemplate(data as TemplateRow);
    } catch (error: any) {
      toast.error(`Failed to create template: ${error.message}`);
      throw error;
    }
  },

  // Update an existing template
  async updateTemplate(id: string, templateData: TemplateInput) {
    try {
      const { data: existing, error: existingError } = await supabase
        .from("templates")
        .select("*")
        .eq("id", id)
        .single();

      if (existingError) throw existingError;

      const payload = buildTemplatePayload(templateData, existing as TemplateRow);
      const { data, error } = await supabase
        .from("templates")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return hydrateTemplate(data as TemplateRow);
    } catch (error: any) {
      toast.error(`Failed to update template: ${error.message}`);
      throw error;
    }
  },

  // Deploy a template
  async deployTemplate(templateId: string) {
    try {
      // Get current user to attribute the deployment
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;

      // First, update template status and convenience flag
      const { error: templateError } = await supabase
        .from("templates")
        .update({ status: "deployed", is_deployed: true })
        .eq("id", templateId);

      if (templateError) throw templateError;

      // Then create deployment record with deployed_by
      const { error: deployError } = await supabase
        .from("deployed_templates")
        .insert([{ template_id: templateId, deployed_by: user?.id }]);

      if (deployError) throw deployError;

      toast.success("Template deployed successfully");
    } catch (error: any) {
      toast.error(`Failed to deploy template: ${error.message}`);
      throw error;
    }
  },

  // Upload an image for a template
  async uploadImage(file: File, templateId?: string, uploadSession?: string) {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `template-images/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("templates")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("templates")
        .getPublicUrl(filePath);

      // Get current user for uploaded_by
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw userErr || new Error("User not authenticated");

      // Create database record
      const insertPayload: any = {
        file_url: publicUrl,
        file_name: fileName,
        template_id: templateId ?? null,
        uploaded_by: user.id,
      };
      if (uploadSession) insertPayload.upload_session = uploadSession;

      const { data, error: dbError } = await supabase
        .from("uploaded_images")
        .insert([insertPayload])
        .select()
        .single();

      if (dbError) throw dbError;

      // If a templateId was provided, also set this image as the template preview
      if (templateId) {
        const { error: updateErr } = await supabase
          .from("templates")
          .update({ preview_image: publicUrl })
          .eq("id", templateId);

        if (updateErr) {
          // Don't fail the whole upload for preview update, but log
          console.warn("Failed to update template preview:", updateErr.message);
        }
      }

      return data;
    } catch (error: any) {
      toast.error(`Failed to upload image: ${error.message}`);
      throw error;
    }
  },

  // Associate pending uploads belonging to an upload session to a template
  async associateUploads(uploadSession: string, templateId: string) {
    try {
      const { error } = await supabase
        .from("uploaded_images")
        .update({ template_id: templateId, upload_session: null })
        .eq("upload_session", uploadSession);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast.error(`Failed to associate uploads: ${error.message}`);
      throw error;
    }
  },

  // Delete a template and its related resources (images, deployments)
  async deleteTemplate(templateId: string) {
    try {
      // fetch images for template
      const { data: images, error: imgErr } = await supabase
        .from("uploaded_images")
        .select("*")
        .eq("template_id", templateId);

      if (imgErr) throw imgErr;

      // remove files from storage
      if (images && images.length > 0) {
        const fileNames = images.map((i: any) => `template-images/${i.file_name}`);
        const { error: remErr } = await supabase.storage
          .from("templates")
          .remove(fileNames);
        if (remErr) console.warn("Failed to remove some files from storage:", remErr.message);
      }

      // delete uploaded_images records
      const { error: delImgsErr } = await supabase
        .from("uploaded_images")
        .delete()
        .eq("template_id", templateId);
      if (delImgsErr) throw delImgsErr;

      // delete deployed_templates records
      const { error: delDeployErr } = await supabase
        .from("deployed_templates")
        .delete()
        .eq("template_id", templateId);
      if (delDeployErr) throw delDeployErr;

      // finally delete template
      const { error: delTemplateErr } = await supabase
        .from("templates")
        .delete()
        .eq("id", templateId);
      if (delTemplateErr) throw delTemplateErr;

      toast.success("Template deleted");
      return true;
    } catch (error: any) {
      toast.error(`Failed to delete template: ${error.message}`);
      throw error;
    }
  },

  // Get images for a template
  async getTemplateImages(templateId: string) {
    try {
      const { data, error } = await supabase
        .from("uploaded_images")
        .select("*")
        .eq("template_id", templateId);

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast.error(`Failed to fetch template images: ${error.message}`);
      throw error;
    }
  },

  // Delete an uploaded image
  async deleteImage(imageId: string) {
    try {
      const { data: image, error: fetchError } = await supabase
        .from("uploaded_images")
        .select("file_name")
        .eq("id", imageId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("templates")
        .remove([`template-images/${image.file_name}`]);

      if (storageError) throw storageError;

      // Delete database record
      const { error: dbError } = await supabase
        .from("uploaded_images")
        .delete()
        .eq("id", imageId);

      if (dbError) throw dbError;

      // If this image was set as a template preview, clear it
      try {
        const { data: maybeTemplate } = await supabase
          .from("templates")
          .select("id, preview_image")
          .eq("preview_image", image.file_url)
          .single();

        if (maybeTemplate?.id) {
          await supabase
            .from("templates")
            .update({ preview_image: null })
            .eq("id", maybeTemplate.id);
        }
      } catch (e) {
        // non-fatal
      }

      toast.success("Image deleted successfully");
    } catch (error: any) {
      toast.error(`Failed to delete image: ${error.message}`);
      throw error;
    }
  },

  // Get all templates (with optional filters)
  async getTemplates(filters?: { status?: "draft" | "deployed"; type?: "graphical" | "form" }) {
    try {
      let query = supabase.from("templates").select("*");

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.type) {
        query = query.eq("type", filters.type);
      }

      const { data, error } = await query;

      // debug log to help diagnose empty results / RLS issues
      console.debug("[templatesApi] getTemplates result:", { data, error, filters });

      if (error) throw error;
      return (data || []).map((row) => hydrateTemplate(row as TemplateRow));
    } catch (error: any) {
      toast.error(`Failed to fetch templates: ${error.message}`);
      throw error;
    }
  },

  // Get a single template by id
  async getTemplate(id: string) {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return hydrateTemplate(data as TemplateRow);
    } catch (error: any) {
      toast.error(`Failed to fetch template: ${error.message}`);
      throw error;
    }
  },

  // Get deployed templates available to users
  async getDeployedTemplates() {
    try {
      // Return templates that are marked deployed (status) or have the convenience flag
      const { data, error } = await supabase
        .from("templates")
        .select("*, deployed_templates(*)")
        .or("status.eq.deployed,is_deployed.eq.true")
        .eq("is_active", true);

      if (error) throw error;
      return (data || []).map((row) => hydrateTemplate(row as TemplateRow));
    } catch (error: any) {
      toast.error(`Failed to fetch deployed templates: ${error.message}`);
      throw error;
    }
  },
};
