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
          biomarkers_metadata: Json | null
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
          biomarkers_metadata?: Json | null
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
          biomarkers_metadata?: Json | null
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
      analysis_bookings: {
        Row: {
          address: string
          assigned_staff_id: string | null
          booking_date: string
          booking_time: string
          created_at: string
          id: string
          next_analysis_date: string | null
          slot_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          assigned_staff_id?: string | null
          booking_date: string
          booking_time: string
          created_at?: string
          id?: string
          next_analysis_date?: string | null
          slot_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          assigned_staff_id?: string | null
          booking_date?: string
          booking_time?: string
          created_at?: string
          id?: string
          next_analysis_date?: string | null
          slot_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_bookings_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
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
      availability_slots: {
        Row: {
          booked_count: number
          created_at: string
          date: string
          id: string
          is_active: boolean
          time_slot: string
          total_capacity: number
          updated_at: string
        }
        Insert: {
          booked_count?: number
          created_at?: string
          date: string
          id?: string
          is_active?: boolean
          time_slot: string
          total_capacity?: number
          updated_at?: string
        }
        Update: {
          booked_count?: number
          created_at?: string
          date?: string
          id?: string
          is_active?: boolean
          time_slot?: string
          total_capacity?: number
          updated_at?: string
        }
        Relationships: []
      }
      availability_templates: {
        Row: {
          created_at: string
          days_of_week: number[]
          id: string
          is_active: boolean
          name: string
          time_slots: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_of_week: number[]
          id?: string
          is_active?: boolean
          name: string
          time_slots: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          is_active?: boolean
          name?: string
          time_slots?: Json
          updated_at?: string
        }
        Relationships: []
      }
      biomarker_categories: {
        Row: {
          created_at: string
          display_order: number
          emoji: string
          expert_role: string
          expert_specialization: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          emoji?: string
          expert_role: string
          expert_specialization: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          emoji?: string
          expert_role?: string
          expert_specialization?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      biomarkers: {
        Row: {
          age_ranges: Json | null
          aging_weight: number
          category: string
          code: string
          created_at: string
          critical_max: number | null
          critical_max_female: number | null
          critical_max_male: number | null
          critical_min: number | null
          critical_min_female: number | null
          critical_min_male: number | null
          description: string | null
          display_order: number
          id: string
          name: string
          normal_max: number | null
          normal_max_female: number | null
          normal_max_male: number | null
          normal_min: number | null
          normal_min_female: number | null
          normal_min_male: number | null
          optimal_max: number | null
          optimal_max_female: number | null
          optimal_max_male: number | null
          optimal_min: number | null
          optimal_min_female: number | null
          optimal_min_male: number | null
          range_mode: string
          unit: string
          updated_at: string
        }
        Insert: {
          age_ranges?: Json | null
          aging_weight?: number
          category: string
          code: string
          created_at?: string
          critical_max?: number | null
          critical_max_female?: number | null
          critical_max_male?: number | null
          critical_min?: number | null
          critical_min_female?: number | null
          critical_min_male?: number | null
          description?: string | null
          display_order?: number
          id?: string
          name: string
          normal_max?: number | null
          normal_max_female?: number | null
          normal_max_male?: number | null
          normal_min?: number | null
          normal_min_female?: number | null
          normal_min_male?: number | null
          optimal_max?: number | null
          optimal_max_female?: number | null
          optimal_max_male?: number | null
          optimal_min?: number | null
          optimal_min_female?: number | null
          optimal_min_male?: number | null
          range_mode?: string
          unit: string
          updated_at?: string
        }
        Update: {
          age_ranges?: Json | null
          aging_weight?: number
          category?: string
          code?: string
          created_at?: string
          critical_max?: number | null
          critical_max_female?: number | null
          critical_max_male?: number | null
          critical_min?: number | null
          critical_min_female?: number | null
          critical_min_male?: number | null
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          normal_max?: number | null
          normal_max_female?: number | null
          normal_max_male?: number | null
          normal_min?: number | null
          normal_min_female?: number | null
          normal_min_male?: number | null
          optimal_max?: number | null
          optimal_max_female?: number | null
          optimal_max_male?: number | null
          optimal_min?: number | null
          optimal_min_female?: number | null
          optimal_min_male?: number | null
          range_mode?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_mode_settings: {
        Row: {
          callback_phone: string | null
          created_at: string
          id: string
          mode: string
          online_status_texts: Json
          phone_status_texts: Json
          singleton: boolean
          updated_at: string
        }
        Insert: {
          callback_phone?: string | null
          created_at?: string
          id?: string
          mode?: string
          online_status_texts?: Json
          phone_status_texts?: Json
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          callback_phone?: string | null
          created_at?: string
          id?: string
          mode?: string
          online_status_texts?: Json
          phone_status_texts?: Json
          singleton?: boolean
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
      confirmation_reminder_log: {
        Row: {
          id: string
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      confirmation_reminder_settings: {
        Row: {
          enabled: boolean
          first_delay_hours: number
          frequency_hours: number
          id: string
          max_reminders: number
          reminder_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          first_delay_hours?: number
          frequency_hours?: number
          id?: string
          max_reminders?: number
          reminder_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          first_delay_hours?: number
          frequency_hours?: number
          id?: string
          max_reminders?: number
          reminder_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      default_slot_settings: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          time_slot: string
          total_capacity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          time_slot: string
          total_capacity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          time_slot?: string
          total_capacity?: number
          updated_at?: string
        }
        Relationships: []
      }
      demo_data_templates: {
        Row: {
          created_at: string | null
          description: string | null
          female_data: Json
          id: string
          male_data: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          female_data: Json
          id?: string
          male_data: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          female_data?: Json
          id?: string
          male_data?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      email_drip_schedule: {
        Row: {
          attempt: number
          created_at: string
          error_message: string | null
          id: string
          send_at: string
          sent_at: string | null
          series_id: string
          skip_reason: string | null
          status: Database["public"]["Enums"]["drip_schedule_status"]
          step_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          error_message?: string | null
          id?: string
          send_at: string
          sent_at?: string | null
          series_id: string
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["drip_schedule_status"]
          step_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt?: number
          created_at?: string
          error_message?: string | null
          id?: string
          send_at?: string
          sent_at?: string | null
          series_id?: string
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["drip_schedule_status"]
          step_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drip_schedule_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "email_drip_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drip_schedule_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "email_drip_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      email_drip_series: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger_config: Json
          trigger_type: Database["public"]["Enums"]["drip_trigger_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_config?: Json
          trigger_type?: Database["public"]["Enums"]["drip_trigger_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_config?: Json
          trigger_type?: Database["public"]["Enums"]["drip_trigger_type"]
          updated_at?: string
        }
        Relationships: []
      }
      email_drip_steps: {
        Row: {
          body_markdown: string
          cancel_conditions: Json
          created_at: string
          cta_label: string | null
          cta_url: string | null
          delay_unit: Database["public"]["Enums"]["drip_delay_unit"]
          delay_value: number
          id: string
          is_active: boolean
          order_index: number
          preheader: string | null
          send_time_local: string | null
          series_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_markdown?: string
          cancel_conditions?: Json
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          delay_unit?: Database["public"]["Enums"]["drip_delay_unit"]
          delay_value?: number
          id?: string
          is_active?: boolean
          order_index?: number
          preheader?: string | null
          send_time_local?: string | null
          series_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_markdown?: string
          cancel_conditions?: Json
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          delay_unit?: Database["public"]["Enums"]["drip_delay_unit"]
          delay_value?: number
          id?: string
          is_active?: boolean
          order_index?: number
          preheader?: string | null
          send_time_local?: string | null
          series_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drip_steps_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "email_drip_series"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_sender_settings: {
        Row: {
          id: string
          sender_domain: string
          sender_email: string
          sender_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          sender_domain?: string
          sender_email?: string
          sender_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          sender_domain?: string
          sender_email?: string
          sender_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_text: string
          button_label: string | null
          footer_text: string
          heading: string
          id: string
          subject: string
          template_type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          body_text: string
          button_label?: string | null
          footer_text: string
          heading: string
          id?: string
          subject: string
          template_type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          body_text?: string
          button_label?: string | null
          footer_text?: string
          heading?: string
          id?: string
          subject?: string
          template_type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          email: string
          id: string
          reason: string | null
          scope: string
          unsubscribed_at: string
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          reason?: string | null
          scope: string
          unsubscribed_at?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          reason?: string | null
          scope?: string
          unsubscribed_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      health_strategy_snapshots: {
        Row: {
          action_map: Json
          analysis_id: string | null
          chronological_age: number
          cohort_label: string | null
          cohort_percentile: number | null
          created_at: string
          current_bio_age: number
          health_index: number | null
          id: string
          model: string | null
          rationale: string | null
          system_goals: Json
          target_bio_age: number
          user_id: string
        }
        Insert: {
          action_map?: Json
          analysis_id?: string | null
          chronological_age: number
          cohort_label?: string | null
          cohort_percentile?: number | null
          created_at?: string
          current_bio_age: number
          health_index?: number | null
          id?: string
          model?: string | null
          rationale?: string | null
          system_goals?: Json
          target_bio_age: number
          user_id: string
        }
        Update: {
          action_map?: Json
          analysis_id?: string | null
          chronological_age?: number
          cohort_label?: string | null
          cohort_percentile?: number | null
          created_at?: string
          current_bio_age?: number
          health_index?: number | null
          id?: string
          model?: string | null
          rationale?: string | null
          system_goals?: Json
          target_bio_age?: number
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
          metadata: Json | null
          role: string
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
          metadata?: Json | null
          role?: string
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
          metadata?: Json | null
          role?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      lab_locations: {
        Row: {
          address_short: string | null
          city: string | null
          created_at: string
          email: string | null
          external_id: string | null
          full_address: string | null
          hours: string[]
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          metro: string | null
          page_url: string | null
          phones: string[]
          provider: string
          region: string | null
          title: string
          updated_at: string
        }
        Insert: {
          address_short?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          full_address?: string | null
          hours?: string[]
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          metro?: string | null
          page_url?: string | null
          phones?: string[]
          provider?: string
          region?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address_short?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          full_address?: string | null
          hours?: string[]
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          metro?: string | null
          page_url?: string | null
          phones?: string[]
          provider?: string
          region?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_condition_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_conditions_templates: {
        Row: {
          category: string
          condition: string
          created_at: string
          display_order: number
          id: string
          updated_at: string
        }
        Insert: {
          category: string
          condition: string
          created_at?: string
          display_order?: number
          id?: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          display_order?: number
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
      patient_interactions: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          interaction_date: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          is_important: boolean | null
          metadata: Json | null
          outcome: string | null
          related_analysis_id: string | null
          related_prescription_id: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["interaction_status"]
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          interaction_date?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          is_important?: boolean | null
          metadata?: Json | null
          outcome?: string | null
          related_analysis_id?: string | null
          related_prescription_id?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["interaction_status"]
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          interaction_date?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          is_important?: boolean | null
          metadata?: Json | null
          outcome?: string | null
          related_analysis_id?: string | null
          related_prescription_id?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["interaction_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_interactions_assigned_to_profiles_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_interactions_created_by_profiles_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_interactions_related_analysis_id_fkey"
            columns: ["related_analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_interactions_related_prescription_id_fkey"
            columns: ["related_prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_callback_log: {
        Row: {
          created_at: string
          error: string | null
          headers: Json | null
          id: string
          inv_id: number | null
          raw_body: Json | null
          signature_valid: boolean
        }
        Insert: {
          created_at?: string
          error?: string | null
          headers?: Json | null
          id?: string
          inv_id?: number | null
          raw_body?: Json | null
          signature_valid?: boolean
        }
        Update: {
          created_at?: string
          error?: string | null
          headers?: Json | null
          id?: string
          inv_id?: number | null
          raw_body?: Json | null
          signature_valid?: boolean
        }
        Relationships: []
      }
      payment_gateway_settings: {
        Row: {
          id: string
          provider: string
          test_mode: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          provider?: string
          test_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          provider?: string
          test_mode?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          admin_test: boolean
          created_at: string
          id: string
          inv_id: number
          is_test: boolean
          out_sum: number
          paid_amount: number | null
          paid_at: string | null
          plan_id: string | null
          pricing_id: string | null
          raw_callback: Json | null
          robokassa_signature: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_test?: boolean
          created_at?: string
          id?: string
          inv_id?: number
          is_test?: boolean
          out_sum: number
          paid_amount?: number | null
          paid_at?: string | null
          plan_id?: string | null
          pricing_id?: string | null
          raw_callback?: Json | null
          robokassa_signature?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_test?: boolean
          created_at?: string
          id?: string
          inv_id?: number
          is_test?: boolean
          out_sum?: number
          paid_amount?: number | null
          paid_at?: string | null
          plan_id?: string | null
          pricing_id?: string | null
          raw_callback?: Json | null
          robokassa_signature?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      phone_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          purpose: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          purpose?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          purpose?: string
          user_id?: string | null
        }
        Relationships: []
      }
      plan_biomarkers: {
        Row: {
          biomarker_id: string
          created_at: string
          id: string
          plan_id: string
        }
        Insert: {
          biomarker_id: string
          created_at?: string
          id?: string
          plan_id: string
        }
        Update: {
          biomarker_id?: string
          created_at?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_biomarkers_biomarker_id_fkey"
            columns: ["biomarker_id"]
            isOneToOne: false
            referencedRelation: "biomarkers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_biomarkers_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
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
          category: string | null
          control_date: string | null
          created_at: string
          created_by: string | null
          dosage: string | null
          duration: string | null
          effect: string | null
          form: string | null
          how_to_take: string | null
          id: string
          is_archived: boolean
          name: string | null
          prescription: string
          reason: string | null
          recommendation_id: string | null
          status: Database["public"]["Enums"]["prescription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          category?: string | null
          control_date?: string | null
          created_at?: string
          created_by?: string | null
          dosage?: string | null
          duration?: string | null
          effect?: string | null
          form?: string | null
          how_to_take?: string | null
          id?: string
          is_archived?: boolean
          name?: string | null
          prescription: string
          reason?: string | null
          recommendation_id?: string | null
          status?: Database["public"]["Enums"]["prescription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          category?: string | null
          control_date?: string | null
          created_at?: string
          created_by?: string | null
          dosage?: string | null
          duration?: string | null
          effect?: string | null
          form?: string | null
          how_to_take?: string | null
          id?: string
          is_archived?: boolean
          name?: string | null
          prescription?: string
          reason?: string | null
          recommendation_id?: string | null
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
          {
            foreignKeyName: "prescriptions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string
          created_at: string
          demo_mode_enabled: boolean | null
          email: string | null
          email_verified: boolean | null
          first_name: string
          gender: string
          height: number | null
          id: string
          last_name: string | null
          name: string
          needs_risk_refresh: boolean | null
          phone: string | null
          phone_verified_at: string | null
          telegram_id: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          birth_date: string
          created_at?: string
          demo_mode_enabled?: boolean | null
          email?: string | null
          email_verified?: boolean | null
          first_name: string
          gender: string
          height?: number | null
          id: string
          last_name?: string | null
          name: string
          needs_risk_refresh?: boolean | null
          phone?: string | null
          phone_verified_at?: string | null
          telegram_id?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          birth_date?: string
          created_at?: string
          demo_mode_enabled?: boolean | null
          email?: string | null
          email_verified?: boolean | null
          first_name?: string
          gender?: string
          height?: number | null
          id?: string
          last_name?: string | null
          name?: string
          needs_risk_refresh?: boolean | null
          phone?: string | null
          phone_verified_at?: string | null
          telegram_id?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          analysis_id: string | null
          content_json: Json | null
          created_at: string
          id: string
          text: string
          type: string
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          content_json?: Json | null
          created_at?: string
          id?: string
          text: string
          type: string
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          content_json?: Json | null
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
      reminder_stop_list: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      report_jobs: {
        Row: {
          analysis_id: string
          attempts: number
          current_step: string | null
          error: string | null
          finished_at: string | null
          id: string
          metadata: Json
          mode: string
          started_at: string
          status: string
          steps: Json
          steps_done: number
          steps_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          attempts?: number
          current_step?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          mode: string
          started_at?: string
          status?: string
          steps?: Json
          steps_done?: number
          steps_total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          attempts?: number
          current_step?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          mode?: string
          started_at?: string
          status?: string
          steps?: Json
          steps_done?: number
          steps_total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_zone_analyses: {
        Row: {
          aging_blockers: Json
          analysis_date: string
          correlation_insights: Json | null
          created_at: string
          id: string
          risk_map: Json
          smart_priorities: Json | null
          user_id: string
        }
        Insert: {
          aging_blockers: Json
          analysis_date?: string
          correlation_insights?: Json | null
          created_at?: string
          id?: string
          risk_map: Json
          smart_priorities?: Json | null
          user_id: string
        }
        Update: {
          aging_blockers?: Json
          analysis_date?: string
          correlation_insights?: Json | null
          created_at?: string
          id?: string
          risk_map?: Json
          smart_priorities?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module: Database["public"]["Enums"]["admin_module"]
          role_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module: Database["public"]["Enums"]["admin_module"]
          role_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module?: Database["public"]["Enums"]["admin_module"]
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_send_log: {
        Row: {
          body_text: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          provider: string
          provider_message_id: string | null
          provider_status: string | null
          recipient_phone: string
          status: string
          template_name: string
        }
        Insert: {
          body_text: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          provider?: string
          provider_message_id?: string | null
          provider_status?: string | null
          recipient_phone: string
          status?: string
          template_name: string
        }
        Update: {
          body_text?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          provider?: string
          provider_message_id?: string | null
          provider_status?: string | null
          recipient_phone?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      sms_sender_settings: {
        Row: {
          id: string
          sender_sign: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          sender_sign?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          sender_sign?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          body_text: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          body_text: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          body_text?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          id: string
          new_data: Json
          note: string | null
          old_data: Json | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data: Json
          note?: string | null
          old_data?: Json | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_data?: Json
          note?: string | null
          old_data?: Json | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          badge_color: string | null
          badge_text: string | null
          created_at: string
          description: string | null
          display_name: string
          display_order: number
          features: Json | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          badge_color?: string | null
          badge_text?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          badge_color?: string | null
          badge_text?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          display_order?: number
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_pricing: {
        Row: {
          amount: number
          created_at: string
          discount_percentage: number | null
          duration_months: number
          id: string
          is_enabled: boolean
          period: string
          period_display: string
          plan_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          discount_percentage?: number | null
          duration_months: number
          id?: string
          is_enabled?: boolean
          period: string
          period_display: string
          plan_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          discount_percentage?: number | null
          duration_months?: number
          id?: string
          is_enabled?: boolean
          period?: string
          period_display?: string
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_pricing_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          end_date: string | null
          id: string
          payment_method: string | null
          plan_id: string | null
          plan_type: string
          pricing_id: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          payment_method?: string | null
          plan_id?: string | null
          plan_type?: string
          pricing_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          payment_method?: string | null
          plan_id?: string | null
          plan_type?: string
          pricing_id?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_pricing_id_fkey"
            columns: ["pricing_id"]
            isOneToOne: false
            referencedRelation: "subscription_pricing"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      symptom_categories: {
        Row: {
          created_at: string
          display_order: number
          emoji: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          emoji: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          emoji?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      symptom_templates: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          symptom: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          display_order?: number
          id?: string
          symptom: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          symptom?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          notes: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          notes?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_notification_log: {
        Row: {
          error: string | null
          event_type: string
          id: string
          is_test: boolean
          payload: Json | null
          sent_at: string
          status: string
        }
        Insert: {
          error?: string | null
          event_type: string
          id?: string
          is_test?: boolean
          payload?: Json | null
          sent_at?: string
          status: string
        }
        Update: {
          error?: string | null
          event_type?: string
          id?: string
          is_test?: boolean
          payload?: Json | null
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      telegram_notification_settings: {
        Row: {
          booking_templates: Json
          bot_token: string | null
          chat_id: string | null
          created_at: string
          enabled_events: Json
          id: string
          internal_secret: string
          is_active: boolean
          singleton: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          booking_templates?: Json
          bot_token?: string | null
          chat_id?: string | null
          created_at?: string
          enabled_events?: Json
          id?: string
          internal_secret?: string
          is_active?: boolean
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          booking_templates?: Json
          bot_token?: string | null
          chat_id?: string | null
          created_at?: string
          enabled_events?: Json
          id?: string
          internal_secret?: string
          is_active?: boolean
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      test_email_overrides: {
        Row: {
          created_at: string
          email: string
          template_type: string
        }
        Insert: {
          created_at?: string
          email: string
          template_type: string
        }
        Update: {
          created_at?: string
          email?: string
          template_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          role_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
        ]
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
      book_analysis_slot:
        | { Args: { p_slot_id: string }; Returns: Json }
        | {
            Args: { p_date?: string; p_slot_id?: string; p_time_slot?: string }
            Returns: Json
          }
      cancel_booking: { Args: { p_slot_id: string }; Returns: Json }
      check_user_data_deleted: {
        Args: { check_user_id: string }
        Returns: {
          records_found: number
          table_name: string
        }[]
      }
      clean_orphaned_user_data: {
        Args: never
        Returns: {
          deleted_count: number
          table_name: string
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enroll_in_active_series: {
        Args: {
          p_trigger_type: Database["public"]["Enums"]["drip_trigger_type"]
          p_user_id: string
        }
        Returns: undefined
      }
      enroll_user_in_series: {
        Args: { p_base_time?: string; p_series_id: string; p_user_id: string }
        Returns: number
      }
      get_slots_for_date_range: {
        Args: {
          p_end_date: string
          p_existing_slot_id?: string
          p_start_date: string
        }
        Returns: {
          booked_count: number
          date: string
          id: string
          is_active: boolean
          is_override: boolean
          time_slot: string
          total_capacity: number
        }[]
      }
      get_users_email_confirmed: {
        Args: { user_ids: string[] }
        Returns: {
          email_confirmed_at: string
          user_id: string
        }[]
      }
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
      invoke_telegram_notify: {
        Args: { p_event_type: string; p_payload: Json }
        Returns: undefined
      }
      is_patient: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reset_slot_to_default: {
        Args: { p_date: string; p_time_slot: string }
        Returns: Json
      }
      upsert_slot_override: {
        Args: {
          p_date: string
          p_is_active?: boolean
          p_time_slot: string
          p_total_capacity?: number
        }
        Returns: Json
      }
    }
    Enums: {
      admin_module:
        | "ai_settings"
        | "data_management"
        | "patients"
        | "user_management"
        | "analysis_bookings"
        | "my_assignments"
      analysis_status: "on_review" | "processed"
      app_role: "user" | "admin" | "superadmin" | "doctor" | "patient"
      drip_delay_unit: "minutes" | "hours" | "days"
      drip_schedule_status:
        | "pending"
        | "sent"
        | "skipped"
        | "failed"
        | "cancelled"
      drip_trigger_type: "registration" | "subscription_paid" | "manual"
      interaction_status:
        | "completed"
        | "scheduled"
        | "cancelled"
        | "pending"
        | "in_progress"
      interaction_type:
        | "online_consultation"
        | "phone_call"
        | "email"
        | "in_person_meeting"
        | "message"
        | "note"
        | "task"
        | "appointment"
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
        "analysis_bookings",
        "my_assignments",
      ],
      analysis_status: ["on_review", "processed"],
      app_role: ["user", "admin", "superadmin", "doctor", "patient"],
      drip_delay_unit: ["minutes", "hours", "days"],
      drip_schedule_status: [
        "pending",
        "sent",
        "skipped",
        "failed",
        "cancelled",
      ],
      drip_trigger_type: ["registration", "subscription_paid", "manual"],
      interaction_status: [
        "completed",
        "scheduled",
        "cancelled",
        "pending",
        "in_progress",
      ],
      interaction_type: [
        "online_consultation",
        "phone_call",
        "email",
        "in_person_meeting",
        "message",
        "note",
        "task",
        "appointment",
      ],
      prescription_status: ["on_review", "confirmed"],
    },
  },
} as const
