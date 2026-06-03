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
          api_key: string
          contact_info: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          is_owner: boolean
          last_renewed_at: string | null
          monthly_quota: number
          name: string
          plan: string
          requests_used: number
          telegram_user_id: number | null
          updated_at: string
        }
        Insert: {
          api_key: string
          contact_info?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_owner?: boolean
          last_renewed_at?: string | null
          monthly_quota?: number
          name?: string
          plan?: string
          requests_used?: number
          telegram_user_id?: number | null
          updated_at?: string
        }
        Update: {
          api_key?: string
          contact_info?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_owner?: boolean
          last_renewed_at?: string | null
          monthly_quota?: number
          name?: string
          plan?: string
          requests_used?: number
          telegram_user_id?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key: string
          created_at: string
          endpoint: string
          id: string
          status: number
        }
        Insert: {
          api_key: string
          created_at?: string
          endpoint: string
          id?: string
          status?: number
        }
        Update: {
          api_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          status?: number
        }
        Relationships: []
      }
      bot_clones: {
        Row: {
          api_hash: string | null
          api_id: string | null
          assistant_name: string | null
          assistant_string_session: string
          bot_token: string
          created_at: string
          id: string
          is_active: boolean
          last_heartbeat: string | null
          logger_chat_id: string
          name: string
          notes: string | null
          owner_api_key: string
          updated_at: string
        }
        Insert: {
          api_hash?: string | null
          api_id?: string | null
          assistant_name?: string | null
          assistant_string_session: string
          bot_token: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_heartbeat?: string | null
          logger_chat_id: string
          name?: string
          notes?: string | null
          owner_api_key: string
          updated_at?: string
        }
        Update: {
          api_hash?: string | null
          api_id?: string | null
          assistant_name?: string | null
          assistant_string_session?: string
          bot_token?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_heartbeat?: string | null
          logger_chat_id?: string
          name?: string
          notes?: string | null
          owner_api_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          message: string
          room_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          id?: string
          message: string
          room_id: string
          timestamp?: string
          user_id: string
        }
        Update: {
          id?: string
          message?: string
          room_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          description: string | null
          genre: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          track_album: string
          track_artist: string
          track_cover: string
          track_duration: number
          track_id: number
          track_preview: string
          track_title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          track_album: string
          track_artist: string
          track_cover: string
          track_duration: number
          track_id: number
          track_preview: string
          track_title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          track_album?: string
          track_artist?: string
          track_cover?: string
          track_duration?: number
          track_id?: number
          track_preview?: string
          track_title?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      now_playing: {
        Row: {
          album: string | null
          api_key: string
          api_key_id: string | null
          artist: string | null
          cover: string | null
          duration: number
          id: string
          is_playing: boolean
          position: number
          title: string
          updated_at: string
          video_id: string | null
        }
        Insert: {
          album?: string | null
          api_key: string
          api_key_id?: string | null
          artist?: string | null
          cover?: string | null
          duration?: number
          id?: string
          is_playing?: boolean
          position?: number
          title: string
          updated_at?: string
          video_id?: string | null
        }
        Update: {
          album?: string | null
          api_key?: string
          api_key_id?: string | null
          artist?: string | null
          cover?: string | null
          duration?: number
          id?: string
          is_playing?: boolean
          position?: number
          title?: string
          updated_at?: string
          video_id?: string | null
        }
        Relationships: []
      }
      play_history: {
        Row: {
          id: string
          played_at: string
          track_album: string
          track_artist: string
          track_cover: string
          track_duration: number
          track_id: number
          track_preview: string
          track_title: string
          user_id: string
        }
        Insert: {
          id?: string
          played_at?: string
          track_album: string
          track_artist: string
          track_cover: string
          track_duration: number
          track_id: number
          track_preview: string
          track_title: string
          user_id: string
        }
        Update: {
          id?: string
          played_at?: string
          track_album?: string
          track_artist?: string
          track_cover?: string
          track_duration?: number
          track_id?: number
          track_preview?: string
          track_title?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_activity: {
        Row: {
          action: string
          id: string
          playlist_id: string
          timestamp: string
          track_id: number | null
          track_title: string | null
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          playlist_id: string
          timestamp?: string
          track_id?: number | null
          track_title?: string | null
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          playlist_id?: string
          timestamp?: string
          track_id?: number | null
          track_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_activity_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_collaborators: {
        Row: {
          id: string
          invited_at: string
          playlist_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          playlist_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          playlist_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_collaborators_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_tracks: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          track_album: string
          track_artist: string
          track_cover: string
          track_duration: number
          track_id: number
          track_preview: string
          track_title: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position?: number
          track_album: string
          track_artist: string
          track_cover: string
          track_duration: number
          track_id: number
          track_preview: string
          track_title: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          track_album?: string
          track_artist?: string
          track_cover?: string
          track_duration?: number
          track_id?: number
          track_preview?: string
          track_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      telegram_api_users: {
        Row: {
          api_key: string | null
          created_at: string
          first_name: string | null
          telegram_user_id: number
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          first_name?: string | null
          telegram_user_id: number
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          first_name?: string | null
          telegram_user_id?: number
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          action: string
          id: string
          timestamp: string
          track_artist: string
          track_cover: string
          track_id: number
          track_title: string
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          timestamp?: string
          track_artist: string
          track_cover: string
          track_id: number
          track_title: string
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          timestamp?: string
          track_artist?: string
          track_cover?: string
          track_id?: number
          track_title?: string
          user_id?: string
        }
        Relationships: []
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
