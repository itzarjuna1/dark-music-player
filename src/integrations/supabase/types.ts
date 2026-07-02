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
          avatar_url: string | null
          created_at: string
          description: string | null
          genre: string | null
          id: string
          is_private: boolean
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          is_private?: boolean
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          is_private?: boolean
          name?: string
          owner_id?: string | null
          updated_at?: string
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
      playback_jobs: {
        Row: {
          chat_id: number
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          query: string
          requested_by: string | null
          requested_by_user_id: number | null
          source: string
          status: string
          target_clone_id: string
          updated_at: string
        }
        Insert: {
          chat_id: number
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          query: string
          requested_by?: string | null
          requested_by_user_id?: number | null
          source?: string
          status?: string
          target_clone_id: string
          updated_at?: string
        }
        Update: {
          chat_id?: number
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          query?: string
          requested_by?: string | null
          requested_by_user_id?: number | null
          source?: string
          status?: string
          target_clone_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playback_jobs_target_clone_id_fkey"
            columns: ["target_clone_id"]
            isOneToOne: false
            referencedRelation: "bot_clones"
            referencedColumns: ["id"]
          },
        ]
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
      room_bans: {
        Row: {
          banned_by: string | null
          created_at: string
          id: string
          reason: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          banned_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          banned_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_bans_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          id: string
          joined_at: string
          muted: boolean
          role: Database["public"]["Enums"]["room_role"]
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          muted?: boolean
          role?: Database["public"]["Enums"]["room_role"]
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          muted?: boolean
          role?: Database["public"]["Enums"]["room_role"]
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
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
      voice_participants: {
        Row: {
          id: string
          is_muted: boolean
          is_speaking: boolean
          joined_at: string
          last_seen: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_muted?: boolean
          is_speaking?: boolean
          joined_at?: string
          last_seen?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_muted?: boolean
          is_speaking?: boolean
          joined_at?: string
          last_seen?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_signals: {
        Row: {
          created_at: string
          from_user: string
          id: string
          kind: string
          payload: Json
          room_id: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          kind: string
          payload: Json
          room_id: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          kind?: string
          payload?: Json
          room_id?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_signals_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_banned: { Args: { _room: string; _uid: string }; Returns: boolean }
      is_room_admin: { Args: { _room: string; _uid: string }; Returns: boolean }
      is_room_member: {
        Args: { _room: string; _uid: string }
        Returns: boolean
      }
      is_room_owner: { Args: { _room: string; _uid: string }; Returns: boolean }
      room_is_public: { Args: { _room: string }; Returns: boolean }
    }
    Enums: {
      room_role: "owner" | "admin" | "member"
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
      room_role: ["owner", "admin", "member"],
    },
  },
} as const
