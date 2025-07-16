export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_logs: {
        Row: {
          id: string
          user_id: string
          agency_id: string | null
          question: string
          response: string
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agency_id?: string | null
          question: string
          response: string
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agency_id?: string | null
          question?: string
          response?: string
          timestamp?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          }
        ]
      }
      agencies: {
        Row: {
          id: string
          name: string
          tone: string | null
          policies: string | null
        }
        Insert: {
          id?: string
          name: string
          tone?: string | null
          policies?: string | null
        }
        Update: {
          id?: string
          name?: string
          tone?: string | null
          policies?: string | null
        }
        Relationships: []
      }
      buildings: {
        Row: {
          address: string | null
          created_at: string | null
          id: number
          name: string
          unit_count: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: number
          name: string
          unit_count?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: number
          name?: string
          unit_count?: number | null
        }
        Relationships: []
      }
      building_setup: {
        Row: {
          id: number
          building_id: number
          structure_type: string | null
          operational_notes: string | null
          client_type: string | null
          client_name: string | null
          client_contact: string | null
          client_email: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          building_id: number
          structure_type?: string | null
          operational_notes?: string | null
          client_type?: string | null
          client_name?: string | null
          client_contact?: string | null
          client_email?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          building_id?: number
          structure_type?: string | null
          operational_notes?: string | null
          client_type?: string | null
          client_name?: string | null
          client_contact?: string | null
          client_email?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "building_setup_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_history: {
        Row: {
          building_id: string | null
          id: string
          question: string | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          building_id?: string | null
          id?: string
          question?: string | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          building_id?: string | null
          id?: string
          question?: string | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          body: string | null
          building_id: string | null
          created_at: string | null
          id: string
          recipient: string | null
          sender_id: string | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          building_id?: string | null
          created_at?: string | null
          id?: string
          recipient?: string | null
          sender_id?: string | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          building_id?: string | null
          created_at?: string | null
          id?: string
          recipient?: string | null
          sender_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_docs: {
        Row: {
          building_id: number | null
          compliance_item_id: number | null
          created_at: string | null
          doc_type: string | null
          doc_url: string | null
          expiry_date: string | null
          id: string
          reminder_days: number | null
          start_date: string | null
          uploaded_by: string | null
        }
        Insert: {
          building_id?: number | null
          compliance_item_id?: number | null
          created_at?: string | null
          doc_type?: string | null
          doc_url?: string | null
          expiry_date?: string | null
          id: string
          reminder_days?: number | null
          start_date?: string | null
          uploaded_by?: string | null
        }
        Update: {
          building_id?: number | null
          compliance_item_id?: number | null
          created_at?: string | null
          doc_type?: string | null
          doc_url?: string | null
          expiry_date?: string | null
          id?: string
          reminder_days?: number | null
          start_date?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_docs_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_docs_compliance_item_id_fkey"
            columns: ["compliance_item_id"]
            isOneToOne: false
            referencedRelation: "compliance_items"
            referencedColumns: ["id"]
          },
        ]
      }
      building_assets: {
        Row: {
          id: number
          building_id: number
          compliance_item_id: number
          applies: boolean
          last_checked: string | null
          next_due: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          building_id: number
          compliance_item_id: number
          applies?: boolean
          last_checked?: string | null
          next_due?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          building_id?: number
          compliance_item_id?: number
          applies?: boolean
          last_checked?: string | null
          next_due?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "building_assets_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_assets_compliance_item_id_fkey"
            columns: ["compliance_item_id"]
            isOneToOne: false
            referencedRelation: "compliance_items"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          assigned_to: string | null
          building_id: number | null
          category: string | null
          created_at: string | null
          document_url: string | null
          frequency: string | null
          id: number
          item_type: string
          last_done: string | null
          next_due: string | null
          notes: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          building_id?: number | null
          category?: string | null
          created_at?: string | null
          document_url?: string | null
          frequency?: string | null
          id: number
          item_type: string
          last_done?: string | null
          next_due?: string | null
          notes?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          building_id?: number | null
          category?: string | null
          created_at?: string | null
          document_url?: string | null
          frequency?: string | null
          id?: number
          item_type?: string
          last_done?: string | null
          next_due?: string | null
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          building_id: number | null
          created_at: string | null
          created_by: string | null
          entry_text: string
          id: string
        }
        Insert: {
          building_id?: number | null
          created_at?: string | null
          created_by?: string | null
          entry_text: string
          id?: string
        }
        Update: {
          building_id?: number | null
          created_at?: string | null
          created_by?: string | null
          entry_text?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          agency_id: string | null
          building_id: string | null
          content: string | null
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          agency_id?: string | null
          building_id?: string | null
          content?: string | null
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          agency_id?: string | null
          building_id?: string | null
          content?: string | null
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          building: string | null
          category: string | null
          created_at: string
          id: number
          input: string | null
          output: string | null
          user_id: string | null
        }
        Insert: {
          building?: string | null
          category?: string | null
          created_at?: string
          id?: number
          input?: string | null
          output?: string | null
          user_id?: string | null
        }
        Update: {
          building?: string | null
          category?: string | null
          created_at?: string
          id?: number
          input?: string | null
          output?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_drafts: {
        Row: {
          created_at: string | null
          draft_text: string | null
          email_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          draft_text?: string | null
          email_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          draft_text?: string | null
          email_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "incoming_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_email_id_fkey1"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "incoming_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_email_drafts_email_id"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "incoming_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_history: {
        Row: {
          email_id: string | null
          id: string
          sent_at: string | null
          sent_text: string | null
        }
        Insert: {
          email_id?: string | null
          id?: string
          sent_at?: string | null
          sent_text?: string | null
        }
        Update: {
          email_id?: string | null
          id?: string
          sent_at?: string | null
          sent_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_history_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "incoming_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_emails: {
        Row: {
          body_preview: string | null
          building_id: number | null
          created_at: string | null
          from_email: string | null
          handled: boolean | null
          id: string
          message_id: string | null
          pinned: boolean | null
          received_at: string | null
          subject: string | null
          tag: string | null
          thread_id: string | null
          unit: string | null
          unread: boolean | null
          user_id: string | null
        }
        Insert: {
          body_preview?: string | null
          building_id?: number | null
          created_at?: string | null
          from_email?: string | null
          handled?: boolean | null
          id?: string
          message_id?: string | null
          pinned?: boolean | null
          received_at?: string | null
          subject?: string | null
          tag?: string | null
          thread_id?: string | null
          unit?: string | null
          unread?: boolean | null
          user_id?: string | null
        }
        Update: {
          body_preview?: string | null
          building_id?: number | null
          created_at?: string | null
          from_email?: string | null
          handled?: boolean | null
          id?: string
          message_id?: string | null
          pinned?: boolean | null
          received_at?: string | null
          subject?: string | null
          tag?: string | null
          thread_id?: string | null
          unit?: string | null
          unread?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incoming_emails_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      leaseholders: {
        Row: {
          email: string | null
          id: string
          name: string | null
          phone: string | null
          unit_id: number | null
        }
        Insert: {
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          unit_id?: number | null
        }
        Update: {
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          unit_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leaseholders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          building_id: number
          created_at: string | null
          doc_type: string | null
          doc_url: string | null
          expiry_date: string | null
          id: string
          is_headlease: boolean | null
          start_date: string | null
          unit_id: number | null
          uploaded_by: string | null
          user_id: string | null
        }
        Insert: {
          building_id: number
          created_at?: string | null
          doc_type?: string | null
          doc_url?: string | null
          expiry_date?: string | null
          id?: string
          is_headlease?: boolean | null
          start_date?: string | null
          unit_id?: number | null
          uploaded_by?: string | null
          user_id?: string | null
        }
        Update: {
          building_id?: number
          created_at?: string | null
          doc_type?: string | null
          doc_url?: string | null
          expiry_date?: string | null
          id?: string
          is_headlease?: boolean | null
          start_date?: string | null
          unit_id?: number | null
          uploaded_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_templates: {
        Row: {
          body: string | null
          building_id: string | null
          created_at: string
          created_by: string | null
          id: number
          subject: string | null
        }
        Insert: {
          body?: string | null
          building_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: number
          subject?: string | null
        }
        Update: {
          body?: string | null
          building_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: number
          subject?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
          agency_id: string | null
          building_id: number | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          agency_id?: string | null
          building_id?: number | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          agency_id?: string | null
          building_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          }
        ]
      }
      property_events: {
        Row: {
          id: string
          building_id: number | null
          title: string
          description: string | null
          start_time: string
          end_time: string | null
          event_type: string | null
          category: string | null
          outlook_event_id: string | null
          location: string | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          building_id?: number | null
          title: string
          description?: string | null
          start_time: string
          end_time?: string | null
          event_type?: string | null
          category?: string | null
          outlook_event_id?: string | null
          location?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          building_id?: number | null
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string | null
          event_type?: string | null
          category?: string | null
          outlook_event_id?: string | null
          location?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_events_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      units: {
        Row: {
          building_id: number
          created_at: string | null
          floor: string | null
          id: number
          leaseholder_email: string | null
          type: string | null
          unit_number: string
        }
        Insert: {
          building_id: number
          created_at?: string | null
          floor?: string | null
          id?: never
          leaseholder_email?: string | null
          type?: string | null
          unit_number: string
        }
        Update: {
          building_id?: number
          created_at?: string | null
          floor?: string | null
          id?: never
          leaseholder_email?: string | null
          type?: string | null
          unit_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          agency_id: string | null
          building_id: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          agency_id?: string | null
          building_id?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Update: {
          agency_id?: string | null
          building_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
