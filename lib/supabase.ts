import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

declare global {
  interface Window {
    process: {
      env: {
        NEXT_PUBLIC_SUPABASE_URL: string
        NEXT_PUBLIC_SUPABASE_ANON_KEY: string
      }
    }
  }
}

const supabaseUrl = typeof window !== 'undefined' ? window.process.env.NEXT_PUBLIC_SUPABASE_URL : process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = typeof window !== 'undefined' ? window.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single supabase client for the entire app
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: async (resource: RequestInfo | URL, config?: RequestInit) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      try {
        const response = await fetch(resource, {
          ...config,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        return response
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === "AbortError") {
          console.error("Request timeout:", resource)
          throw new Error("Request timed out. Please check your connection and try again.")
        }
        throw error
      }
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Debug function to check connection
export async function checkSupabaseConnection() {
  try {
    const start = Date.now()
    const { data, error } = await supabase.from("trips").select("count").limit(1)
    const duration = Date.now() - start

    if (error) {
      console.error("Supabase connection error:", error)
      return {
        connected: false,
        error: error.message,
        duration,
      }
    }

    return {
      connected: true,
      duration,
      data,
    }
  } catch (err) {
    console.error("Supabase connection check failed:", err)
    return {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
      duration: -1,
    }
  }
}

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any, context: string): string {
  console.error(`Supabase error in ${context}:`, error)

  // Handle specific error codes
  if (error.code === "PGRST301") {
    return "Authentication error. Please sign in again."
  }

  if (error.code === "PGRST116") {
    return "Connection error. Please check your internet connection."
  }

  if (error.code === "PGRST401") {
    return "Unauthorized. Please sign in again."
  }

  if (error.code === "PGRST403") {
    return "Access denied. You don't have permission to perform this action."
  }

  if (error.code === "PGRST404") {
    return "Resource not found."
  }

  if (error.code === "PGRST500") {
    return "Server error. Please try again later."
  }

  // Handle network errors
  if (error.message?.includes("network") || error.message?.includes("fetch")) {
    return "Network error. Please check your internet connection."
  }

  // Handle timeout errors
  if (error.message?.includes("timeout")) {
    return "Request timed out. Please try again."
  }

  // Handle JWT errors
  if (error.message?.includes("JWT")) {
    return "Session expired. Please sign in again."
  }

  // Default error message
  return error.message || "An unexpected error occurred. Please try again."
}

// Helper function to clear all cached data for a trip
export function clearTripCache(tripId: string) {
  try {
    localStorage.removeItem(`cached-trip-${tripId}`)
    localStorage.removeItem(`trip-${tripId}-data`)
    localStorage.removeItem(`trip-${tripId}-tab`)
  } catch (e) {
    console.warn("Could not clear trip cache:", e)
  }
}

// Helper function to check if we're online
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine
}

// Helper function to check if we have a valid session
export async function hasValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    return !error && !!session
  } catch (e) {
    console.error("Error checking session:", e)
    return false
  }
}

// Helper function to check if we can connect to Supabase
export async function canConnectToSupabase(): Promise<boolean> {
  try {
    const { error } = await supabase.from("trips").select("count").limit(1)
    return !error
  } catch (e) {
    console.error("Error checking Supabase connection:", e)
    return false
  }
}
