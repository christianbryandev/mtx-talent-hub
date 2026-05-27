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
      achievements: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          title: string
          xp_reward: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          xp_reward?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
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
      applications: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      chat_canais: {
        Row: {
          criado_em: string | null
          descricao: string | null
          icon_url: string | null
          id: string
          nome: string
          tipo: string | null
        }
        Insert: {
          criado_em?: string | null
          descricao?: string | null
          icon_url?: string | null
          id?: string
          nome: string
          tipo?: string | null
        }
        Update: {
          criado_em?: string | null
          descricao?: string | null
          icon_url?: string | null
          id?: string
          nome?: string
          tipo?: string | null
        }
        Relationships: []
      }
      chat_membros: {
        Row: {
          canal_id: string | null
          id: string
          perfil_id: string | null
          pode_escrever: boolean | null
          ultimo_acesso: string | null
        }
        Insert: {
          canal_id?: string | null
          id?: string
          perfil_id?: string | null
          pode_escrever?: boolean | null
          ultimo_acesso?: string | null
        }
        Update: {
          canal_id?: string | null
          id?: string
          perfil_id?: string | null
          pode_escrever?: boolean | null
          ultimo_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_membros_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "chat_canais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_membros_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_membros_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_mensagens: {
        Row: {
          autor_id: string | null
          canal_id: string | null
          conteudo: string
          criado_em: string | null
          deletado: boolean | null
          editado: boolean | null
          id: string
          tipo: string | null
        }
        Insert: {
          autor_id?: string | null
          canal_id?: string | null
          conteudo: string
          criado_em?: string | null
          deletado?: boolean | null
          editado?: boolean | null
          id?: string
          tipo?: string | null
        }
        Update: {
          autor_id?: string | null
          canal_id?: string | null
          conteudo?: string
          criado_em?: string | null
          deletado?: boolean | null
          editado?: boolean | null
          id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensagens_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_mensagens_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chat_mensagens_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "chat_canais"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reacoes: {
        Row: {
          criado_em: string | null
          emoji: string
          id: string
          mensagem_id: string | null
          perfil_id: string | null
        }
        Insert: {
          criado_em?: string | null
          emoji: string
          id?: string
          mensagem_id?: string | null
          perfil_id?: string | null
        }
        Update: {
          criado_em?: string | null
          emoji?: string
          id?: string
          mensagem_id?: string | null
          perfil_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_reacoes_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "chat_mensagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reacoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reacoes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_briefings: {
        Row: {
          additional_notes: string | null
          biggest_challenge: string | null
          client_id: string | null
          commercial_goals: string | null
          communication_tone: string | null
          company_name: string | null
          competitors: string | null
          contact_name: string | null
          created_at: string
          current_channels: string | null
          current_website: string | null
          differentials: string | null
          estimated_budget: string | null
          existing_materials: string | null
          expected_deadline: string | null
          goals_with_mtx: string | null
          has_commercial_team: boolean | null
          id: string
          invests_in_marketing: boolean | null
          main_pains: string | null
          main_products: string | null
          marketing_goals: string | null
          segment: string | null
          social_media: string | null
          submitted_at: string
          target_audience: string | null
          tools_access: string | null
          urgency: string | null
          uses_crm: boolean | null
        }
        Insert: {
          additional_notes?: string | null
          biggest_challenge?: string | null
          client_id?: string | null
          commercial_goals?: string | null
          communication_tone?: string | null
          company_name?: string | null
          competitors?: string | null
          contact_name?: string | null
          created_at?: string
          current_channels?: string | null
          current_website?: string | null
          differentials?: string | null
          estimated_budget?: string | null
          existing_materials?: string | null
          expected_deadline?: string | null
          goals_with_mtx?: string | null
          has_commercial_team?: boolean | null
          id?: string
          invests_in_marketing?: boolean | null
          main_pains?: string | null
          main_products?: string | null
          marketing_goals?: string | null
          segment?: string | null
          social_media?: string | null
          submitted_at?: string
          target_audience?: string | null
          tools_access?: string | null
          urgency?: string | null
          uses_crm?: boolean | null
        }
        Update: {
          additional_notes?: string | null
          biggest_challenge?: string | null
          client_id?: string | null
          commercial_goals?: string | null
          communication_tone?: string | null
          company_name?: string | null
          competitors?: string | null
          contact_name?: string | null
          created_at?: string
          current_channels?: string | null
          current_website?: string | null
          differentials?: string | null
          estimated_budget?: string | null
          existing_materials?: string | null
          expected_deadline?: string | null
          goals_with_mtx?: string | null
          has_commercial_team?: boolean | null
          id?: string
          invests_in_marketing?: boolean | null
          main_pains?: string | null
          main_products?: string | null
          marketing_goals?: string | null
          segment?: string | null
          social_media?: string | null
          submitted_at?: string
          target_audience?: string | null
          tools_access?: string | null
          urgency?: string | null
          uses_crm?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_briefings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_history: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          recorded_by: string | null
          type: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          recorded_by?: string | null
          type?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          recorded_by?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_history_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_history_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_services: {
        Row: {
          client_id: string
          created_at: string
          end_date: string | null
          executor_id: string | null
          id: string
          monthly_value: number | null
          notes: string | null
          recurrence_paused: boolean
          service_id: string | null
          service_name: string | null
          start_date: string | null
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date?: string | null
          executor_id?: string | null
          id?: string
          monthly_value?: number | null
          notes?: string | null
          recurrence_paused?: boolean
          service_id?: string | null
          service_name?: string | null
          start_date?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string | null
          executor_id?: string | null
          id?: string
          monthly_value?: number | null
          notes?: string | null
          recurrence_paused?: boolean
          service_id?: string | null
          service_name?: string | null
          start_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active_contract: boolean | null
          address: string | null
          city: string | null
          cnpj: string | null
          commercial_responsible: string | null
          company_name: string
          company_size: string | null
          contact_name: string | null
          contact_role: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          email: string | null
          entry_date: string | null
          facebook: string | null
          id: string
          instagram: string | null
          lead_origin: string | null
          linkedin: string | null
          logo_url: string | null
          monthly_value: number | null
          niche: string | null
          observations: string | null
          phone: string | null
          profile_id: string | null
          segment: string | null
          setup_value: number | null
          state: string | null
          status: string
          trade_name: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          young_responsible: string | null
        }
        Insert: {
          active_contract?: boolean | null
          address?: string | null
          city?: string | null
          cnpj?: string | null
          commercial_responsible?: string | null
          company_name: string
          company_size?: string | null
          contact_name?: string | null
          contact_role?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          email?: string | null
          entry_date?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          lead_origin?: string | null
          linkedin?: string | null
          logo_url?: string | null
          monthly_value?: number | null
          niche?: string | null
          observations?: string | null
          phone?: string | null
          profile_id?: string | null
          segment?: string | null
          setup_value?: number | null
          state?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          young_responsible?: string | null
        }
        Update: {
          active_contract?: boolean | null
          address?: string | null
          city?: string | null
          cnpj?: string | null
          commercial_responsible?: string | null
          company_name?: string
          company_size?: string | null
          contact_name?: string | null
          contact_role?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          email?: string | null
          entry_date?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          lead_origin?: string | null
          linkedin?: string | null
          logo_url?: string | null
          monthly_value?: number | null
          niche?: string | null
          observations?: string | null
          phone?: string | null
          profile_id?: string | null
          segment?: string | null
          setup_value?: number | null
          state?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          young_responsible?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_commercial_responsible_fkey"
            columns: ["commercial_responsible"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_commercial_responsible_fkey"
            columns: ["commercial_responsible"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "clients_young_responsible_fkey"
            columns: ["young_responsible"]
            isOneToOne: false
            referencedRelation: "young_people"
            referencedColumns: ["id"]
          },
        ]
      }
      edit_requests: {
        Row: {
          approved_until: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string
          requested_fields: Json
          requester_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          approved_until?: string | null
          created_at?: string
          entity_id: string
          entity_type?: string
          id?: string
          reason: string
          requested_fields?: Json
          requester_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          approved_until?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string
          requested_fields?: Json
          requester_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "edit_requests_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "edit_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edit_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      invites: {
        Row: {
          application_id: string | null
          created_at: string
          email: string
          id: string
          is_used: boolean
          token: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_used?: boolean
          token?: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_used?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_cards: {
        Row: {
          attachments: Json
          created_at: string
          description: string | null
          id: string
          links: Json
          materials: string | null
          notes: string | null
          order_index: number
          phase_id: string
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          attachments?: Json
          created_at?: string
          description?: string | null
          id?: string
          links?: Json
          materials?: string | null
          notes?: string | null
          order_index?: number
          phase_id: string
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          attachments?: Json
          created_at?: string
          description?: string | null
          id?: string
          links?: Json
          materials?: string | null
          notes?: string | null
          order_index?: number
          phase_id?: string
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "journey_cards_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "journey_phase_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_checklist_items: {
        Row: {
          card_id: string
          created_at: string
          id: string
          module_id: string | null
          order_index: number
          required: boolean
          title: string
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          module_id?: string | null
          order_index?: number
          required?: boolean
          title: string
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          module_id?: string | null
          order_index?: number
          required?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_checklist_items_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "journey_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_checklist_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "journey_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_modules: {
        Row: {
          content_body: string | null
          content_type: string | null
          created_at: string
          description: string | null
          id: string
          order_index: number
          phase_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content_body?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          phase_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content_body?: string | null
          content_type?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          phase_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_modules_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "journey_phase_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_phase_assignees: {
        Row: {
          created_at: string
          id: string
          phase_id: string
          young_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phase_id: string
          young_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phase_id?: string
          young_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_phase_assignees_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "journey_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_phase_assignees_young_id_fkey"
            columns: ["young_id"]
            isOneToOne: false
            referencedRelation: "young_people"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_phase_catalog: {
        Row: {
          created_at: string
          description: string | null
          has_quiz: boolean
          id: string
          order_index: number
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          has_quiz?: boolean
          id?: string
          order_index: number
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          has_quiz?: boolean
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      journey_phases: {
        Row: {
          checklist: Json
          created_at: string
          description: string | null
          id: string
          phase: string
          position: number
          status: string
          title: string
          training_links: Json
          updated_at: string
          young_id: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          phase: string
          position?: number
          status?: string
          title: string
          training_links?: Json
          updated_at?: string
          young_id: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          phase?: string
          position?: number
          status?: string
          title?: string
          training_links?: Json
          updated_at?: string
          young_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_phases_young_id_fkey"
            columns: ["young_id"]
            isOneToOne: false
            referencedRelation: "young_people"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_quiz_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          id: string
          passed: boolean
          phase_id: string
          quiz_id: string | null
          score: number
          user_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          id?: string
          passed: boolean
          phase_id: string
          quiz_id?: string | null
          score: number
          user_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          id?: string
          passed?: boolean
          phase_id?: string
          quiz_id?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_quiz_attempts_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "journey_phase_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journey_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_action_items: {
        Row: {
          created_at: string
          description: string
          id: string
          meeting_id: string
          position: number
          responsible_id: string | null
          task_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          meeting_id: string
          position?: number
          responsible_id?: string | null
          task_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          meeting_id?: string
          position?: number
          responsible_id?: string | null
          task_id?: string | null
        }
        Relationships: []
      }
      meeting_agenda_items: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          meeting_id: string
          position: number
          responsible_id: string | null
          title: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_id: string
          position?: number
          responsible_id?: string | null
          title: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_id?: string
          position?: number
          responsible_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          id: string
          justification: string | null
          meeting_id: string
          present: boolean | null
          profile_id: string | null
          young_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          justification?: string | null
          meeting_id: string
          present?: boolean | null
          profile_id?: string | null
          young_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          justification?: string | null
          meeting_id?: string
          present?: boolean | null
          profile_id?: string | null
          young_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_tasks: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_tasks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string | null
          date: string
          decisions: string | null
          end_time: string | null
          id: string
          is_personal: boolean
          is_recurring: boolean | null
          link_client_id: string | null
          link_opportunity_id: string | null
          location: string | null
          next_steps: string | null
          objectives: string | null
          observations: string | null
          recurrence_rule: string | null
          responsible_id: string | null
          start_time: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          decisions?: string | null
          end_time?: string | null
          id?: string
          is_personal?: boolean
          is_recurring?: boolean | null
          link_client_id?: string | null
          link_opportunity_id?: string | null
          location?: string | null
          next_steps?: string | null
          objectives?: string | null
          observations?: string | null
          recurrence_rule?: string | null
          responsible_id?: string | null
          start_time?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          decisions?: string | null
          end_time?: string | null
          id?: string
          is_personal?: boolean
          is_recurring?: boolean | null
          link_client_id?: string | null
          link_opportunity_id?: string | null
          location?: string | null
          next_steps?: string | null
          objectives?: string | null
          observations?: string | null
          recurrence_rule?: string | null
          responsible_id?: string | null
          start_time?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          attachment_url: string | null
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      opportunities: {
        Row: {
          city: string | null
          closing_probability: number | null
          commercial_responsible: string | null
          company_name: string
          company_size: string | null
          contact_name: string | null
          converted_client_id: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          funnel_stage: string
          has_budget: boolean | null
          has_demand: boolean | null
          has_urgency: boolean | null
          id: string
          improvement_needed: string | null
          is_icp: boolean | null
          last_contact_date: string | null
          lead_origin: string | null
          loss_reason: string | null
          main_pain: string | null
          next_followup_date: string | null
          niche: string | null
          notes: string | null
          offered_service: string | null
          phone: string | null
          priority: string
          problem_identified: string | null
          proposal_sent_date: string | null
          proposal_status: string | null
          proposal_value: number | null
          qualification_score: number | null
          segment_validated: boolean | null
          solution_opportunity: string | null
          status: string
          suggested_solution: string | null
          temperature: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          closing_probability?: number | null
          commercial_responsible?: string | null
          company_name: string
          company_size?: string | null
          contact_name?: string | null
          converted_client_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          funnel_stage?: string
          has_budget?: boolean | null
          has_demand?: boolean | null
          has_urgency?: boolean | null
          id?: string
          improvement_needed?: string | null
          is_icp?: boolean | null
          last_contact_date?: string | null
          lead_origin?: string | null
          loss_reason?: string | null
          main_pain?: string | null
          next_followup_date?: string | null
          niche?: string | null
          notes?: string | null
          offered_service?: string | null
          phone?: string | null
          priority?: string
          problem_identified?: string | null
          proposal_sent_date?: string | null
          proposal_status?: string | null
          proposal_value?: number | null
          qualification_score?: number | null
          segment_validated?: boolean | null
          solution_opportunity?: string | null
          status?: string
          suggested_solution?: string | null
          temperature?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          closing_probability?: number | null
          commercial_responsible?: string | null
          company_name?: string
          company_size?: string | null
          contact_name?: string | null
          converted_client_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          funnel_stage?: string
          has_budget?: boolean | null
          has_demand?: boolean | null
          has_urgency?: boolean | null
          id?: string
          improvement_needed?: string | null
          is_icp?: boolean | null
          last_contact_date?: string | null
          lead_origin?: string | null
          loss_reason?: string | null
          main_pain?: string | null
          next_followup_date?: string | null
          niche?: string | null
          notes?: string | null
          offered_service?: string | null
          phone?: string | null
          priority?: string
          problem_identified?: string | null
          proposal_sent_date?: string | null
          proposal_status?: string | null
          proposal_value?: number | null
          qualification_score?: number | null
          segment_validated?: boolean | null
          solution_opportunity?: string | null
          status?: string
          suggested_solution?: string | null
          temperature?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      opportunity_interactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          next_action: string | null
          opportunity_id: string
          recorded_by: string | null
          type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          next_action?: string | null
          opportunity_id: string
          recorded_by?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          next_action?: string | null
          opportunity_id?: string
          recorded_by?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_interactions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_services: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_services_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_review_progress: {
        Row: {
          attempt_id: string | null
          created_at: string
          id: string
          item: string
          phase: string
          position: number
          reviewed: boolean
          young_id: string
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string
          id?: string
          item: string
          phase: string
          position?: number
          reviewed?: boolean
          young_id: string
        }
        Update: {
          attempt_id?: string | null
          created_at?: string
          id?: string
          item?: string
          phase?: string
          position?: number
          reviewed?: boolean
          young_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_review_progress_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "young_quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
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
      proposals: {
        Row: {
          client_id: string | null
          created_at: string
          file_url: string | null
          id: string
          notes: string | null
          opportunity_id: string
          responded_at: string | null
          sent_at: string | null
          status: string
          title: string | null
          value: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          opportunity_id: string
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string | null
          value?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          media_type: string | null
          media_url: string | null
          order_index: number
          question_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          media_type?: string | null
          media_url?: string | null
          order_index?: number
          question_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          media_type?: string | null
          media_url?: string | null
          order_index?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          order_index: number
          question: string
          quiz_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          order_index?: number
          question: string
          quiz_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          order_index?: number
          question?: string
          quiz_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          passing_score: number
          phase_id: string
          title: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          passing_score?: number
          phase_id: string
          title: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          passing_score?: number
          phase_id?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_templates_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: true
            referencedRelation: "journey_phase_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      service_onboarding_checklist: {
        Row: {
          created_at: string
          id: string
          item: string
          position: number
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item: string
          position?: number
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item?: string
          position?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_onboarding_checklist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_task_templates: {
        Row: {
          created_at: string
          default_deadline_days: number | null
          id: string
          name: string
          position: number
          responsible_area: string | null
          service_id: string
          task_type: string | null
        }
        Insert: {
          created_at?: string
          default_deadline_days?: number | null
          id?: string
          name: string
          position?: number
          responsible_area?: string | null
          service_id: string
          task_type?: string | null
        }
        Update: {
          created_at?: string
          default_deadline_days?: number | null
          id?: string
          name?: string
          position?: number
          responsible_area?: string | null
          service_id?: string
          task_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_task_templates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_young_people: {
        Row: {
          created_at: string
          id: string
          service_id: string
          young_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_id: string
          young_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_id?: string
          young_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_young_people_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_young_people_young_id_fkey"
            columns: ["young_id"]
            isOneToOne: false
            referencedRelation: "young_people"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          average_deadline: number | null
          base_price: number | null
          billing_model: string | null
          category: string | null
          created_at: string
          default_executor_id: string | null
          default_value: number | null
          deliverables: string | null
          description: string | null
          executor_profile: string | null
          frequency: string | null
          id: string
          is_active: boolean
          name: string
          pct_commercial: number | null
          pct_executor: number | null
          pct_mtx: number | null
          responsible_area: string | null
          scope: string | null
          service_type: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          average_deadline?: number | null
          base_price?: number | null
          billing_model?: string | null
          category?: string | null
          created_at?: string
          default_executor_id?: string | null
          default_value?: number | null
          deliverables?: string | null
          description?: string | null
          executor_profile?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          name: string
          pct_commercial?: number | null
          pct_executor?: number | null
          pct_mtx?: number | null
          responsible_area?: string | null
          scope?: string | null
          service_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          average_deadline?: number | null
          base_price?: number | null
          billing_model?: string | null
          category?: string | null
          created_at?: string
          default_executor_id?: string | null
          default_value?: number | null
          deliverables?: string | null
          description?: string | null
          executor_profile?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pct_commercial?: number | null
          pct_executor?: number | null
          pct_mtx?: number | null
          responsible_area?: string | null
          scope?: string | null
          service_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          action: string
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          metadata: Json
          status: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          status: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_url: string | null
          id: string
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_checklists: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          item: string
          position: number
          task_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          item: string
          position?: number
          task_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          item?: string
          position?: number
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklists_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          area: string | null
          auto_generated: boolean
          awaiting_approval: boolean
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          hours_realized: number | null
          id: string
          kanban_column: string
          opportunity_id: string | null
          position: number
          priority: string
          service_id: string | null
          start_date: string | null
          status: string
          supervisor_id: string | null
          title: string
          updated_at: string
          young_responsible: string | null
        }
        Insert: {
          area?: string | null
          auto_generated?: boolean
          awaiting_approval?: boolean
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          hours_realized?: number | null
          id?: string
          kanban_column?: string
          opportunity_id?: string | null
          position?: number
          priority?: string
          service_id?: string | null
          start_date?: string | null
          status?: string
          supervisor_id?: string | null
          title: string
          updated_at?: string
          young_responsible?: string | null
        }
        Update: {
          area?: string | null
          auto_generated?: boolean
          awaiting_approval?: boolean
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          hours_realized?: number | null
          id?: string
          kanban_column?: string
          opportunity_id?: string | null
          position?: number
          priority?: string
          service_id?: string | null
          start_date?: string | null
          status?: string
          supervisor_id?: string | null
          title?: string
          updated_at?: string
          young_responsible?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_young_responsible_fkey"
            columns: ["young_responsible"]
            isOneToOne: false
            referencedRelation: "young_people"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_card_progress: {
        Row: {
          card_id: string
          completed: boolean
          completed_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          card_id: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          card_id?: string
          completed?: boolean
          completed_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_card_progress_card_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "journey_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_card_progress_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "journey_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_checklist_progress: {
        Row: {
          checklist_item_id: string
          completed: boolean
          completed_at: string
          id: string
          user_id: string
        }
        Insert: {
          checklist_item_id: string
          completed?: boolean
          completed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          checklist_item_id?: string
          completed?: boolean
          completed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_checklist_progress_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "journey_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_checklist_progress_item_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "journey_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          full_name: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          full_name: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_phase_status: {
        Row: {
          completed_at: string | null
          id: string
          phase_id: string
          status: string
          unlocked: boolean
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          phase_id: string
          status?: string
          unlocked?: boolean
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          phase_id?: string
          status?: string
          unlocked?: boolean
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_phase_status_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "journey_phase_catalog"
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
      xp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          reference_id: string
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          reference_id: string
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          reference_id?: string
          user_id?: string
          xp_amount?: number
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
            foreignKeyName: "young_evolution_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
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
          last_progress_at: string
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
          last_progress_at?: string
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
          last_progress_at?: string
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
            foreignKeyName: "young_people_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "young_people_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "young_people_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "vw_journey_ranking"
            referencedColumns: ["user_id"]
          },
        ]
      }
      young_quiz_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          id: string
          passed: boolean
          phase: string
          score: number
          young_id: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          id?: string
          passed?: boolean
          phase: string
          score: number
          young_id: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          id?: string
          passed?: boolean
          phase?: string
          score?: number
          young_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_journey_ranking: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          full_name: string | null
          progress_percentage: number | null
          rank_position: number | null
          total_xp: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_client_service: {
        Args: { _client_service_id: string }
        Returns: Json
      }
      admin_get_journey_monitor: { Args: never; Returns: Json }
      admin_get_journey_tracking: { Args: never; Returns: Json }
      admin_get_quiz_options: {
        Args: { p_question_id: string }
        Returns: {
          id: string
          is_correct: boolean
          media_type: string
          media_url: string
          order_index: number
          question_id: string
          text: string
        }[]
      }
      can_access_chat: { Args: never; Returns: boolean }
      daily_notifications_job: { Args: never; Returns: undefined }
      get_catalog_phases: { Args: never; Returns: Json }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          full_name: string
          role: Database["public"]["Enums"]["app_role"]
          used: boolean
        }[]
      }
      get_invite_by_token_public: {
        Args: { _token: string }
        Returns: {
          application_id: string
          created_at: string
          email: string
          id: string
          is_used: boolean
          token: string
        }[]
      }
      get_journey_conversion: { Args: never; Returns: Json }
      get_journey_kpis: { Args: never; Returns: Json }
      get_journey_phase_distribution: { Args: never; Returns: Json }
      get_journey_ranking: {
        Args: never
        Returns: {
          avatar_url: string
          first_name: string
          full_name: string
          progress_percentage: number
          rank_position: number
          total_xp: number
          user_id: string
        }[]
      }
      get_phase_quiz: { Args: { _phase_id: string }; Returns: Json }
      get_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_journey: { Args: { _user_id: string }; Returns: Json }
      get_young_people_safe: {
        Args: never
        Returns: {
          age: number
          availability: string
          city: string
          created_at: string
          current_situation: string
          dreams: string
          education_level: string
          email: string
          entry_date: string
          full_name: string
          has_cnpj: boolean
          has_internet: boolean
          has_laptop: boolean
          has_phone: boolean
          has_professional_chip: boolean
          id: string
          interest_area: string
          last_progress_at: string
          mentor_id: string
          observations: string
          phone: string
          photo_url: string
          profile_id: string
          school: string
          skills: string
          state: string
          status: string
          trail_phase: string
          updated_at: string
          vocation_area: string
          whatsapp: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_system_event: {
        Args: {
          _action: string
          _error_code: string
          _error_message: string
          _metadata: Json
          _status: string
          _user_id: string
        }
        Returns: undefined
      }
      mark_invite_used: { Args: { _token: string }; Returns: boolean }
      notify_admins: {
        Args: {
          _entity_id: string
          _entity_type: string
          _message: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      notify_roles: {
        Args: {
          _entity_id: string
          _entity_type: string
          _message: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _title: string
          _type: string
        }
        Returns: undefined
      }
      process_xp_event: {
        Args: {
          _event_type: string
          _reference_id: string
          _user_id: string
          _xp_amount: number
        }
        Returns: boolean
      }
      record_system_event: {
        Args: {
          _entity_id: string
          _entity_type: string
          _event_type: string
          _payload: Json
          _user_id: string
        }
        Returns: undefined
      }
      seed_journey_demo: { Args: never; Returns: Json }
      start_user_journey: { Args: never; Returns: Json }
      submit_phase_quiz: {
        Args: { _answers: Json; _phase_id: string }
        Returns: Json
      }
      toggle_checklist_item: {
        Args: { _completed: boolean; _item_id: string; _user_id: string }
        Returns: Json
      }
      update_phase_checklist: {
        Args: { _checklist: Json; _phase_id: string }
        Returns: undefined
      }
      update_phase_fields: {
        Args: { _data: Json; _phase_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "comercial"
        | "jovem_aprendiz"
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
      app_role: [
        "super_admin",
        "admin",
        "comercial",
        "jovem_aprendiz",
        "cliente",
      ],
    },
  },
} as const
