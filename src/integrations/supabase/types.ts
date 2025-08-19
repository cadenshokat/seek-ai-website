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
      all_sources: {
        Row: {
          brand_id: string | null
          date: string
          id: string
          type: string
          url: string
        }
        Insert: {
          brand_id?: string | null
          date: string
          id?: string
          type: string
          url: string
        }
        Update: {
          brand_id?: string | null
          date?: string
          id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "all_sources_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_aliases: {
        Row: {
          alias: string
          brand_id: string
          id: string
        }
        Insert: {
          alias: string
          brand_id: string
          id?: string
        }
        Update: {
          alias?: string
          brand_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_aliases_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_mentions: {
        Row: {
          brand_id: string
          date: string
          id: string
          model_id: string
          position: number
          run_id: string
          sentence: string
          sentence_length: number
          sentiment: string
        }
        Insert: {
          brand_id: string
          date?: string
          id?: string
          model_id: string
          position: number
          run_id: string
          sentence: string
          sentence_length: number
          sentiment: string
        }
        Update: {
          brand_id?: string
          date?: string
          id?: string
          model_id?: string
          position?: number
          run_id?: string
          sentence?: string
          sentence_length?: number
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_mentions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_mentions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_mentions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_logs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      brands: {
        Row: {
          color: string | null
          id: string
          is_primary: boolean
          logo: string | null
          name: string
          org_id: string
          website: string | null
        }
        Insert: {
          color?: string | null
          id?: string
          is_primary?: boolean
          logo?: string | null
          name: string
          org_id: string
          website?: string | null
        }
        Update: {
          color?: string | null
          id?: string
          is_primary?: boolean
          logo?: string | null
          name?: string
          org_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_brands: {
        Row: {
          brand_logo: string | null
          brand_name: string
          chat_id: string
          created_at: string
          id: string
        }
        Insert: {
          brand_logo?: string | null
          brand_name: string
          chat_id: string
          created_at?: string
          id?: string
        }
        Update: {
          brand_logo?: string | null
          brand_name?: string
          chat_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_brands_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "prompt_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_citations: {
        Row: {
          chat_id: string
          citation_text: string
          created_at: string
          id: string
          position: number
          source_url: string
        }
        Insert: {
          chat_id: string
          citation_text: string
          created_at?: string
          id?: string
          position: number
          source_url: string
        }
        Update: {
          chat_id?: string
          citation_text?: string
          created_at?: string
          id?: string
          position?: number
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_citations_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "prompt_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sources: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          source_name: string
          source_url: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          source_name: string
          source_url: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          source_name?: string
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sources_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "prompt_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_chats: {
        Row: {
          competitor_id: string
          created_at: string
          id: string
          message: string
          response: string | null
        }
        Insert: {
          competitor_id: string
          created_at?: string
          id?: string
          message: string
          response?: string | null
        }
        Update: {
          competitor_id?: string
          created_at?: string
          id?: string
          message?: string
          response?: string | null
        }
        Relationships: []
      }
      competitor_mentions: {
        Row: {
          competitor_id: string
          date: string
          id: string
          model_id: string
          position: number
          run_id: string
          sentence_length: number
          sentence_mentioned: string
          sentiment: string
        }
        Insert: {
          competitor_id: string
          date?: string
          id?: string
          model_id: string
          position: number
          run_id: string
          sentence_length: number
          sentence_mentioned: string
          sentiment: string
        }
        Update: {
          competitor_id?: string
          date?: string
          id?: string
          model_id?: string
          position?: number
          run_id?: string
          sentence_length?: number
          sentence_mentioned?: string
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_mentions_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_mentions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_mentions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_logs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      competitors: {
        Row: {
          brand_id: string
          color: string | null
          id: string
          logo: string | null
          name: string | null
          website: string | null
        }
        Insert: {
          brand_id: string
          color?: string | null
          id?: string
          logo?: string | null
          name?: string | null
          website?: string | null
        }
        Update: {
          brand_id?: string
          color?: string | null
          id?: string
          logo?: string | null
          name?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          date: string
          entity_id: string
          entity_type: string
          id: string
          model_id: string
          position: number
          prompt_id: string | null
          run_id: string
          sentence: string | null
          sentence_length: number
          sentiment: string
        }
        Insert: {
          date?: string
          entity_id: string
          entity_type: string
          id?: string
          model_id: string
          position: number
          prompt_id?: string | null
          run_id: string
          sentence?: string | null
          sentence_length: number
          sentiment: string
        }
        Update: {
          date?: string
          entity_id?: string
          entity_type?: string
          id?: string
          model_id?: string
          position?: number
          prompt_id?: string | null
          run_id?: string
          sentence?: string | null
          sentence_length?: number
          sentiment?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_logs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      orgs: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      platforms: {
        Row: {
          brand_id: string | null
          id: string
          input_cost: number | null
          logo: string | null
          model: string
          name: string
          output_cost: number | null
        }
        Insert: {
          brand_id?: string | null
          id?: string
          input_cost?: number | null
          logo?: string | null
          model: string
          name: string
          output_cost?: number | null
        }
        Update: {
          brand_id?: string | null
          id?: string
          input_cost?: number | null
          logo?: string | null
          model?: string
          name?: string
          output_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "platforms_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_chats: {
        Row: {
          citations_count: number
          content: string
          country: string
          created_at: string
          id: string
          mentions_count: number
          model_provider: string
          prompt_id: string
          sources_count: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          citations_count?: number
          content: string
          country?: string
          created_at?: string
          id?: string
          mentions_count?: number
          model_provider?: string
          prompt_id: string
          sources_count?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          citations_count?: number
          content?: string
          country?: string
          created_at?: string
          id?: string
          mentions_count?: number
          model_provider?: string
          prompt_id?: string
          sources_count?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          brand_id: string | null
          created_at: string | null
          id: string
          is_active: boolean
          prompt: string
          topic: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          prompt: string
          topic?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          prompt?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      run_logs: {
        Row: {
          created_at: string
          run_id: string
        }
        Insert: {
          created_at?: string
          run_id: string
        }
        Update: {
          created_at?: string
          run_id?: string
        }
        Relationships: []
      }
      runs: {
        Row: {
          id: string
          input_tokens: number | null
          model_id: string
          output_tokens: number | null
          prompt_id: string
          response: string
          run_at: string
          run_id: string
          status: string
        }
        Insert: {
          id?: string
          input_tokens?: number | null
          model_id: string
          output_tokens?: number | null
          prompt_id: string
          response: string
          run_at?: string
          run_id: string
          status?: string
        }
        Update: {
          id?: string
          input_tokens?: number | null
          model_id?: string
          output_tokens?: number | null
          prompt_id?: string
          response?: string
          run_at?: string
          run_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_logs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      source_mentions: {
        Row: {
          date: string
          id: string
          model_id: string
          rank: number
          run_id: string
          source_id: string
        }
        Insert: {
          date?: string
          id?: string
          model_id: string
          rank: number
          run_id: string
          source_id: string
        }
        Update: {
          date?: string
          id?: string
          model_id?: string
          rank?: number
          run_id?: string
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_mentions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_mentions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_logs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "source_mentions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          name: string
          type: string
          url: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          name: string
          type: string
          url: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace: {
        Row: {
          country_code: string | null
          country_name: string | null
          created_at: string
          domain: string | null
          id: string
          ip_address: string | null
          name: string
          updated_at: string
        }
        Insert: {
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          ip_address?: string | null
          name?: string
          updated_at?: string
        }
        Update: {
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          ip_address?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_models: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_enabled: boolean
          model_name: string
          model_provider: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_enabled?: boolean
          model_name: string
          model_provider: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_enabled?: boolean
          model_name?: string
          model_provider?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      daily_visibility: {
        Row: {
          day: string | null
          entity_id: string | null
          entity_type: string | null
          mentions: number | null
          platform_id: string | null
          total_runs: number | null
        }
        Relationships: []
      }
      daily_visibility_stats: {
        Row: {
          day: string | null
          entity_id: string | null
          entity_type: string | null
          mentions: number | null
          platform_id: string | null
          total_runs: number | null
        }
        Relationships: []
      },
      v_recent_mentions_enriched: {
        Row: {
          id: string
          sentence: string
          position: number
          date: string
          entity_id: string
          entity_type: string
          model_id: string
          prompt_id: string
          brand_name: string
          brand_logo: string
          model_name: string
          model_logo: string
          prompt_text: string
        }
      }
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
