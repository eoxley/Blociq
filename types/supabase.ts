export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      buildings: {
        Row: {
          id: string
          name: string
          address: string | null
          unit_count: number | null
          access_notes: string | null
          sites_staff: string | null
          parking_info: string | null
          council_borough: string | null
          building_manager_name: string | null
          building_manager_email: string | null
          building_manager_phone: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          building_age: string | null
          construction_type: string | null
          total_floors: string | null
          lift_available: string | null
          heating_type: string | null
          hot_water_type: string | null
          waste_collection_day: string | null
          recycling_info: string | null
          building_insurance_provider: string | null
          building_insurance_expiry: string | null
          fire_safety_status: string | null
          asbestos_status: string | null
          energy_rating: string | null
          service_charge_frequency: string | null
          ground_rent_amount: number | null
          ground_rent_frequency: string | null
          notes: string | null
          key_access_notes: string | null
          entry_code: string | null
          fire_panel_location: string | null
          demo_ready: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          unit_count?: number | null
          access_notes?: string | null
          sites_staff?: string | null
          parking_info?: string | null
          council_borough?: string | null
          building_manager_name?: string | null
          building_manager_email?: string | null
          building_manager_phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          building_age?: string | null
          construction_type?: string | null
          total_floors?: string | null
          lift_available?: string | null
          heating_type?: string | null
          hot_water_type?: string | null
          waste_collection_day?: string | null
          recycling_info?: string | null
          building_insurance_provider?: string | null
          building_insurance_expiry?: string | null
          fire_safety_status?: string | null
          asbestos_status?: string | null
          energy_rating?: string | null
          service_charge_frequency?: string | null
          ground_rent_amount?: number | null
          ground_rent_frequency?: string | null
          notes?: string | null
          key_access_notes?: string | null
          entry_code?: string | null
          fire_panel_location?: string | null
          demo_ready?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          unit_count?: number | null
          access_notes?: string | null
          sites_staff?: string | null
          parking_info?: string | null
          council_borough?: string | null
          building_manager_name?: string | null
          building_manager_email?: string | null
          building_manager_phone?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          building_age?: string | null
          construction_type?: string | null
          total_floors?: string | null
          lift_available?: string | null
          heating_type?: string | null
          hot_water_type?: string | null
          waste_collection_day?: string | null
          recycling_info?: string | null
          building_insurance_provider?: string | null
          building_insurance_expiry?: string | null
          fire_safety_status?: string | null
          asbestos_status?: string | null
          energy_rating?: string | null
          service_charge_frequency?: string | null
          ground_rent_amount?: number | null
          ground_rent_frequency?: string | null
          notes?: string | null
          key_access_notes?: string | null
          entry_code?: string | null
          fire_panel_location?: string | null
          demo_ready?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      units: {
        Row: {
          id: string
          building_id: string | null
          unit_number: string
          type: string | null
          floor: string | null
          leaseholder_email: string | null
          leaseholder_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id?: string | null
          unit_number: string
          type?: string | null
          floor?: string | null
          leaseholder_email?: string | null
          leaseholder_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string | null
          unit_number?: string
          type?: string | null
          floor?: string | null
          leaseholder_email?: string | null
          leaseholder_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leaseholders: {
        Row: {
          id: string
          unit_id: string | null
          full_name: string | null
          email: string | null
          phone_number: string | null
          correspondence_address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unit_id?: string | null
          full_name?: string | null
          email?: string | null
          phone_number?: string | null
          correspondence_address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unit_id?: string | null
          full_name?: string | null
          email?: string | null
          phone_number?: string | null
          correspondence_address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contractors: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          email: string | null
          phone: string | null
          address: string | null
          services: string[] | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          services?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          services?: string[] | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      building_documents: {
        Row: {
          id: string
          building_id: string | null
          unit_id: string | null
          leaseholder_id: string | null
          file_name: string | null
          file_url: string | null
          type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id?: string | null
          unit_id?: string | null
          leaseholder_id?: string | null
          file_name?: string | null
          file_url?: string | null
          type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string | null
          unit_id?: string | null
          leaseholder_id?: string | null
          file_name?: string | null
          file_url?: string | null
          type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      incoming_emails: {
        Row: {
          id: string
          building_id: string | null
          from_email: string
          from_name: string | null
          subject: string | null
          body: string | null
          received_at: string
          handled: boolean
          unread: boolean
          thread_id: string | null
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id?: string | null
          from_email: string
          from_name?: string | null
          subject?: string | null
          body?: string | null
          received_at?: string
          handled?: boolean
          unread?: boolean
          thread_id?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string | null
          from_email?: string
          from_name?: string | null
          subject?: string | null
          body?: string | null
          received_at?: string
          handled?: boolean
          unread?: boolean
          thread_id?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      building_compliance_assets: {
        Row: {
          id: string
          building_id: string | null
          asset_id: string | null
          status: string
          last_renewed_date: string | null
          next_due_date: string | null
          last_updated: string
          latest_document_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id?: string | null
          asset_id?: string | null
          status?: string
          last_renewed_date?: string | null
          next_due_date?: string | null
          last_updated?: string
          latest_document_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string | null
          asset_id?: string | null
          status?: string
          last_renewed_date?: string | null
          next_due_date?: string | null
          last_updated?: string
          latest_document_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      major_works_projects: {
        Row: {
          id: string
          building_id: string | null
          project_name: string
          description: string | null
          start_date: string | null
          end_date: string | null
          budget: number | null
          status: string
          contractor: string | null
          project_manager: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id?: string | null
          project_name: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          status?: string
          contractor?: string | null
          project_manager?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string | null
          project_name?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          status?: string
          contractor?: string | null
          project_manager?: string | null
          created_at?: string
          updated_at?: string
        }
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
  }
}
