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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bakeries: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          short_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          short_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          short_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          bakery_id: string
          card_color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          packing_mode: Database["public"]["Enums"]["packing_mode"] | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          bakery_id: string
          card_color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          packing_mode?: Database["public"]["Enums"]["packing_mode"] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          bakery_id?: string
          card_color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          packing_mode?: Database["public"]["Enums"]["packing_mode"] | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
      category_onedrive_config: {
        Row: {
          bakery_id: string
          category_id: string
          created_at: string
          id: string
          last_sync_at: string | null
          onedrive_folder_id: string | null
          onedrive_folder_url: string | null
          sync_error: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          bakery_id: string
          category_id: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          onedrive_folder_id?: string | null
          onedrive_folder_url?: string | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          bakery_id?: string
          category_id?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          onedrive_folder_id?: string | null
          onedrive_folder_url?: string | null
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_onedrive_config_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_onedrive_config_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_locks: {
        Row: {
          bakery_id: string
          created_at: string
          customer_id: string
          delivery_date: string
          expires_at: string
          id: string
          locked_at: string
          locked_by: string
          updated_at: string
        }
        Insert: {
          bakery_id: string
          created_at?: string
          customer_id: string
          delivery_date: string
          expires_at: string
          id?: string
          locked_at?: string
          locked_by: string
          updated_at?: string
        }
        Update: {
          bakery_id?: string
          created_at?: string
          customer_id?: string
          delivery_date?: string
          expires_at?: string
          id?: string
          locked_at?: string
          locked_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_locks_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_locks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          bakery_id: string
          created_at: string | null
          customer_number: string
          display_token: string | null
          has_dedicated_display: boolean | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          bakery_id: string
          created_at?: string | null
          customer_number: string
          display_token?: string | null
          has_dedicated_display?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          bakery_id?: string
          created_at?: string | null
          customer_number?: string
          display_token?: string | null
          has_dedicated_display?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
      display_settings: {
        Row: {
          bakery_id: string
          category_id: string | null
          created_at: string
          display_type: string
          id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          bakery_id: string
          category_id?: string | null
          created_at?: string
          display_type?: string
          id?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          bakery_id?: string
          category_id?: string | null
          created_at?: string
          display_type?: string
          id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "display_settings_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "display_settings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          bakery_id: string
          category_id: string | null
          created_at: string | null
          customers_count: number | null
          delivery_date: string
          id: string
          imported_by: string | null
          orders_count: number | null
          products_count: number | null
        }
        Insert: {
          bakery_id: string
          category_id?: string | null
          created_at?: string | null
          customers_count?: number | null
          delivery_date: string
          id?: string
          imported_by?: string | null
          orders_count?: number | null
          products_count?: number | null
        }
        Update: {
          bakery_id?: string
          category_id?: string | null
          created_at?: string | null
          customers_count?: number | null
          delivery_date?: string
          id?: string
          imported_by?: string | null
          orders_count?: number | null
          products_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bakery_id: string
          category_id: string | null
          created_at: string | null
          customer_id: string
          delivery_date: string
          id: string
          import_batch_id: string | null
          product_id: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          bakery_id: string
          category_id?: string | null
          created_at?: string | null
          customer_id: string
          delivery_date: string
          id?: string
          import_batch_id?: string | null
          product_id: string
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          bakery_id?: string
          category_id?: string | null
          created_at?: string | null
          customer_id?: string
          delivery_date?: string
          id?: string
          import_batch_id?: string | null
          product_id?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_status: {
        Row: {
          created_at: string | null
          deviation_note: string | null
          deviation_type: Database["public"]["Enums"]["deviation_type"] | null
          id: string
          order_id: string
          packed_at: string | null
          packed_by: string | null
          status: Database["public"]["Enums"]["packing_status_enum"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deviation_note?: string | null
          deviation_type?: Database["public"]["Enums"]["deviation_type"] | null
          id?: string
          order_id: string
          packed_at?: string | null
          packed_by?: string | null
          status?: Database["public"]["Enums"]["packing_status_enum"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deviation_note?: string | null
          deviation_type?: Database["public"]["Enums"]["deviation_type"] | null
          id?: string
          order_id?: string
          packed_at?: string | null
          packed_by?: string | null
          status?: Database["public"]["Enums"]["packing_status_enum"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "packing_status_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bakery_id: string
          category_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          pieces_per_tray: number | null
          product_number: string
          updated_at: string | null
        }
        Insert: {
          bakery_id: string
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pieces_per_tray?: number | null
          product_number: string
          updated_at?: string | null
        }
        Update: {
          bakery_id?: string
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pieces_per_tray?: number | null
          product_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bakery_id: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bakery_id?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bakery_id?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          bakery_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          bakery_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          bakery_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_bakery_id_fkey"
            columns: ["bakery_id"]
            isOneToOne: false
            referencedRelation: "bakeries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_customer_lock: {
        Args: {
          _bakery_id: string
          _customer_id: string
          _delivery_date: string
          _lock_duration_minutes?: number
        }
        Returns: string
      }
      can_access_bakery: { Args: { _bakery_id: string }; Returns: boolean }
      extend_customer_lock: {
        Args: {
          _customer_id: string
          _delivery_date: string
          _extension_minutes?: number
        }
        Returns: boolean
      }
      get_user_bakery_id: { Args: never; Returns: string }
      has_bakery_role: {
        Args: {
          _bakery_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      release_customer_lock: {
        Args: { _customer_id: string; _delivery_date: string }
        Returns: boolean
      }
      setup_bakery_for_new_user: {
        Args: { _bakery_name: string; _display_name?: string; _user_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "bakery_admin" | "bakery_user"
      deviation_type: "shortage" | "damaged" | "wrong_product" | "other"
      packing_mode: "product_based" | "customer_based"
      packing_status_enum: "pending" | "packed" | "deviation"
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
      app_role: ["super_admin", "bakery_admin", "bakery_user"],
      deviation_type: ["shortage", "damaged", "wrong_product", "other"],
      packing_mode: ["product_based", "customer_based"],
      packing_status_enum: ["pending", "packed", "deviation"],
    },
  },
} as const
