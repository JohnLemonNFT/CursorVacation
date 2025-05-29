import { supabase, handleSupabaseError } from "@/lib/supabase"

// Connection state type
export type ConnectionState = {
  status: "connected" | "disconnected" | "unknown"
  lastChecked: number
  error?: string
}

// Track the last fetch time
let lastFetchTime = 0

/**
 * Record the time of a fetch operation
 */
export function recordFetchTime() {
  lastFetchTime = Date.now()
  try {
    localStorage.setItem("last_fetch_time", lastFetchTime.toString())
  } catch (e) {
    console.warn("Could not save last fetch time to localStorage", e)
  }
}

/**
 * Get the last fetch time
 */
export function getLastFetchTime(): number {
  if (lastFetchTime > 0) return lastFetchTime

  try {
    const saved = localStorage.getItem("last_fetch_time")
    if (saved) {
      lastFetchTime = Number.parseInt(saved, 10)
      return lastFetchTime
    }
  } catch (e) {
    console.warn("Could not get last fetch time from localStorage", e)
  }

  return 0
}

/**
 * Check if the Supabase connection is working
 */
export async function checkConnection(force = false): Promise<ConnectionState> {
  // Check if we've checked recently (within 30 seconds) and not forcing
  const lastChecked = Number.parseInt(localStorage.getItem("connection_last_checked") || "0", 10)
  const now = Date.now()

  if (!force && now - lastChecked < 30000) {
    // Return the cached status if we checked recently
    const status = localStorage.getItem("connection_status") || "unknown"
    const error = localStorage.getItem("connection_error") || undefined

    return {
      status: status as "connected" | "disconnected" | "unknown",
      lastChecked,
      error,
    }
  }

  try {
    // Simple ping to check if Supabase is reachable
    const { data, error } = await supabase.from("trips").select("id").limit(1)

    const result: ConnectionState = {
      status: error ? "disconnected" : "connected",
      lastChecked: now,
    }

    if (error) {
      console.error("Connection check failed:", error)
      result.error = handleSupabaseError(error, "connection check")

      // Cache the status
      localStorage.setItem("connection_status", "disconnected")
      localStorage.setItem("connection_error", result.error)
    } else {
      // Cache the status
      localStorage.setItem("connection_status", "connected")
      localStorage.removeItem("connection_error")
    }

    localStorage.setItem("connection_last_checked", now.toString())
    return result
  } catch (err) {
    console.error("Connection check error:", err)

    const errorMessage = err instanceof Error ? err.message : "Unknown error"

    // Cache the status
    localStorage.setItem("connection_status", "disconnected")
    localStorage.setItem("connection_error", errorMessage)
    localStorage.setItem("connection_last_checked", now.toString())

    return {
      status: "disconnected",
      lastChecked: now,
      error: errorMessage,
    }
  }
}

/**
 * Attempt to reconnect to Supabase
 */
export async function attemptReconnect(): Promise<boolean> {
  try {
    console.log("Attempting to reconnect to Supabase...")

    // Try to refresh the session
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error("Session refresh failed:", error)
      return false
    }

    // Test the connection with a simple query
    const { error: testError } = await supabase.from("trips").select("id").limit(1)

    if (testError) {
      console.error("Connection test failed after refresh:", testError)
      return false
    }

    console.log("Successfully reconnected to Supabase")

    // Update connection status
    localStorage.setItem("connection_status", "connected")
    localStorage.removeItem("connection_error")
    localStorage.setItem("connection_last_checked", Date.now().toString())

    return true
  } catch (err) {
    console.error("Reconnection attempt failed:", err)
    return false
  }
}

/**
 * Fetch trip details with caching
 */
