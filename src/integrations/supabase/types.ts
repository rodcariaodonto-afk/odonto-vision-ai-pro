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
      api_keys: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          environment: Database["public"]["Enums"]["api_environment"]
          id: string
          key_hash: string
          key_preview: string
          last_used_at: string | null
          monthly_limit: number
          name: string
          plan: Database["public"]["Enums"]["clinic_plan"]
          usage_count: number
          usage_reset_at: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          environment?: Database["public"]["Enums"]["api_environment"]
          id?: string
          key_hash: string
          key_preview: string
          last_used_at?: string | null
          monthly_limit?: number
          name: string
          plan?: Database["public"]["Enums"]["clinic_plan"]
          usage_count?: number
          usage_reset_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          environment?: Database["public"]["Enums"]["api_environment"]
          id?: string
          key_hash?: string
          key_preview?: string
          last_used_at?: string | null
          monthly_limit?: number
          name?: string
          plan?: Database["public"]["Enums"]["clinic_plan"]
          usage_count?: number
          usage_reset_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          api_key_id: string | null
          clinic_id: string | null
          created_at: string
          endpoint: string
          exam_category: string | null
          id: string
          ip_address: string | null
          processing_ms: number | null
          status_code: number
        }
        Insert: {
          api_key_id?: string | null
          clinic_id?: string | null
          created_at?: string
          endpoint: string
          exam_category?: string | null
          id?: string
          ip_address?: string | null
          processing_ms?: number | null
          status_code: number
        }
        Update: {
          api_key_id?: string | null
          clinic_id?: string | null
          created_at?: string
          endpoint?: string
          exam_category?: string | null
          id?: string
          ip_address?: string | null
          processing_ms?: number | null
          status_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_usage_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      case_feedback: {
        Row: {
          case_id: string | null
          corrected_value: string
          created_at: string
          exam_category: string | null
          feedback_type: string
          field_index: number | null
          field_name: string
          id: string
          notes: string | null
          original_value: string | null
          user_id: string
        }
        Insert: {
          case_id?: string | null
          corrected_value: string
          created_at?: string
          exam_category?: string | null
          feedback_type?: string
          field_index?: number | null
          field_name: string
          id?: string
          notes?: string | null
          original_value?: string | null
          user_id: string
        }
        Update: {
          case_id?: string | null
          corrected_value?: string
          created_at?: string
          exam_category?: string | null
          feedback_type?: string
          field_index?: number | null
          field_name?: string
          id?: string
          notes?: string | null
          original_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_feedback_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          analysis: Json | null
          created_at: string
          exam_type: string
          file_name: string | null
          file_type: string | null
          id: string
          name: string
          patient_folder: string | null
          raw_content: string | null
          review_score: number | null
          reviewer_analysis: Json | null
          reviewer_flags: string[] | null
          status: string
          updated_at: string
          user_id: string
          visual_analysis: Json | null
        }
        Insert: {
          analysis?: Json | null
          created_at?: string
          exam_type: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          name: string
          patient_folder?: string | null
          raw_content?: string | null
          review_score?: number | null
          reviewer_analysis?: Json | null
          reviewer_flags?: string[] | null
          status?: string
          updated_at?: string
          user_id: string
          visual_analysis?: Json | null
        }
        Update: {
          analysis?: Json | null
          created_at?: string
          exam_type?: string
          file_name?: string | null
          file_type?: string | null
          id?: string
          name?: string
          patient_folder?: string | null
          raw_content?: string | null
          review_score?: number | null
          reviewer_analysis?: Json | null
          reviewer_flags?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string
          visual_analysis?: Json | null
        }
        Relationships: []
      }
      cephalometric_analyses: {
        Row: {
          analysis_type: string
          created_at: string
          error_message: string | null
          id: string
          image_storage_path: string
          image_url: string
          interpretation: string | null
          landmarks: Json
          laudo_pdf_url: string | null
          measurements: Json
          patient_id: string
          patient_name: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_storage_path: string
          image_url: string
          interpretation?: string | null
          landmarks?: Json
          laudo_pdf_url?: string | null
          measurements?: Json
          patient_id: string
          patient_name?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          image_storage_path?: string
          image_url?: string
          interpretation?: string | null
          landmarks?: Json
          laudo_pdf_url?: string | null
          measurements?: Json
          patient_id?: string
          patient_name?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cephalometric_analysis_history: {
        Row: {
          analysis_id: string
          created_at: string
          created_by: string | null
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          created_by?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          created_by?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cephalometric_analysis_history_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "cephalometric_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clinics: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          plan: Database["public"]["Enums"]["clinic_plan"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["clinic_plan"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["clinic_plan"]
          updated_at?: string
        }
        Relationships: []
      }
      exam_comparisons: {
        Row: {
          case_ids: string[]
          comparison_result: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          case_ids: string[]
          comparison_result: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          case_ids?: string[]
          comparison_result?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          blocked_at: string | null
          created_at: string
          cro: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          created_at?: string
          cro?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          created_at?: string
          cro?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_chats: {
        Row: {
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          is_admin: boolean
          message: string
          sender_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          sender_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      test_users: {
        Row: {
          analyses_limit: number
          analyses_used: number
          created_at: string
          email: string
          expires_at: string
          id: string
          is_active: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          analyses_limit?: number
          analyses_used?: number
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          analyses_limit?: number
          analyses_used?: number
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_subscriptions: {
        Row: {
          allows_tomography: boolean
          analyses_limit: number
          analyses_used: number
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          id: string
          payment_provider: string
          plan_end: string | null
          plan_id: string
          provider_reference: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allows_tomography?: boolean
          analyses_limit?: number
          analyses_used?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email: string
          id?: string
          payment_provider?: string
          plan_end?: string | null
          plan_id: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allows_tomography?: boolean
          analyses_limit?: number
          analyses_used?: number
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          email?: string
          id?: string
          payment_provider?: string
          plan_end?: string | null
          plan_id?: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          failure_count: number
          id: string
          last_status: string | null
          last_triggered_at: string | null
          name: string
          secret_hash: string
          secret_preview: string
          url: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          failure_count?: number
          id?: string
          last_status?: string | null
          last_triggered_at?: string | null
          name?: string
          secret_hash: string
          secret_preview: string
          url: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          failure_count?: number
          id?: string
          last_status?: string | null
          last_triggered_at?: string | null
          name?: string
          secret_hash?: string
          secret_preview?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_stats: { Args: never; Returns: Json }
      get_all_cases: {
        Args: never
        Returns: {
          created_at: string
          exam_type: string
          id: string
          name: string
          status: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_all_users: {
        Args: never
        Returns: {
          blocked_at: string
          created_at: string
          cro: string
          email: string
          id: string
          name: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_subscription_analyses: {
        Args: { _subscription_id: string }
        Returns: {
          allows_tomography: boolean
          analyses_limit: number
          analyses_used: number
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          id: string
          payment_provider: string
          plan_end: string | null
          plan_id: string
          provider_reference: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "user_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      increment_test_user_analyses: {
        Args: { user_email: string }
        Returns: undefined
      }
      refresh_subscription_period: {
        Args: { _subscription_id: string }
        Returns: {
          allows_tomography: boolean
          analyses_limit: number
          analyses_used: number
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          email: string
          id: string
          payment_provider: string
          plan_end: string | null
          plan_id: string
          provider_reference: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "user_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      api_environment: "live" | "test"
      app_role: "admin" | "user"
      clinic_plan: "basic" | "professional" | "enterprise"
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
      api_environment: ["live", "test"],
      app_role: ["admin", "user"],
      clinic_plan: ["basic", "professional", "enterprise"],
    },
  },
} as const
