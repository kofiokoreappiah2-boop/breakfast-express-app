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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      business_settings: {
        Row: {
          accepting_orders: boolean
          business_name: string
          closed_message: string
          contact_phone: string
          hero_heading: string
          hero_image_path: string | null
          hero_subheading: string
          id: boolean
          momo_account_name: string
          momo_enabled: boolean
          momo_number: string
          parent_name: string
          pod_enabled: boolean
          promo_enabled: boolean
          promo_message: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          accepting_orders?: boolean
          business_name?: string
          closed_message?: string
          contact_phone?: string
          hero_heading?: string
          hero_image_path?: string | null
          hero_subheading?: string
          id?: boolean
          momo_account_name?: string
          momo_enabled?: boolean
          momo_number?: string
          parent_name?: string
          pod_enabled?: boolean
          promo_enabled?: boolean
          promo_message?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          accepting_orders?: boolean
          business_name?: string
          closed_message?: string
          contact_phone?: string
          hero_heading?: string
          hero_image_path?: string | null
          hero_subheading?: string
          id?: boolean
          momo_account_name?: string
          momo_enabled?: boolean
          momo_number?: string
          parent_name?: string
          pod_enabled?: boolean
          promo_enabled?: boolean
          promo_message?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      checkout_throttle: {
        Row: {
          client_key: string
          created_at: string
          id: string
        }
        Insert: {
          client_key: string
          created_at?: string
          id?: string
        }
        Update: {
          client_key?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      delivery_locations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_window_exceptions: {
        Row: {
          available: boolean
          created_at: string
          exception_date: string
          id: string
          note: string
          window_id: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          exception_date: string
          id?: string
          note?: string
          window_id: string
        }
        Update: {
          available?: boolean
          created_at?: string
          exception_date?: string
          id?: string
          note?: string
          window_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_window_exceptions_window_id_fkey"
            columns: ["window_id"]
            isOneToOne: false
            referencedRelation: "delivery_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_windows: {
        Row: {
          active: boolean
          created_at: string
          end_time: string
          id: string
          label: string
          sort_order: number
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_time: string
          id?: string
          label: string
          sort_order?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          end_time?: string
          id?: string
          label?: string
          sort_order?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_audit_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          new_value: string | null
          order_id: string
          previous_value: string | null
          staff_user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          new_value?: string | null
          order_id: string
          previous_value?: string | null
          staff_user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          new_value?: string | null
          order_id?: string
          previous_value?: string | null
          staff_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_audit_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          additional_instructions: string
          client_request_id: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_location: string
          delivery_window: string
          id: string
          order_number: string
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
        }
        Insert: {
          additional_instructions?: string
          client_request_id?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          delivery_location: string
          delivery_window: string
          id?: string
          order_number?: string
          payment_method: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
        }
        Update: {
          additional_instructions?: string
          client_request_id?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          delivery_location?: string
          delivery_window?: string
          id?: string
          order_number?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          available: boolean
          created_at: string
          description: string
          id: string
          image_path: string | null
          name: string
          price: number
          size: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          description?: string
          id?: string
          image_path?: string | null
          name: string
          price: number
          size?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          description?: string
          id?: string
          image_path?: string | null
          name?: string
          price?: number
          size?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_order_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "owner" | "staff"
      order_status:
        | "New"
        | "Confirmed"
        | "Preparing"
        | "Out for Delivery"
        | "Delivered"
        | "Cancelled"
      payment_status: "Pending" | "Paid" | "Failed"
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
      app_role: ["admin", "owner", "staff"],
      order_status: [
        "New",
        "Confirmed",
        "Preparing",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      payment_status: ["Pending", "Paid", "Failed"],
    },
  },
} as const