export async function fetchTripDetails(tripId: string, userId: string, force = false) {
  try {
    console.log("🔍 Fetching trip details:", {
      tripId,
      userId,
      force,
      timestamp: new Date().toISOString(),
      online: navigator.onLine
    })

    // Validate inputs
    if (!tripId || !userId) {
      console.error("Missing required parameters:", { tripId, userId })
      throw new Error("Missing required parameters")
    }

    // Try to get from cache first if not forcing refresh
    if (!force) {
      try {
        const cachedData = localStorage.getItem(`cached-trip-${tripId}`)
        if (cachedData) {
          const parsed = JSON.parse(cachedData)
          const cacheAge = Date.now() - parsed.timestamp

          console.log("📦 Cache check:", {
            exists: true,
            age: Math.round(cacheAge / 1000) + "s",
            version: parsed.version,
            expectedVersion: "1.3"
          })

          // Use cache if it's less than 30 seconds old and version matches
          if (cacheAge < 30000 && parsed.version === "1.3") {
            console.log("✅ Using recent cached trip data")
            return {
              trip: parsed.trip,
              members: parsed.members || [],
              fromCache: true,
              offline: false,
            }
          } else {
            console.log("🔄 Cache expired or version mismatch, fetching fresh data")
          }
        } else {
          console.log("📦 No cached data found")
        }
      } catch (e) {
        console.warn("⚠️ Could not load cached trip data:", e)
      }
    }

    // Check if we're online
    if (!navigator.onLine) {
      console.log("📡 Browser reports offline, attempting to use cached data")

      // Try to get from cache as fallback
      try {
        const cachedData = localStorage.getItem(`cached-trip-${tripId}`)
        if (cachedData) {
          console.log("✅ Using cached data while offline")
          const parsed = JSON.parse(cachedData)
          return {
            trip: parsed.trip,
            members: parsed.members || [],
            fromCache: true,
            offline: true,
          }
        }
      } catch (e) {
        console.warn("⚠️ Could not load cached trip data while offline:", e)
      }

      throw new Error("You are currently offline")
    }

    console.log("🌐 Fetching fresh data from Supabase")
    // Get trip details with a timeout
    const tripPromise = supabase.from("trips").select("*").eq("id", tripId).single()
    const tripResult = await Promise.race([
      tripPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 5000)) // 5 second timeout
    ])

    const { data: tripData, error: tripError } = tripResult as any

    if (tripError) {
      console.error("❌ Trip fetch error:", {
        code: tripError.code,
        message: tripError.message,
        details: tripError.details
      })

      const errorMessage = handleSupabaseError(tripError, "fetchTripDetails")

      // Check if it's an auth error
      if (tripError.code === "PGRST301" || tripError.message?.includes("JWT")) {
        throw new Error("AUTH_ERROR")
      }

      throw new Error(errorMessage)
    }

    if (!tripData) {
      console.error("❌ No trip data returned")
      throw new Error("Trip not found")
    }

    console.log("✅ Trip data fetched:", {
      name: tripData.name,
      id: tripData.id,
      timestamp: new Date().toISOString()
    })

    // Get trip members with profiles
    console.log("👥 Fetching trip members")
    const { data: membersData, error: membersError } = await supabase
      .from("trip_members")
      .select(`
        id,
        user_id,
        role,
        arrival_date,
        departure_date,
        flight_details,
        arrival_time,
        departure_time,
        travel_method,
        profile:profiles(full_name, avatar_url, email)
      `)
      .eq("trip_id", tripId)

    if (membersError) {
      console.error("❌ Error fetching members:", handleSupabaseError(membersError, "fetchTripDetails.members"))
      // Don't throw here, just log the error and continue with empty members array
    }

    // Check if current user is a member
    const isMember = membersData?.some((member: { user_id: string }) => member.user_id === userId) || tripData.created_by === userId

    if (!isMember) {
      console.error("❌ Access denied: User is not a member of this trip")
      throw new Error("ACCESS_DENIED")
    }

    // Cache the trip data with a timestamp
    try {
      const cacheData = {
        trip: tripData,
        members: membersData || [],
        timestamp: Date.now(),
        version: "1.0"
      }
      localStorage.setItem(`cached-trip-${tripId}`, JSON.stringify(cacheData))
      console.log("💾 Cached trip data")
    } catch (e) {
      console.warn("⚠️ Could not cache trip data:", e)
    }

    // Record fetch time
    recordFetchTime()

    return {
      trip: tripData,
      members: membersData || [],
      fromCache: false,
      offline: false,
    }
  } catch (error) {
    console.error("❌ Error in fetchTripDetails:", error)

    // Try to get from cache as fallback
    try {
      const cachedData = localStorage.getItem(`cached-trip-${tripId}`)
      if (cachedData) {
        console.log("✅ Using cached data as fallback after error")
        const parsed = JSON.parse(cachedData)
        return {
          trip: parsed.trip,
          members: parsed.members || [],
          fromCache: true,
          offline: true,
        }
      }
    } catch (e) {
      console.warn("⚠️ Could not load cached trip data as fallback:", e)
    }

    // Re-throw the error if we couldn't get from cache
    throw error
  }
}
