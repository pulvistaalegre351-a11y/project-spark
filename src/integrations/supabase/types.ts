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
      api_providers: {
        Row: {
          api_key: string
          company: string | null
          created_at: string
          daily_limit: number | null
          endpoint: string
          id: string
          is_active: boolean
          last_error: string | null
          last_used_at: string | null
          model: string
          monthly_limit: number | null
          name: string
          priority: number
          provider_type: Database["public"]["Enums"]["api_provider_type"]
          tokens_used_month: number
          tokens_used_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          company?: string | null
          created_at?: string
          daily_limit?: number | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_used_at?: string | null
          model: string
          monthly_limit?: number | null
          name: string
          priority?: number
          provider_type?: Database["public"]["Enums"]["api_provider_type"]
          tokens_used_month?: number
          tokens_used_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          company?: string | null
          created_at?: string
          daily_limit?: number | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_used_at?: string | null
          model?: string
          monthly_limit?: number | null
          name?: string
          priority?: number
          provider_type?: Database["public"]["Enums"]["api_provider_type"]
          tokens_used_month?: number
          tokens_used_today?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatbots: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_personality: string | null
          description: string | null
          frequency_penalty: number
          id: string
          is_active: boolean
          max_tokens: number
          memory_enabled: boolean
          memory_max_messages: number
          name: string
          personality: Database["public"]["Enums"]["personality_type"]
          presence_penalty: number
          streaming: boolean
          system_prompt: string
          temperature: number
          top_p: number
          updated_at: string
          user_id: string
          widget_color: string
          widget_greeting: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_personality?: string | null
          description?: string | null
          frequency_penalty?: number
          id?: string
          is_active?: boolean
          max_tokens?: number
          memory_enabled?: boolean
          memory_max_messages?: number
          name: string
          personality?: Database["public"]["Enums"]["personality_type"]
          presence_penalty?: number
          streaming?: boolean
          system_prompt?: string
          temperature?: number
          top_p?: number
          updated_at?: string
          user_id: string
          widget_color?: string
          widget_greeting?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_personality?: string | null
          description?: string | null
          frequency_penalty?: number
          id?: string
          is_active?: boolean
          max_tokens?: number
          memory_enabled?: boolean
          memory_max_messages?: number
          name?: string
          personality?: Database["public"]["Enums"]["personality_type"]
          presence_penalty?: number
          streaming?: boolean
          system_prompt?: string
          temperature?: number
          top_p?: number
          updated_at?: string
          user_id?: string
          widget_color?: string
          widget_greeting?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          chatbot_id: string
          created_at: string
          id: string
          is_favorite: boolean
          title: string
          total_tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          chatbot_id: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          title?: string
          total_tokens?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          chatbot_id?: string
          created_at?: string
          id?: string
          is_favorite?: boolean
          title?: string
          total_tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          chatbot_id: string
          content: string
          created_at: string
          id: string
          source_type: Database["public"]["Enums"]["knowledge_source_type"]
          source_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          chatbot_id: string
          content: string
          created_at?: string
          id?: string
          source_type?: Database["public"]["Enums"]["knowledge_source_type"]
          source_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          chatbot_id?: string
          content?: string
          created_at?: string
          id?: string
          source_type?: Database["public"]["Enums"]["knowledge_source_type"]
          source_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          api_provider_id: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          model_used: string | null
          response_time_ms: number | null
          role: Database["public"]["Enums"]["message_role"]
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          api_provider_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          model_used?: string | null
          response_time_ms?: number | null
          role: Database["public"]["Enums"]["message_role"]
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          api_provider_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model_used?: string | null
          response_time_ms?: number | null
          role?: Database["public"]["Enums"]["message_role"]
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_api_provider_id_fkey"
            columns: ["api_provider_id"]
            isOneToOne: false
            referencedRelation: "api_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
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
      api_provider_type:
        | "openai"
        | "gemini"
        | "anthropic"
        | "deepseek"
        | "groq"
        | "openrouter"
        | "mistral"
        | "cohere"
        | "together"
        | "ollama"
        | "lmstudio"
        | "openai_compatible"
        | "custom"
      app_role: "admin" | "user"
      knowledge_source_type:
        | "text"
        | "pdf"
        | "docx"
        | "txt"
        | "csv"
        | "json"
        | "markdown"
        | "html"
        | "url"
        | "faq"
      message_role: "user" | "assistant" | "system"
      personality_type:
        | "professional"
        | "friendly"
        | "salesperson"
        | "support"
        | "lawyer"
        | "doctor"
        | "consultant"
        | "custom"
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
      api_provider_type: [
        "openai",
        "gemini",
        "anthropic",
        "deepseek",
        "groq",
        "openrouter",
        "mistral",
        "cohere",
        "together",
        "ollama",
        "lmstudio",
        "openai_compatible",
        "custom",
      ],
      app_role: ["admin", "user"],
      knowledge_source_type: [
        "text",
        "pdf",
        "docx",
        "txt",
        "csv",
        "json",
        "markdown",
        "html",
        "url",
        "faq",
      ],
      message_role: ["user", "assistant", "system"],
      personality_type: [
        "professional",
        "friendly",
        "salesperson",
        "support",
        "lawyer",
        "doctor",
        "consultant",
        "custom",
      ],
    },
  },
} as const
