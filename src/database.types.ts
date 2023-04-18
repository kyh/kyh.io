export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      memberships: {
        Row: {
          code: string | null
          created_at: string
          id: number
          invited_email: string | null
          organization_id: number
          role: number
          user_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: never
          invited_email?: string | null
          organization_id: number
          role: number
          user_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: never
          invited_email?: string | null
          organization_id?: number
          role?: number
          user_id?: string | null
        }
      }
      organizations: {
        Row: {
          created_at: string
          id: number
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: never
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: never
          logo_url?: string | null
          name?: string
        }
      }
      organizations_subscriptions: {
        Row: {
          customer_id: string
          organization_id: number
          subscription_id: string | null
        }
        Insert: {
          customer_id: string
          organization_id: number
          subscription_id?: string | null
        }
        Update: {
          customer_id?: string
          organization_id?: number
          subscription_id?: string | null
        }
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string | null
          currency: string | null
          id: string
          interval: string | null
          interval_count: number | null
          period_ends_at: string | null
          period_starts_at: string | null
          price_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          trial_starts_at: string | null
        }
        Insert: {
          cancel_at_period_end: boolean
          created_at?: string | null
          currency?: string | null
          id: string
          interval?: string | null
          interval_count?: number | null
          period_ends_at?: string | null
          period_starts_at?: string | null
          price_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          trial_starts_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string | null
          currency?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          period_ends_at?: string | null
          period_starts_at?: string | null
          price_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          trial_starts_at?: string | null
        }
      }
      users: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          onboarded: boolean
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          onboarded: boolean
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          onboarded?: boolean
          photo_url?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite_to_organization: {
        Args: {
          invite_code: string
          invite_user_id: string
        }
        Returns: Json
      }
      can_update_user_role: {
        Args: {
          organization_id: number
          membership_id: number
        }
        Returns: boolean
      }
      create_new_organization: {
        Args: {
          org_name: string
          user_id: string
          create_user?: boolean
        }
        Returns: number
      }
      current_user_is_member_of_organization: {
        Args: {
          organization_id: number
        }
        Returns: boolean
      }
      get_organizations_for_authenticated_user: {
        Args: Record<PropertyKey, never>
        Returns: number[]
      }
      get_role_for_authenticated_user: {
        Args: {
          org_id: number
        }
        Returns: number
      }
      get_role_for_user: {
        Args: {
          membership_id: number
        }
        Returns: number
      }
      transfer_organization: {
        Args: {
          org_id: number
          target_user_membership_id: number
        }
        Returns: undefined
      }
    }
    Enums: {
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "incomplete"
        | "incomplete_expired"
        | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          path_tokens: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

