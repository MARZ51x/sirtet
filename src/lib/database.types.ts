// PLACEHOLDER — hand-written to match supabase/schemas/*.sql so the app
// typechecks before the first `npm run gen:types`. Regenerate with:
//   npm run gen:types   (supabase gen types typescript — overwrites this file)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          username_changed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          username_changed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          username_changed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scores: {
        Row: {
          id: number;
          user_id: string;
          mode: string;
          score: number;
          lines: number;
          level: number;
          duration_ms: number;
          session_id: string;
          client_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id: string;
          mode: string;
          score: number;
          lines: number;
          level: number;
          duration_ms: number;
          session_id: string;
          client_version?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          data: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          data?: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_leaderboard: {
        Args: {
          p_mode: string;
          p_window?: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          rank: number;
          user_id: string;
          username: string;
          score: number;
          lines: number;
          level: number;
          duration_ms: number;
          achieved_at: string;
        }[];
      };
      get_my_rank: {
        Args: { p_mode: string; p_window?: string };
        Returns: {
          rank: number;
          total_players: number;
          score: number;
          lines: number;
          level: number;
          duration_ms: number;
          achieved_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
