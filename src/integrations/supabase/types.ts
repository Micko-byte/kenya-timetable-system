export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          school_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          school_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          school_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      constraints: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          level: string
          rule: string
          school_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level: string
          rule: string
          school_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string
          rule?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "constraints_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          timetable_template: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          timetable_template?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          timetable_template?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      streams: {
        Row: {
          created_at: string | null
          grade: number
          id: string
          school_id: string
          stream_name: string
        }
        Insert: {
          created_at?: string | null
          grade: number
          id?: string
          school_id: string
          stream_name: string
        }
        Update: {
          created_at?: string | null
          grade?: number
          id?: string
          school_id?: string
          stream_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "streams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          plan_type: string
          school_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_type?: string
          school_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_type?: string
          school_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assigned_classes: {
        Row: {
          id: string
          teacher_id: string
          stream_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          teacher_id: string
          stream_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          teacher_id?: string
          stream_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assigned_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assigned_classes_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_responsibilities: {
        Row: {
          id: string
          stream_id: string
          teacher_id: string
        }
        Insert: {
          id?: string
          stream_id: string
          teacher_id: string
        }
        Update: {
          id?: string
          stream_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_responsibilities_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_responsibilities_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subjects: {
        Row: {
          id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          availability: Json | null
          created_at: string | null
          email: string
          id: string
          max_lessons_per_week: number | null
          name: string
          school_id: string
          updated_at: string | null
          workload: number | null
        }
        Insert: {
          availability?: Json | null
          created_at?: string | null
          email: string
          id?: string
          max_lessons_per_week?: number | null
          name: string
          school_id: string
          updated_at?: string | null
          workload?: number | null
        }
        Update: {
          availability?: Json | null
          created_at?: string | null
          email?: string
          id?: string
          max_lessons_per_week?: number | null
          name?: string
          school_id?: string
          updated_at?: string | null
          workload?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          break_config: Json | null
          created_at: string | null
          created_by: string | null
          days_per_week: number
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          is_deployed: boolean | null
          name: string
          period_duration: number
          periods_per_day: number
          preview_image: string | null
          rules: Json | null
          school_type: string
          start_time: string
          structure_config: Json
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          break_config?: Json | null
          created_at?: string | null
          created_by?: string | null
          days_per_week?: number
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          is_deployed?: boolean | null
          name: string
          period_duration?: number
          periods_per_day?: number
          preview_image?: string | null
          rules?: Json | null
          school_type: string
          start_time?: string
          structure_config: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          break_config?: Json | null
          created_at?: string | null
          created_by?: string | null
          days_per_week?: number
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          is_deployed?: boolean | null
          name?: string
          period_duration?: number
          periods_per_day?: number
          preview_image?: string | null
          rules?: Json | null
          school_type?: string
          start_time?: string
          structure_config?: Json
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      timetables: {
        Row: {
          created_at: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          school_id: string
          stream_id: string
          template_id: string | null
          template_type: string | null
          timetable_data: Json
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          school_id: string
          stream_id: string
          template_id?: string | null
          template_type?: string | null
          timetable_data: Json
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          school_id?: string
          stream_id?: string
          template_id?: string | null
          template_type?: string | null
          timetable_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "timetables_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetables_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          file_url: string
          id: string
          school_id: string
          type: string
          uploaded_at: string | null
        }
        Insert: {
          file_url: string
          id?: string
          school_id: string
          type: string
          uploaded_at?: string | null
        }
        Update: {
          file_url?: string
          id?: string
          school_id?: string
          type?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
