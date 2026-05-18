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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          last_sign_in_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          last_sign_in_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_sign_in_at?: string | null
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
      young_applications: {
        Row: {
          address: string | null
          age: number | null
          birth_date: string | null
          city: string | null
          created_at: string
          currently_studying: boolean | null
          currently_working: boolean | null
          data_authorization: boolean | null
          dreams: string | null
          education_level: string | null
          email: string | null
          family_income: string | null
          full_name: string
          guardian_authorization: boolean | null
          has_internet: boolean | null
          has_laptop: boolean | null
          has_phone: boolean | null
          how_found_mtx: string | null
          id: string
          interest_area: string | null
          perceived_skills: string | null
          personal_story: string | null
          phone: string | null
          state: string | null
          status: string
          whatsapp: string | null
          why_mtx: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          currently_studying?: boolean | null
          currently_working?: boolean | null
          data_authorization?: boolean | null
          dreams?: string | null
          education_level?: string | null
          email?: string | null
          family_income?: string | null
          full_name: string
          guardian_authorization?: boolean | null
          has_internet?: boolean | null
          has_laptop?: boolean | null
          has_phone?: boolean | null
          how_found_mtx?: string | null
          id?: string
          interest_area?: string | null
          perceived_skills?: string | null
          personal_story?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          whatsapp?: string | null
          why_mtx?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          currently_studying?: boolean | null
          currently_working?: boolean | null
          data_authorization?: boolean | null
          dreams?: string | null
          education_level?: string | null
          email?: string | null
          family_income?: string | null
          full_name?: string
          guardian_authorization?: boolean | null
          has_internet?: boolean | null
          has_laptop?: boolean | null
          has_phone?: boolean | null
          how_found_mtx?: string | null
          id?: string
          interest_area?: string | null
          perceived_skills?: string | null
          personal_story?: string | null
          phone?: string | null
          state?: string | null
          status?: string
          whatsapp?: string | null
          why_mtx?: string | null
        }
        Relationships: []
      }
      young_attendance: {
        Row: {
          created_at: string
          id: string
          justification: string | null
          meeting_id: string | null
          present: boolean | null
          young_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          justification?: string | null
          meeting_id?: string | null
          present?: boolean | null
          young_id: string
        }
        Update: {
          created_at?: string
          id?: string
          justification?: string | null
          meeting_id?: string | null
          present?: boolean | null
          young_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "young_attendance_young_id_fkey"
            columns: ["young_id"]
            isOneToOne: false
            referencedRelation: "young_people"
            referencedColumns: ["id"]
          },
        ]
      }
      young_evolution: {
        Row: {
          created_at: string
          description: string | null
          id: string
          new_value: string | null
          previous_value: string | null
          recorded_by: string | null
          type: string
          young_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          new_value?: string | null
          previous_value?: string | null
          recorded_by?: string | null
          type: string
          young_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          new_value?: string | null
          previous_value?: string | null
          recorded_by?: string | null
          type?: string
          young_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "young_evolution_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "young_evolution_young_id_fkey"
            columns: ["young_id"]
            isOneToOne: false
            referencedRelation: "young_people"
            referencedColumns: ["id"]
          },
        ]
      }
      young_people: {
        Row: {
          address: string | null
          age: number | null
          availability: string | null
          bank_account: string | null
          bank_agency: string | null
          bank_name: string | null
          birth_date: string | null
          city: string | null
          cnpj_opening_date: string | null
          cnpj_type: string | null
          cpf: string | null
          created_at: string
          current_situation: string | null
          dreams: string | null
          education_level: string | null
          email: string | null
          entry_date: string | null
          family_income: string | null
          father_name: string | null
          first_client_attended: boolean | null
          first_client_date: string | null
          full_name: string
          guardian_contact: string | null
          has_cnpj: boolean | null
          has_internet: boolean | null
          has_laptop: boolean | null
          has_phone: boolean | null
          has_professional_chip: boolean | null
          id: string
          interest_area: string | null
          legal_guardian: string | null
          mentor_id: string | null
          mother_name: string | null
          observations: string | null
          people_at_home: number | null
          phone: string | null
          photo_url: string | null
          pix_key: string | null
          profile_id: string | null
          rg: string | null
          school: string | null
          skills: string | null
          social_context: string | null
          state: string | null
          status: string
          testimony: string | null
          total_income_generated: number | null
          trail_phase: string | null
          updated_at: string
          vocation_area: string | null
          whatsapp: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          availability?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          birth_date?: string | null
          city?: string | null
          cnpj_opening_date?: string | null
          cnpj_type?: string | null
          cpf?: string | null
          created_at?: string
          current_situation?: string | null
          dreams?: string | null
          education_level?: string | null
          email?: string | null
          entry_date?: string | null
          family_income?: string | null
          father_name?: string | null
          first_client_attended?: boolean | null
          first_client_date?: string | null
          full_name: string
          guardian_contact?: string | null
          has_cnpj?: boolean | null
          has_internet?: boolean | null
          has_laptop?: boolean | null
          has_phone?: boolean | null
          has_professional_chip?: boolean | null
          id?: string
          interest_area?: string | null
          legal_guardian?: string | null
          mentor_id?: string | null
          mother_name?: string | null
          observations?: string | null
          people_at_home?: number | null
          phone?: string | null
          photo_url?: string | null
          pix_key?: string | null
          profile_id?: string | null
          rg?: string | null
          school?: string | null
          skills?: string | null
          social_context?: string | null
          state?: string | null
          status?: string
          testimony?: string | null
          total_income_generated?: number | null
          trail_phase?: string | null
          updated_at?: string
          vocation_area?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          availability?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          birth_date?: string | null
          city?: string | null
          cnpj_opening_date?: string | null
          cnpj_type?: string | null
          cpf?: string | null
          created_at?: string
          current_situation?: string | null
          dreams?: string | null
          education_level?: string | null
          email?: string | null
          entry_date?: string | null
          family_income?: string | null
          father_name?: string | null
          first_client_attended?: boolean | null
          first_client_date?: string | null
          full_name?: string
          guardian_contact?: string | null
          has_cnpj?: boolean | null
          has_internet?: boolean | null
          has_laptop?: boolean | null
          has_phone?: boolean | null
          has_professional_chip?: boolean | null
          id?: string
          interest_area?: string | null
          legal_guardian?: string | null
          mentor_id?: string | null
          mother_name?: string | null
          observations?: string | null
          people_at_home?: number | null
          phone?: string | null
          photo_url?: string | null
          pix_key?: string | null
          profile_id?: string | null
          rg?: string | null
          school?: string | null
          skills?: string | null
          social_context?: string | null
          state?: string | null
          status?: string
          testimony?: string | null
          total_income_generated?: number | null
          trail_phase?: string | null
          updated_at?: string
          vocation_area?: string | null
          whatsapp?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "young_people_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "young_people_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      app_role:
        | "super_admin"
        | "admin"
        | "comercial"
        | "colaborador"
        | "cliente"
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
      app_role: ["super_admin", "admin", "comercial", "colaborador", "cliente"],
    },
  },
} as const
