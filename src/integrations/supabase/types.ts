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
      achievements: {
        Row: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          requirement_value?: number
          xp_reward?: number
        }
        Update: {
          badge_type?: Database["public"]["Enums"]["badge_type"]
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      anon_tutor_ip_usage: {
        Row: {
          ip_hash: string
          message_count: number
          updated_at: string
          usage_date: string
        }
        Insert: {
          ip_hash: string
          message_count?: number
          updated_at?: string
          usage_date: string
        }
        Update: {
          ip_hash?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
        }
        Relationships: []
      }
      anon_tutor_usage: {
        Row: {
          created_at: string
          message_count: number
          session_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          message_count?: number
          session_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          message_count?: number
          session_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          cognitive_style: string
          completed_at: string
          created_at: string
          execution_preference: string
          id: string
          motivation_driver: string
          primary_pillar_recommended: string
          raw_dimensions: Json | null
          risk_orientation: string
          secondary_pillar_recommended: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cognitive_style: string
          completed_at?: string
          created_at?: string
          execution_preference: string
          id?: string
          motivation_driver: string
          primary_pillar_recommended: string
          raw_dimensions?: Json | null
          risk_orientation: string
          secondary_pillar_recommended: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cognitive_style?: string
          completed_at?: string
          created_at?: string
          execution_preference?: string
          id?: string
          motivation_driver?: string
          primary_pillar_recommended?: string
          raw_dimensions?: Json | null
          risk_orientation?: string
          secondary_pillar_recommended?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string
          enrolled_at: string | null
          id: string
          progress: number | null
          unlock_source: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id: string
          enrolled_at?: string | null
          id?: string
          progress?: number | null
          unlock_source?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string | null
          id?: string
          progress?: number | null
          unlock_source?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_progress: {
        Row: {
          attempts: number | null
          completed: boolean
          completed_at: string | null
          created_at: string
          data: Json | null
          exercise_id: string
          id: string
          score: number | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          exercise_id: string
          id?: string
          score?: number | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          data?: Json | null
          exercise_id?: string
          id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_progress_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          content: Json
          created_at: string
          description: string | null
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          id: string
          module_id: string
          order_index: number
          title: string
          xp_reward: number
        }
        Insert: {
          content?: Json
          created_at?: string
          description?: string | null
          exercise_type: Database["public"]["Enums"]["exercise_type"]
          id?: string
          module_id: string
          order_index?: number
          title: string
          xp_reward?: number
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string | null
          exercise_type?: Database["public"]["Enums"]["exercise_type"]
          id?: string
          module_id?: string
          order_index?: number
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercises_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_public"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assigned_department:
            | Database["public"]["Enums"]["department_role"]
            | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: string
          resolved_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_department?:
            | Database["public"]["Enums"]["department_role"]
            | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_department?:
            | Database["public"]["Enums"]["department_role"]
            | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: string
          resolved_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_targets: {
        Row: {
          comparison: string
          created_at: string
          department: Database["public"]["Enums"]["department_role"]
          id: string
          kpi_key: string
          target_value: number
          updated_at: string
        }
        Insert: {
          comparison?: string
          created_at?: string
          department: Database["public"]["Enums"]["department_role"]
          id?: string
          kpi_key: string
          target_value: number
          updated_at?: string
        }
        Update: {
          comparison?: string
          created_at?: string
          department?: Database["public"]["Enums"]["department_role"]
          id?: string
          kpi_key?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assessment_snapshot: Json | null
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          assessment_snapshot?: Json | null
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          assessment_snapshot?: Json | null
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      learner_tiers: {
        Row: {
          created_at: string
          description: string | null
          min_xp: number
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          min_xp: number
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          min_xp?: number
          name?: string
        }
        Relationships: []
      }
      learning_paths: {
        Row: {
          created_at: string | null
          id: string
          reasoning: string | null
          recommended_courses: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reasoning?: string | null
          recommended_courses: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reasoning?: string | null
          recommended_courses?: Json
          user_id?: string
        }
        Relationships: []
      }
      learning_plans: {
        Row: {
          created_at: string
          current_index: number
          id: string
          is_active: boolean
          pillar_id: string
          reasoning: string | null
          unit_order: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_index?: number
          id?: string
          is_active?: boolean
          pillar_id: string
          reasoning?: string | null
          unit_order?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_index?: number
          id?: string
          is_active?: boolean
          pillar_id?: string
          reasoning?: string | null
          unit_order?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          content: Json | null
          course_id: string
          created_at: string
          description: string | null
          estimated_minutes: number
          id: string
          module_type: Database["public"]["Enums"]["module_type"]
          order_index: number
          title: string
          xp_reward: number
        }
        Insert: {
          content?: Json | null
          course_id: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          module_type?: Database["public"]["Enums"]["module_type"]
          order_index?: number
          title: string
          xp_reward?: number
        }
        Update: {
          content?: Json | null
          course_id?: string
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          module_type?: Database["public"]["Enums"]["module_type"]
          order_index?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      pending_role_assignments: {
        Row: {
          created_at: string
          department_role: Database["public"]["Enums"]["department_role"]
          email: string
          id: string
          invited_by: string | null
        }
        Insert: {
          created_at?: string
          department_role: Database["public"]["Enums"]["department_role"]
          email: string
          id?: string
          invited_by?: string | null
        }
        Update: {
          created_at?: string
          department_role?: Database["public"]["Enums"]["department_role"]
          email?: string
          id?: string
          invited_by?: string | null
        }
        Relationships: []
      }
      pillar_calibrations: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          dismissed_at: string | null
          id: string
          pillar_id: string
          recommended_unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          pillar_id: string
          recommended_unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          pillar_id?: string
          recommended_unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pillar_calibrations_recommended_unit_id_fkey"
            columns: ["recommended_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      pillar_unlock_rules: {
        Row: {
          created_at: string
          id: string
          min_completion_pct: number
          pillar_id: string
          requires_pillar_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_completion_pct: number
          pillar_id: string
          requires_pillar_id: string
        }
        Update: {
          created_at?: string
          id?: string
          min_completion_pct?: number
          pillar_id?: string
          requires_pillar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pillar_unlock_rules_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pillar_unlock_rules_requires_pillar_id_fkey"
            columns: ["requires_pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      pillars: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          track: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          order_index: number
          track: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          track?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assessment_completed_at: string | null
          assessment_results: Json | null
          avatar_url: string | null
          created_at: string | null
          department: string | null
          department_role: Database["public"]["Enums"]["department_role"] | null
          full_name: string | null
          goals: string | null
          id: string
          interests: string[] | null
          recommended_pillars: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assessment_completed_at?: string | null
          assessment_results?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          department_role?:
            | Database["public"]["Enums"]["department_role"]
            | null
          full_name?: string | null
          goals?: string | null
          id?: string
          interests?: string[] | null
          recommended_pillars?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assessment_completed_at?: string | null
          assessment_results?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          department_role?:
            | Database["public"]["Enums"]["department_role"]
            | null
          full_name?: string | null
          goals?: string | null
          id?: string
          interests?: string[] | null
          recommended_pillars?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          quiz_id: string | null
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          quiz_id?: string | null
          score: number
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          quiz_id?: string | null
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_results_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          questions: Json
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          questions: Json
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          questions?: Json
          title?: string
        }
        Relationships: []
      }
      session_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["session_block_type"]
          content: Json
          created_at: string
          id: string
          order_index: number
          session_id: string
        }
        Insert: {
          block_type: Database["public"]["Enums"]["session_block_type"]
          content?: Json
          created_at?: string
          id?: string
          order_index: number
          session_id: string
        }
        Update: {
          block_type?: Database["public"]["Enums"]["session_block_type"]
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_blocks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "unit_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_usage: {
        Row: {
          created_at: string
          id: string
          message_count: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_count?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      unit_sessions: {
        Row: {
          content: Json
          created_at: string
          id: string
          order_index: number
          summary: string | null
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          summary?: string | null
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          summary?: string | null
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_sessions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          counts_toward_completion: boolean
          created_at: string
          description: string | null
          estimated_minutes: number
          id: string
          is_locked_by_default: boolean
          order_index: number
          pillar_id: string
          session_count: number
          status: string
          theme: Database["public"]["Enums"]["pillar_theme"]
          title: string
          total_xp: number
          track_type: Database["public"]["Enums"]["track_type"]
          updated_at: string
        }
        Insert: {
          counts_toward_completion?: boolean
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          is_locked_by_default?: boolean
          order_index?: number
          pillar_id: string
          session_count?: number
          status?: string
          theme: Database["public"]["Enums"]["pillar_theme"]
          title: string
          total_xp?: number
          track_type?: Database["public"]["Enums"]["track_type"]
          updated_at?: string
        }
        Update: {
          counts_toward_completion?: boolean
          created_at?: string
          description?: string | null
          estimated_minutes?: number
          id?: string
          is_locked_by_default?: boolean
          order_index?: number
          pillar_id?: string
          session_count?: number
          status?: string
          theme?: Database["public"]["Enums"]["pillar_theme"]
          title?: string
          total_xp?: number
          track_type?: Database["public"]["Enums"]["track_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
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
      user_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          score: number | null
          time_spent_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          score?: number | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          score?: number | null
          time_spent_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules_public"
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
      user_unit_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          last_session_index: number
          sessions_completed: number
          unit_id: string
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_session_index?: number
          sessions_completed?: number
          unit_id: string
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          last_session_index?: number
          sessions_completed?: number
          unit_id?: string
          updated_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_unit_progress_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          current_level: number
          id: string
          last_activity_date: string | null
          streak_days: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_level?: number
          id?: string
          last_activity_date?: string | null
          streak_days?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_level?: number
          id?: string
          last_activity_date?: string | null
          streak_days?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          created_at: string
          department: Database["public"]["Enums"]["department_role"]
          id: string
          kpi_data: Json
          notes: string | null
          status: string | null
          submitted_at: string
          submitted_by: string
          updated_at: string
          week_starting: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          department: Database["public"]["Enums"]["department_role"]
          id?: string
          kpi_data?: Json
          notes?: string | null
          status?: string | null
          submitted_at?: string
          submitted_by: string
          updated_at?: string
          week_starting: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_role"]
          id?: string
          kpi_data?: Json
          notes?: string | null
          status?: string | null
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
          week_starting?: string
        }
        Relationships: []
      }
      xp_rules: {
        Row: {
          action_type: string
          created_at: string
          label: string
          xp: number
        }
        Insert: {
          action_type: string
          created_at?: string
          label: string
          xp: number
        }
        Update: {
          action_type?: string
          created_at?: string
          label?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      modules_public: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          estimated_minutes: number | null
          id: string | null
          module_type: Database["public"]["Enums"]["module_type"] | null
          order_index: number | null
          title: string | null
          xp_reward: number | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string | null
          module_type?: Database["public"]["Enums"]["module_type"] | null
          order_index?: number | null
          title?: string | null
          xp_reward?: number | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string | null
          module_type?: Database["public"]["Enums"]["module_type"] | null
          order_index?: number | null
          title?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_pillar: {
        Args: { _pillar_id: string; _user_id: string }
        Returns: boolean
      }
      get_department_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["department_role"]
      }
      get_pillar_access: {
        Args: never
        Returns: {
          enrolled: boolean
          name: string
          order_index: number
          pillar_id: string
          preview_unit_id: string
          progress_pct: number
          requirements: Json
          state: string
          track: string
          unlock_source: string
        }[]
      }
      grant_pillar_access: {
        Args: { _pillar_id: string; _user_id: string }
        Returns: undefined
      }
      has_ops_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_ceo_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_pillar_staff: { Args: { _user_id: string }; Returns: boolean }
      is_preview_session: { Args: { _session_id: string }; Returns: boolean }
      list_learner_insights: {
        Args: never
        Returns: {
          email: string
          full_name: string
          last_activity: string
          pillar_id: string
          total_xp: number
          units_completed: number
          user_id: string
        }[]
      }
      list_team_roster: {
        Args: never
        Returns: {
          department_role: Database["public"]["Enums"]["department_role"]
          email: string
          full_name: string
          is_admin: boolean
          joined_at: string
          user_id: string
        }[]
      }
      ops_submission_open: {
        Args: { _week_starting: string }
        Returns: boolean
      }
      pillar_completion_pct: {
        Args: { _pillar_id: string; _user_id: string }
        Returns: number
      }
      refresh_unit_xp_totals: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      badge_type: "completion" | "streak" | "mastery" | "speed" | "explorer"
      department_role:
        | "ceo"
        | "ops_manager"
        | "marketing"
        | "curriculum"
        | "digital_services"
        | "finance"
        | "tech"
      exercise_type:
        | "simulation"
        | "drag_drop"
        | "scenario_game"
        | "sandbox"
        | "quiz"
        | "video"
      module_type: "free" | "premium"
      pillar_theme:
        | "financial"
        | "communication"
        | "digital"
        | "leadership"
        | "entrepreneurship"
        | "creator"
        | "civic"
      session_block_type:
        | "heading"
        | "paragraph"
        | "callout"
        | "quote"
        | "table"
        | "warning"
        | "reflection"
        | "exercise"
        | "video"
        | "image"
        | "divider"
        | "key_terms"
        | "stat_grid"
        | "code"
      track_type: "learning_path" | "specialized"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
      badge_type: ["completion", "streak", "mastery", "speed", "explorer"],
      department_role: [
        "ceo",
        "ops_manager",
        "marketing",
        "curriculum",
        "digital_services",
        "finance",
        "tech",
      ],
      exercise_type: [
        "simulation",
        "drag_drop",
        "scenario_game",
        "sandbox",
        "quiz",
        "video",
      ],
      module_type: ["free", "premium"],
      pillar_theme: [
        "financial",
        "communication",
        "digital",
        "leadership",
        "entrepreneurship",
        "creator",
        "civic",
      ],
      session_block_type: [
        "heading",
        "paragraph",
        "callout",
        "quote",
        "table",
        "warning",
        "reflection",
        "exercise",
        "video",
        "image",
        "divider",
        "key_terms",
        "stat_grid",
        "code",
      ],
      track_type: ["learning_path", "specialized"],
    },
  },
} as const
