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
      app_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kanban_board_items: {
        Row: {
          board_id: string
          column_key: string
          created_at: string
          id: string
          sort_order: number
          task_id: string
          user_id: string
        }
        Insert: {
          board_id: string
          column_key: string
          created_at?: string
          id?: string
          sort_order?: number
          task_id: string
          user_id: string
        }
        Update: {
          board_id?: string
          column_key?: string
          created_at?: string
          id?: string
          sort_order?: number
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_board_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kanban_board_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      kanban_boards: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kanban_columns: {
        Row: {
          board_id: string
          column_key: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          board_id: string
          column_key: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          board_id?: string
          column_key?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kanban_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "kanban_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          attachments: Json
          color: string | null
          content: string
          created_at: string
          id: string
          pinned: boolean
          project_id: string | null
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          project_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          project_id?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          can_create_subprojects: boolean
          created_at: string
          id: string
          invited_by: string
          project_id: string
          role: Database["public"]["Enums"]["project_share_role"]
          scope: Database["public"]["Enums"]["project_share_scope"]
          user_id: string
        }
        Insert: {
          can_create_subprojects?: boolean
          created_at?: string
          id?: string
          invited_by: string
          project_id: string
          role?: Database["public"]["Enums"]["project_share_role"]
          scope?: Database["public"]["Enums"]["project_share_scope"]
          user_id: string
        }
        Update: {
          can_create_subprojects?: boolean
          created_at?: string
          id?: string
          invited_by?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_share_role"]
          scope?: Database["public"]["Enums"]["project_share_scope"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          can_create_subprojects: boolean
          created_at: string
          created_by: string
          expires_at: string
          id: string
          item_ids: Json
          project_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["project_share_role"]
          scope: Database["public"]["Enums"]["project_share_scope"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          can_create_subprojects?: boolean
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          item_ids?: Json
          project_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["project_share_role"]
          scope: Database["public"]["Enums"]["project_share_scope"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          can_create_subprojects?: boolean
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          item_ids?: Json
          project_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["project_share_role"]
          scope?: Database["public"]["Enums"]["project_share_scope"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_shared_items: {
        Row: {
          collaborator_user_id: string
          created_at: string
          id: string
          item_id: string
          item_type: Database["public"]["Enums"]["project_share_item_type"]
          project_id: string
        }
        Insert: {
          collaborator_user_id: string
          created_at?: string
          id?: string
          item_id: string
          item_type: Database["public"]["Enums"]["project_share_item_type"]
          project_id: string
        }
        Update: {
          collaborator_user_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: Database["public"]["Enums"]["project_share_item_type"]
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shared_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          created_at: string
          dependency_type: string
          depends_on: string[]
          description: string | null
          duration_days: number
          end_date: string | null
          id: string
          name: string
          project_id: string
          sort_order: number
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dependency_type?: string
          depends_on?: string[]
          description?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          name: string
          project_id: string
          sort_order?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dependency_type?: string
          depends_on?: string[]
          description?: string | null
          duration_days?: number
          end_date?: string | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      project_template_presets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tasks: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tasks?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tasks?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_preferences: {
        Row: {
          active_upload_id: string | null
          background_enabled: boolean
          spotify_url: string | null
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          active_upload_id?: string | null
          background_enabled?: boolean
          spotify_url?: string | null
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          active_upload_id?: string | null
          background_enabled?: boolean
          spotify_url?: string | null
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_preferences_active_upload_id_fkey"
            columns: ["active_upload_id"]
            isOneToOne: false
            referencedRelation: "sprint_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_uploads: {
        Row: {
          created_at: string
          id: string
          mime: string
          name: string
          size: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime: string
          name: string
          size: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mime?: string
          name?: string
          size?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      sprints: {
        Row: {
          actual_minutes: number | null
          atmosphere: string | null
          completed_at: number | null
          created_at: string
          duration: number
          ended_early: boolean | null
          id: string
          is_active: boolean
          no_timer: boolean
          pause_offset: number
          paused_at: number | null
          start_time: number
          tasks: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number | null
          atmosphere?: string | null
          completed_at?: number | null
          created_at?: string
          duration: number
          ended_early?: boolean | null
          id: string
          is_active?: boolean
          no_timer?: boolean
          pause_offset?: number
          paused_at?: number | null
          start_time: number
          tasks?: Json
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number | null
          atmosphere?: string | null
          completed_at?: number | null
          created_at?: string
          duration?: number
          ended_early?: boolean | null
          id?: string
          is_active?: boolean
          no_timer?: boolean
          pause_offset?: number
          paused_at?: number | null
          start_time?: number
          tasks?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          attachments: Json
          created_at: string
          deadline_threshold_override: number | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          is_recurring_instance: boolean
          kanban_column: string | null
          name: string
          project_id: string | null
          quadrant: string
          recurrence: string
          recurrence_days: number[]
          recurrence_time: string
          recurring_template_id: string | null
          sort_order: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          deadline_threshold_override?: number | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_recurring_instance?: boolean
          kanban_column?: string | null
          name: string
          project_id?: string | null
          quadrant?: string
          recurrence?: string
          recurrence_days?: number[]
          recurrence_time?: string
          recurring_template_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          deadline_threshold_override?: number | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          is_recurring_instance?: boolean
          kanban_column?: string | null
          name?: string
          project_id?: string | null
          quadrant?: string
          recurrence?: string
          recurrence_days?: number[]
          recurrence_time?: string
          recurring_template_id?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_templates"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_project_invite: {
        Args: { _token: string }
        Returns: {
          project_id: string
          role: string
          scope: string
        }[]
      }
      can_edit_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_project_item: {
        Args: {
          _item_id: string
          _item_type: Database["public"]["Enums"]["project_share_item_type"]
          _project_id: string
          _user_id: string
        }
        Returns: boolean
      }
      get_project_invite_preview: {
        Args: { _token: string }
        Returns: {
          already_member: boolean
          already_owner: boolean
          expires_at: string
          inviter_name: string
          project_id: string
          project_name: string
          revoked: boolean
          role: string
          scope: string
        }[]
      }
      is_project_owner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      list_project_collaborators: {
        Args: { _project_id: string }
        Returns: {
          can_create_subprojects: boolean
          created_at: string
          display_name: string
          email: string
          id: string
          role: string
          scope: string
          user_id: string
        }[]
      }
      project_ancestors: { Args: { _node: string }; Returns: string[] }
      project_descendants: { Args: { _root: string }; Returns: string[] }
      project_role: {
        Args: { _project_id: string; _user_id: string }
        Returns: string
      }
      project_root: { Args: { _node: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      project_share_item_type: "task" | "note"
      project_share_role: "editor" | "viewer"
      project_share_scope: "all" | "selected"
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
      app_role: ["admin", "user"],
      project_share_item_type: ["task", "note"],
      project_share_role: ["editor", "viewer"],
      project_share_scope: ["all", "selected"],
    },
  },
} as const
