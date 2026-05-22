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
      audit_logs: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          resource_id: string | null
          resource_type: string | null
          severity: Database["public"]["Enums"]["audit_severity"]
          user_agent: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          severity?: Database["public"]["Enums"]["audit_severity"]
          user_agent?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          resource_id?: string | null
          resource_type?: string | null
          severity?: Database["public"]["Enums"]["audit_severity"]
          user_agent?: string | null
        }
        Relationships: []
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
      ceph_intraoral_ai_analysis: {
        Row: {
          analysis_id: string
          created_at: string
          id: string
          model_used: string | null
          photos_count: number | null
          result_text: string
          safety_filter_version: string | null
          user_id: string
        }
        Insert: {
          analysis_id: string
          created_at?: string
          id?: string
          model_used?: string | null
          photos_count?: number | null
          result_text: string
          safety_filter_version?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string
          created_at?: string
          id?: string
          model_used?: string | null
          photos_count?: number | null
          result_text?: string
          safety_filter_version?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceph_intraoral_ai_analysis_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "cephalometric_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      ceph_intraoral_photos: {
        Row: {
          analysis_id: string
          category: string
          created_at: string
          file_name: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          category: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          category?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ceph_intraoral_photos_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "cephalometric_analyses"
            referencedColumns: ["id"]
          },
        ]
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
      cephalometric_planning_audit_log: {
        Row: {
          cephalometric_analysis_id: string
          clinical_context_snapshot: Json | null
          confidence_level:
            | Database["public"]["Enums"]["ceph_planning_confidence"]
            | null
          content_after: string | null
          content_before: string | null
          created_at: string
          data_sufficiency_score: number | null
          event_timestamp: string
          event_type: Database["public"]["Enums"]["ceph_planning_audit_event"]
          id: string
          input_measurements_snapshot: Json | null
          metadata: Json | null
          missing_data_list: string[] | null
          planning_suggestion_id: string
          reason: string | null
          rules_version: string | null
          safety_filter_version: string | null
          template_version: string | null
          user_id: string | null
        }
        Insert: {
          cephalometric_analysis_id: string
          clinical_context_snapshot?: Json | null
          confidence_level?:
            | Database["public"]["Enums"]["ceph_planning_confidence"]
            | null
          content_after?: string | null
          content_before?: string | null
          created_at?: string
          data_sufficiency_score?: number | null
          event_timestamp?: string
          event_type: Database["public"]["Enums"]["ceph_planning_audit_event"]
          id?: string
          input_measurements_snapshot?: Json | null
          metadata?: Json | null
          missing_data_list?: string[] | null
          planning_suggestion_id: string
          reason?: string | null
          rules_version?: string | null
          safety_filter_version?: string | null
          template_version?: string | null
          user_id?: string | null
        }
        Update: {
          cephalometric_analysis_id?: string
          clinical_context_snapshot?: Json | null
          confidence_level?:
            | Database["public"]["Enums"]["ceph_planning_confidence"]
            | null
          content_after?: string | null
          content_before?: string | null
          created_at?: string
          data_sufficiency_score?: number | null
          event_timestamp?: string
          event_type?: Database["public"]["Enums"]["ceph_planning_audit_event"]
          id?: string
          input_measurements_snapshot?: Json | null
          metadata?: Json | null
          missing_data_list?: string[] | null
          planning_suggestion_id?: string
          reason?: string | null
          rules_version?: string | null
          safety_filter_version?: string | null
          template_version?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cephalometric_planning_audit_log_cephalometric_analysis_id_fkey"
            columns: ["cephalometric_analysis_id"]
            isOneToOne: false
            referencedRelation: "cephalometric_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cephalometric_planning_audit_log_planning_suggestion_id_fkey"
            columns: ["planning_suggestion_id"]
            isOneToOne: false
            referencedRelation: "cephalometric_planning_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      cephalometric_planning_suggestions: {
        Row: {
          ai_original_text: string
          alerts_and_limitations: string[]
          approved_at: string | null
          approved_final_text: string | null
          blocking_reasons: string[]
          cephalometric_analysis_id: string
          clinical_context_snapshot: Json
          clinician_edited_text: string | null
          clinician_user_id: string | null
          confidence_level: Database["public"]["Enums"]["ceph_planning_confidence"]
          created_at: string
          data_sufficiency_score: number
          edited_at: string | null
          generated_at: string
          id: string
          input_measurements_snapshot: Json
          missing_data: string[]
          patient_friendly_explanation: string | null
          prioritized_problems: string[]
          rejected_at: string | null
          rejection_reason: string | null
          rules_version: string
          safety_filter_version: string
          status: Database["public"]["Enums"]["ceph_planning_status"]
          summary: string
          template_version: string
          therapeutic_objectives: string[]
          treatment_alternatives: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_original_text: string
          alerts_and_limitations?: string[]
          approved_at?: string | null
          approved_final_text?: string | null
          blocking_reasons?: string[]
          cephalometric_analysis_id: string
          clinical_context_snapshot?: Json
          clinician_edited_text?: string | null
          clinician_user_id?: string | null
          confidence_level: Database["public"]["Enums"]["ceph_planning_confidence"]
          created_at?: string
          data_sufficiency_score: number
          edited_at?: string | null
          generated_at?: string
          id?: string
          input_measurements_snapshot: Json
          missing_data?: string[]
          patient_friendly_explanation?: string | null
          prioritized_problems?: string[]
          rejected_at?: string | null
          rejection_reason?: string | null
          rules_version: string
          safety_filter_version: string
          status?: Database["public"]["Enums"]["ceph_planning_status"]
          summary: string
          template_version: string
          therapeutic_objectives?: string[]
          treatment_alternatives?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_original_text?: string
          alerts_and_limitations?: string[]
          approved_at?: string | null
          approved_final_text?: string | null
          blocking_reasons?: string[]
          cephalometric_analysis_id?: string
          clinical_context_snapshot?: Json
          clinician_edited_text?: string | null
          clinician_user_id?: string | null
          confidence_level?: Database["public"]["Enums"]["ceph_planning_confidence"]
          created_at?: string
          data_sufficiency_score?: number
          edited_at?: string | null
          generated_at?: string
          id?: string
          input_measurements_snapshot?: Json
          missing_data?: string[]
          patient_friendly_explanation?: string | null
          prioritized_problems?: string[]
          rejected_at?: string | null
          rejection_reason?: string | null
          rules_version?: string
          safety_filter_version?: string
          status?: Database["public"]["Enums"]["ceph_planning_status"]
          summary?: string
          template_version?: string
          therapeutic_objectives?: string[]
          treatment_alternatives?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cephalometric_planning_suggestio_cephalometric_analysis_id_fkey"
            columns: ["cephalometric_analysis_id"]
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
      consents: {
        Row: {
          ai_processing_allowed: boolean
          clinical_data_processing_allowed: boolean
          consent_given_at: string | null
          consent_revoked_at: string | null
          consent_source: string
          consent_status: Database["public"]["Enums"]["consent_status"]
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string
          data_origin: string | null
          id: string
          legal_basis: Database["public"]["Enums"]["legal_basis"]
          privacy_notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_processing_allowed?: boolean
          clinical_data_processing_allowed?: boolean
          consent_given_at?: string | null
          consent_revoked_at?: string | null
          consent_source?: string
          consent_status?: Database["public"]["Enums"]["consent_status"]
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          data_origin?: string | null
          id?: string
          legal_basis?: Database["public"]["Enums"]["legal_basis"]
          privacy_notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_processing_allowed?: boolean
          clinical_data_processing_allowed?: boolean
          consent_given_at?: string | null
          consent_revoked_at?: string | null
          consent_source?: string
          consent_status?: Database["public"]["Enums"]["consent_status"]
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          data_origin?: string | null
          id?: string
          legal_basis?: Database["public"]["Enums"]["legal_basis"]
          privacy_notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_exports: {
        Row: {
          account_id: string | null
          case_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string
          file_url: string | null
          format: string
          id: string
          metadata: Json
          requested_by: string
          scope: Database["public"]["Enums"]["governance_export_scope"]
          status: Database["public"]["Enums"]["governance_export_status"]
          storage_path: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string
          file_url?: string | null
          format?: string
          id?: string
          metadata?: Json
          requested_by: string
          scope?: Database["public"]["Enums"]["governance_export_scope"]
          status?: Database["public"]["Enums"]["governance_export_status"]
          storage_path?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string
          file_url?: string | null
          format?: string
          id?: string
          metadata?: Json
          requested_by?: string
          scope?: Database["public"]["Enums"]["governance_export_scope"]
          status?: Database["public"]["Enums"]["governance_export_status"]
          storage_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          linked_resource_id: string | null
          linked_resource_type: string | null
          priority: string
          request_type: Database["public"]["Enums"]["dsr_type"]
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["dsr_status"]
          subject_email: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          linked_resource_id?: string | null
          linked_resource_type?: string | null
          priority?: string
          request_type: Database["public"]["Enums"]["dsr_type"]
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dsr_status"]
          subject_email: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          linked_resource_id?: string | null
          linked_resource_type?: string | null
          priority?: string
          request_type?: Database["public"]["Enums"]["dsr_type"]
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dsr_status"]
          subject_email?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      deletion_queue: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          executed_at: string | null
          id: string
          metadata: Json
          reason: string | null
          requested_by: string
          resource_id: string
          resource_type: string
          scheduled_for: string
          status: Database["public"]["Enums"]["deletion_status"]
          user_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          requested_by: string
          resource_id: string
          resource_type: string
          scheduled_for?: string
          status?: Database["public"]["Enums"]["deletion_status"]
          user_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          requested_by?: string
          resource_id?: string
          resource_type?: string
          scheduled_for?: string
          status?: Database["public"]["Enums"]["deletion_status"]
          user_id?: string | null
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
      retention_policies: {
        Row: {
          ai_clinical_use_allowed: boolean
          anonymization_strategy: string
          case_retention_days: number
          clinical_access_logging: boolean
          deletion_allowed_roles: string[]
          export_allowed_roles: string[]
          export_expiration_days: number
          id: string
          image_retention_days: number
          notes: string | null
          singleton: boolean
          support_retention_days: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_clinical_use_allowed?: boolean
          anonymization_strategy?: string
          case_retention_days?: number
          clinical_access_logging?: boolean
          deletion_allowed_roles?: string[]
          export_allowed_roles?: string[]
          export_expiration_days?: number
          id?: string
          image_retention_days?: number
          notes?: string | null
          singleton?: boolean
          support_retention_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_clinical_use_allowed?: boolean
          anonymization_strategy?: string
          case_retention_days?: number
          clinical_access_logging?: boolean
          deletion_allowed_roles?: string[]
          export_allowed_roles?: string[]
          export_expiration_days?: number
          id?: string
          image_retention_days?: number
          notes?: string | null
          singleton?: boolean
          support_retention_days?: number
          updated_at?: string
          updated_by?: string | null
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
      audit_severity: "info" | "warn" | "critical"
      ceph_planning_audit_event:
        | "generated"
        | "edited"
        | "approved"
        | "rejected"
        | "exported"
        | "safety_blocked"
        | "requested_more_data"
      ceph_planning_confidence: "low" | "medium" | "high"
      ceph_planning_status:
        | "draft_ai_generated"
        | "clinician_edited"
        | "clinician_approved"
        | "rejected"
        | "requires_more_data"
      clinic_plan: "basic" | "professional" | "enterprise"
      consent_status: "granted" | "revoked" | "pending"
      consent_type:
        | "image_upload"
        | "ai_processing"
        | "clinical_storage"
        | "support"
        | "product_improvement"
        | "communications"
      deletion_status: "pending" | "confirmed" | "executed" | "cancelled"
      dsr_status: "open" | "in_progress" | "completed" | "rejected"
      dsr_type:
        | "access"
        | "rectification"
        | "portability"
        | "deletion"
        | "anonymization"
        | "restriction"
        | "consent_revocation"
      governance_export_scope: "user" | "account" | "case"
      governance_export_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "expired"
      legal_basis:
        | "consent"
        | "contract"
        | "legal_obligation"
        | "legitimate_interest"
        | "vital_interest"
        | "public_task"
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
      audit_severity: ["info", "warn", "critical"],
      ceph_planning_audit_event: [
        "generated",
        "edited",
        "approved",
        "rejected",
        "exported",
        "safety_blocked",
        "requested_more_data",
      ],
      ceph_planning_confidence: ["low", "medium", "high"],
      ceph_planning_status: [
        "draft_ai_generated",
        "clinician_edited",
        "clinician_approved",
        "rejected",
        "requires_more_data",
      ],
      clinic_plan: ["basic", "professional", "enterprise"],
      consent_status: ["granted", "revoked", "pending"],
      consent_type: [
        "image_upload",
        "ai_processing",
        "clinical_storage",
        "support",
        "product_improvement",
        "communications",
      ],
      deletion_status: ["pending", "confirmed", "executed", "cancelled"],
      dsr_status: ["open", "in_progress", "completed", "rejected"],
      dsr_type: [
        "access",
        "rectification",
        "portability",
        "deletion",
        "anonymization",
        "restriction",
        "consent_revocation",
      ],
      governance_export_scope: ["user", "account", "case"],
      governance_export_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "expired",
      ],
      legal_basis: [
        "consent",
        "contract",
        "legal_obligation",
        "legitimate_interest",
        "vital_interest",
        "public_task",
      ],
    },
  },
} as const
