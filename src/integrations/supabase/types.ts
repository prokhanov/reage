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
      admin_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module: Database["public"]["Enums"]["admin_module"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module: Database["public"]["Enums"]["admin_module"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module?: Database["public"]["Enums"]["admin_module"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_prompt_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          prompt_text: string
          updated_at: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          prompt_text: string
          updated_at?: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          prompt_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      analyses: {
        Row: {
          biological_age: number | null
          created_at: string
          date: string
          health_index: number | null
          id: string
          lab_name: string | null
          note: string | null
          status: Database["public"]["Enums"]["analysis_status"]
          user_id: string
        }
        Insert: {
          biological_age?: number | null
          created_at?: string
          date: string
          health_index?: number | null
          id?: string
          lab_name?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["analysis_status"]
          user_id: string
        }
        Update: {
          biological_age?: number | null
          created_at?: string
          date?: string
          health_index?: number | null
          id?: string
          lab_name?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["analysis_status"]
          user_id?: string
        }
        Relationships: []
      }
      analysis_values: {
        Row: {
          analysis_id: string
          biomarker_id: string
          created_at: string
          id: string
          unit_override: string | null
          value: number
        }
        Insert: {
          analysis_id: string
          biomarker_id: string
          created_at?: string
          id?: string
          unit_override?: string | null
          value: number
        }
        Update: {
          analysis_id?: string
          biomarker_id?: string
          created_at?: string
          id?: string
          unit_override?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "analysis_values_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_values_biomarker_id_fkey"
            columns: ["biomarker_id"]
            isOneToOne: false
            referencedRelation: "biomarkers"
            referencedColumns: ["id"]
          },
        ]
      }
      biomarkers: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          normal_max: number | null
          normal_min: number | null
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          normal_max?: number | null
          normal_min?: number | null
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          normal_max?: number | null
          normal_min?: number | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          created_at: string
          goals: string | null
          id: string
          lifestyle: string | null
          main_complaints: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          goals?: string | null
          id?: string
          lifestyle?: string | null
          main_complaints?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          goals?: string | null
          id?: string
          lifestyle?: string | null
          main_complaints?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invite_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          invited_email: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          invited_email?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      medical_conditions_templates: {
        Row: {
          category: string
          condition: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          category: string
          condition: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_history: {
        Row: {
          category: string
          condition: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          category: string
          condition: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      prescription_adherence: {
        Row: {
          adherence_level: number
          created_at: string
          id: string
          prescription_id: string
          tracked_at: string
          user_id: string
        }
        Insert: {
          adherence_level: number
          created_at?: string
          id?: string
          prescription_id: string
          tracked_at?: string
          user_id: string
        }
        Update: {
          adherence_level?: number
          created_at?: string
          id?: string
          prescription_id?: string
          tracked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_adherence_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          analysis_id: string | null
          control_date: string | null
          created_at: string
          created_by: string | null
          effect: string | null
          id: string
          is_archived: boolean
          prescription: string
          status: Database["public"]["Enums"]["prescription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          control_date?: string | null
          created_at?: string
          created_by?: string | null
          effect?: string | null
          id?: string
          is_archived?: boolean
          prescription: string
          status?: Database["public"]["Enums"]["prescription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          control_date?: string | null
          created_at?: string
          created_by?: string | null
          effect?: string | null
          id?: string
          is_archived?: boolean
          prescription?: string
          status?: Database["public"]["Enums"]["prescription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string
          created_at: string
          gender: string
          height: number | null
          id: string
          name: string
          telegram_id: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          birth_date: string
          created_at?: string
          gender: string
          height?: number | null
          id: string
          name: string
          telegram_id?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          birth_date?: string
          created_at?: string
          gender?: string
          height?: number | null
          id?: string
          name?: string
          telegram_id?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          analysis_id: string | null
          created_at: string
          id: string
          text: string
          type: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          id?: string
          text: string
          type: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          id?: string
          text?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_symptoms: {
        Row: {
          category: string
          created_at: string
          id: string
          severity: number
          symptom: string
          tracked_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          severity: number
          symptom: string
          tracked_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          severity?: number
          symptom?: string
          tracked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weight_history: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_admin_permission: {
        Args: {
          _module: Database["public"]["Enums"]["admin_module"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      admin_module:
        | "ai_settings"
        | "data_management"
        | "patients"
        | "user_management"
      analysis_status: "on_review" | "processed"
      app_role: "user" | "admin" | "superadmin" | "doctor"
      prescription_status: "on_review" | "confirmed"
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
      admin_module: [
        "ai_settings",
        "data_management",
        "patients",
        "user_management",
      ],
      analysis_status: ["on_review", "processed"],
      app_role: ["user", "admin", "superadmin", "doctor"],
      prescription_status: ["on_review", "confirmed"],
    },
  },
} as const
