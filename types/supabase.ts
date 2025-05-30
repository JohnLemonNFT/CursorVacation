export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string | null
          avatar_url: string | null
          email: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
        }
      }
      trips: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          destination: string
          start_date: string
          end_date: string
          invite_code: string
          shared_album_url: string | null
          created_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          destination: string
          start_date: string
          end_date: string
          invite_code: string
          shared_album_url?: string | null
          created_by: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          destination?: string
          start_date?: string
          end_date?: string
          invite_code?: string
          shared_album_url?: string | null
          created_by?: string
        }
      }
      trip_members: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          trip_id: string
          user_id: string
          role: string
          arrival_date: string | null
          departure_date: string | null
          flight_details: string | null
          arrival_time: string | null
          departure_time: string | null
          travel_method: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          trip_id: string
          user_id: string
          role: string
          arrival_date?: string | null
          departure_date?: string | null
          flight_details?: string | null
          arrival_time?: string | null
          departure_time?: string | null
          travel_method?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          trip_id?: string
          user_id?: string
          role?: string
          arrival_date?: string | null
          departure_date?: string | null
          flight_details?: string | null
          arrival_time?: string | null
          departure_time?: string | null
          travel_method?: string | null
        }
      }
      wishlist_items: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          trip_id: string
          created_by: string
          title: string
          description: string | null
          is_completed: boolean
          explore_item_id: string | null
          category: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          trip_id: string
          created_by: string
          title: string
          description?: string | null
          is_completed?: boolean
          explore_item_id?: string | null
          category: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          trip_id?: string
          created_by?: string
          title?: string
          description?: string | null
          is_completed?: boolean
          explore_item_id?: string | null
          category?: string
        }
      }
      memories: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          trip_id: string
          created_by: string
          content: string
          date: string
          media_urls: string[] | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          trip_id: string
          created_by: string
          content: string
          date: string
          media_urls?: string[] | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          trip_id?: string
          created_by?: string
          content?: string
          date?: string
          media_urls?: string[] | null
        }
      }
      explore_items: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          trip_id: string
          title: string
          description: string
          date: string | null
          url: string | null
          image_url: string | null
          is_curated: boolean
          category: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          trip_id: string
          title: string
          description: string
          date?: string | null
          url?: string | null
          image_url?: string | null
          is_curated?: boolean
          category: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          trip_id?: string
          title?: string
          description?: string
          date?: string | null
          url?: string | null
          image_url?: string | null
          is_curated?: boolean
          category?: string
        }
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
  }
}
