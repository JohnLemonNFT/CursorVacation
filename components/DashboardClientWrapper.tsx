"use client"

import React, { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { differenceInDays, formatDistanceToNow } from "date-fns"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { checkConnection, attemptReconnect, type ConnectionState } from "@/lib/data-manager"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Heart, Plane, PlusCircle, Users, Calendar, MapPin, Sparkles, Star, RefreshCw, WifiOff, AlertCircle, Camera } from "lucide-react"

// Types
// (You may want to move the Trip type here if not already imported)
type Trip = {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  created_by: string
  created_at: string
  invite_code: string
  memberCount: number
}

type Profile = {
  id: string
  full_name: string
  avatar_url: string | null
  email: string
}

export default function DashboardClientWrapper() {
  const { user, isLoading } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoadingTrips, setIsLoadingTrips] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasCheckedInvite = useRef(false)
  const hasFetchedTrips = useRef(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>({ status: "unknown", lastChecked: 0 })
  const [fetchAttempts, setFetchAttempts] = useState(0)
  const maxFetchAttempts = 3
  const [isOffline, setIsOffline] = useState(false)
  const [dataSource, setDataSource] = useState<"cache" | "network" | "unknown">("unknown")
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const backgroundRefreshRef = useRef<NodeJS.Timeout | null>(null)
  const lastVisibilityChange = useRef<number>(0)
  const minimumVisibilityChangeInterval = 5000 // 5 seconds
  const [backgroundRetryInterval, setBackgroundRetryInterval] = useState<NodeJS.Timeout | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      console.log("Browser reports online status")
      setIsOffline(false)
      // Try to reconnect and refresh data
      attemptReconnect().then((connected) => {
        if (connected && user) {
          fetchTrips(true)
        }
      })
    }

    const handleOffline = () => {
      console.log("Browser reports offline status")
      setIsOffline(true)
    }

    // Set initial online status
    setIsOffline(!navigator.onLine)

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [user])

  // Check connection status
  useEffect(() => {
    const checkConnectionStatus = async () => {
      const status = await checkConnection()
      setConnectionStatus(status)

      // If disconnected, try to reconnect
      if (status.status === "disconnected") {
        const reconnected = await attemptReconnect()
        if (reconnected) {
          setConnectionStatus(await checkConnection(true))
        }
      }
    }

    checkConnectionStatus()

    // Check connection status periodically
    const interval = setInterval(checkConnectionStatus, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Debug log
    console.log("Dashboard: Auth state", { user, isLoading })

    const checkAuth = async () => {
      try {
        // Double-check auth status directly
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (!data.session) {
          console.log("No session found in dashboard check")
          setAuthError("No active session found")
        } else {
          console.log("Session confirmed in dashboard", data.session.user.email)
        }
      } catch (err) {
        console.error("Dashboard auth check error:", err)
        setAuthError(err instanceof Error ? err.message : String(err))
      }
    }

    if (!isLoading && !user) {
      checkAuth()
    }
  }, [user, isLoading])

  useEffect(() => {
    const fetchOrCreateProfile = async () => {
      if (!user) return
      setIsLoadingProfile(true)
      try {
        // First try to get the profile
        let { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .eq("id", user.id)
          .single()

        if (error && error.code === "PGRST116") {
          // No profile found, create one using RPC to bypass RLS
          const { error: insertError } = await supabase.rpc('create_profile', {
            profile_id: user.id,
            profile_full_name: user.user_metadata?.full_name || user.email || "",
            profile_avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            profile_email: user.email
          })

          if (insertError) {
            console.error("Error creating profile:", insertError)
            setDataError("Failed to create profile. Please try again.")
            setIsLoadingProfile(false)
            return
          }

          // Refetch profile after creation
          const { data: newData, error: newError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, email")
            .eq("id", user.id)
            .single()

          if (newError) {
            setDataError("Failed to fetch profile after creation.")
            setIsLoadingProfile(false)
            return
          }
          setProfile(newData)
        } else if (data) {
          setProfile(data)
        } else if (error) {
          setDataError("Failed to fetch profile.")
        }
      } catch (error) {
        setDataError("Unexpected error fetching/creating profile.")
      } finally {
        setIsLoadingProfile(false)
      }
    }
    if (user) {
      fetchOrCreateProfile()
    }
  }, [user])

  const fetchTrips = useCallback(
    async (force = false) => {
      if (!user || (hasFetchedTrips.current && !force)) return
      if (fetchAttempts >= maxFetchAttempts) {
        console.error("Max fetch attempts reached. Stopping retries.")
        setDataError("Unable to load trips after several attempts. We'll keep trying in the background, or you can refresh.")
        // Start background retry if not already started
        if (!backgroundRetryInterval) {
          const interval = setInterval(() => {
            console.log("Background retry: attempting to fetch trips...")
            fetchTrips(true)
          }, 30000)
          setBackgroundRetryInterval(interval)
        }
        return
      }

      // Clear any existing retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }

      // If this is a forced refresh, show the refresh indicator
      if (force) {
        setIsRefreshing(true)
      }

      // If this is a background refresh, show the background refresh indicator
      const isBackground = hasFetchedTrips.current && !isLoadingTrips && !isRefreshing
      if (isBackground) {
        setIsBackgroundRefreshing(true)
      } else {
        setIsLoadingTrips(true)
      }

      // Check for recent cached data first (offline-first approach)
      if (!force) {
        try {
          const cachedData = localStorage.getItem("cached-trips")
          if (cachedData) {
            const { trips: cachedTrips, timestamp, version } = JSON.parse(cachedData)
            const isRecent = Date.now() - timestamp < 5 * 60 * 1000 // 5 minutes

            if (isRecent) {
              console.log("Using recent cached trips data")
              setTrips(cachedTrips)
              setDataSource("cache")

              // If we're online, still fetch in background but don't show loading state
              if (navigator.onLine && !isBackground) {
                console.log("Scheduling background refresh after using cache")
                setTimeout(() => {
                  setIsBackgroundRefreshing(true)
                  fetchTrips(true)
                }, 100)

                setIsLoadingTrips(false)
                hasFetchedTrips.current = true
                return
              }
            }
          }
        } catch (e) {
          console.warn("Could not load cached trips:", e)
        }
      }

      setDataError(null)
      setFetchAttempts((prev) => prev + 1)
      console.log(`Fetching trips for user: ${user.email} (attempt ${fetchAttempts + 1})`)

      try {
        // First check connection
        const connectionResult = await checkConnection()
        setConnectionStatus(connectionResult)

        if (connectionResult.status !== "connected") {
          console.log("Not connected, attempting reconnect")
          const reconnected = await attemptReconnect()

          if (!reconnected) {
            console.log("Reconnect failed, using cached data if available")
            setDataError("Unable to connect to the database. Please check your internet connection.")

            // Try to use cached data
            try {
              const cachedData = localStorage.getItem("cached-trips")
              if (cachedData) {
                const { trips: cachedTrips } = JSON.parse(cachedData)
                setTrips(cachedTrips)
                setDataSource("cache")
                console.log("Using cached trips data due to connection error")
              }
            } catch (e) {
              console.warn("Could not load cached trips as fallback:", e)
            }

            // Set up retry with exponential backoff
            if (fetchAttempts < maxFetchAttempts) {
              const backoffTime = Math.pow(2, fetchAttempts) * 1000
              console.log(`Will retry in ${backoffTime}ms (attempt ${fetchAttempts + 1} of ${maxFetchAttempts})`)

              retryTimeoutRef.current = setTimeout(() => {
                console.log(`Executing retry attempt ${fetchAttempts + 1}`)
                fetchTrips(true)
              }, backoffTime)
            }

            setIsLoadingTrips(false)
            setIsRefreshing(false)
            setIsBackgroundRefreshing(false)
            return
          }
        }

        // Get trips created by user
        const { data: userTrips, error: tripsError } = await supabase
          .from("trips")
          .select("*")
          .eq("created_by", user.id)

        if (tripsError) {
          throw new Error(tripsError.message || "Error fetching user trips")
        }

        // Get trips where user is a member
        const { data: memberTrips, error: memberError } = await supabase
          .from("trip_members")
          .select("trip_id")
          .eq("user_id", user.id)

        if (memberError) {
          throw new Error(memberError.message || "Error fetching member trips")
        }

        // Get additional trips where user is a member
        let additionalTrips: any[] = []
        if (memberTrips && memberTrips.length > 0) {
          // Create a Set of trip IDs from userTrips to avoid duplicates
          const userTripIds = new Set(userTrips?.map(trip => trip.id) || [])
          
          // Filter out trips that the user already created
          const uniqueMemberTripIds = memberTrips
            .map(member => member.trip_id)
            .filter(id => !userTripIds.has(id))

          if (uniqueMemberTripIds.length > 0) {
            const { data, error } = await supabase
              .from("trips")
              .select("*")
              .in("id", uniqueMemberTripIds)

            if (error) {
              throw new Error(error.message || "Error fetching additional trips")
            }

            if (data) {
              additionalTrips = data
            }
          }
        }

        // Combine trips
        const allTrips = [...(userTrips || []), ...additionalTrips]

        // Get all trip members in a single query
        const { data: allMembers, error: membersError } = await supabase.from("trip_members").select("trip_id, user_id")

        if (membersError) {
          console.error("Error fetching all members:", membersError)
          // Don't fail the whole operation for this error
        }

        // Count members properly using sets
        const memberCounts: Record<string, Set<string>> = {}

        // Initialize with empty sets
        allTrips.forEach((trip) => {
          memberCounts[trip.id] = new Set()
        })

        // Add members to sets
        if (allMembers) {
          allMembers.forEach((member) => {
            if (member.trip_id && memberCounts[member.trip_id]) {
              memberCounts[member.trip_id].add(member.user_id)
            }
          })
        }

        // Add member counts to trips
        const tripsWithCounts = allTrips.map((trip) => {
          // Get the set of members for this trip
          const members = memberCounts[trip.id] || new Set()

          // Return trip with correct member count
          return {
            ...trip,
            memberCount: members.size,
          }
        })

        // Update state with the new data
        setTrips(tripsWithCounts)
        setDataSource("network")
        setDataError(null)
        setFetchAttempts(0) // Reset on success
        hasFetchedTrips.current = true

        // Cache the trips data
        try {
          localStorage.setItem(
            "cached-trips",
            JSON.stringify({
              trips: tripsWithCounts,
              timestamp: Date.now(),
              version: "1.1", // Increment version when cache structure changes
            }),
          )
        } catch (e) {
          console.warn("Could not cache trips data:", e)
        }

        // Schedule background refresh after 5 minutes
        if (backgroundRefreshRef.current) {
          clearTimeout(backgroundRefreshRef.current)
        }

        backgroundRefreshRef.current = setTimeout(
          () => {
            console.log("Executing scheduled background refresh")
            setIsBackgroundRefreshing(true)
            fetchTrips(true)
          },
          5 * 60 * 1000,
        ) // 5 minutes

        // If background retry was running, clear it
        if (backgroundRetryInterval) {
          clearInterval(backgroundRetryInterval)
          setBackgroundRetryInterval(null)
        }
      } catch (error) {
        console.error("Error in fetchTrips:", error)
        setDataError(error instanceof Error ? error.message : String(error))

        // Try to use cached data as fallback
        try {
          const cachedData = localStorage.getItem("cached-trips")
          if (cachedData) {
            const { trips: cachedTrips } = JSON.parse(cachedData)
            setTrips(cachedTrips)
            setDataSource("cache")
            console.log("Using cached trips as fallback after error")
          }
        } catch (e) {
          console.warn("Could not load cached trips as fallback:", e)
        }

        // Set up retry with exponential backoff if appropriate
        if (fetchAttempts < maxFetchAttempts && navigator.onLine) {
          const backoffTime = Math.pow(2, fetchAttempts) * 1000
          console.log(`Will retry in ${backoffTime}ms (attempt ${fetchAttempts + 1} of ${maxFetchAttempts})`)
          retryTimeoutRef.current = setTimeout(() => {
            console.log(`Executing retry attempt ${fetchAttempts + 1}`)
            fetchTrips(true)
          }, backoffTime)
        } else if (fetchAttempts >= maxFetchAttempts) {
          console.error("Max fetch attempts reached. Stopping retries.")
          setDataError("Unable to load trips after several attempts. We'll keep trying in the background, or you can refresh.")
          // Start background retry if not already started
          if (!backgroundRetryInterval) {
            const interval = setInterval(() => {
              console.log("Background retry: attempting to fetch trips...")
              fetchTrips(true)
            }, 30000)
            setBackgroundRetryInterval(interval)
          }
        }
      } finally {
        setIsLoadingTrips(false)
        setIsRefreshing(false)
        setIsBackgroundRefreshing(false)
      }
    },
    [user, fetchAttempts, maxFetchAttempts, backgroundRetryInterval],
  )

  // Initial load
  useEffect(() => {
    if (user && !isLoading) {
      setTimeout(() => {
        fetchTrips()
      }, 500)
    }
    // Cleanup function to clear any timeouts and intervals
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (backgroundRefreshRef.current) {
        clearTimeout(backgroundRefreshRef.current)
      }
      if (backgroundRetryInterval) {
        clearInterval(backgroundRetryInterval)
        setBackgroundRetryInterval(null)
      }
    }
  }, [user, isLoading, fetchTrips, backgroundRetryInterval])

  useEffect(() => {
    const checkPendingInviteCode = async () => {
      if (!user || hasCheckedInvite.current) return

      try {
        hasCheckedInvite.current = true
        console.log("Checking for pending invite code")

        // Check if there's a pending invite code in localStorage
        const pendingInviteCode = localStorage.getItem("pendingInviteCode")

        if (pendingInviteCode) {
          console.log("Found pending invite code:", pendingInviteCode)

          // Clear the pending invite code
          localStorage.removeItem("pendingInviteCode")

          // Check if trip exists with this invite code
          const { data: trip, error: tripError } = await supabase
            .from("trips")
            .select("id")
            .eq("invite_code", pendingInviteCode)
            .single()

          if (tripError || !trip) {
            toast({
              title: "Invalid Invite Code",
              description: "The invite code you entered is invalid.",
              variant: "destructive",
            })
            return
          }

          // Check if user is already a member
          const { data: existingMember } = await supabase
            .from("trip_members")
            .select("id")
            .eq("trip_id", trip.id)
            .eq("user_id", user.id)
            .single()

          if (existingMember) {
            // User is already a member, just redirect
            console.log("User is already a member of this trip")
            router.push(`/trips/${trip.id}`)
            return
          }

          // Add user as a member
          const { error: joinError } = await supabase.from("trip_members").insert({
            trip_id: trip.id,
            user_id: user.id,
            role: "member",
          })

          if (joinError) {
            toast({
              title: "Error Joining Trip",
              description: "Failed to join the trip. Please try again.",
              variant: "destructive",
            })
            return
          }

          // Redirect to trip page
          toast({
            title: "Trip Joined",
            description: "You've successfully joined the trip!",
          })
          router.push(`/trips/${trip.id}`)
        }
      } catch (error) {
        console.error("Error checking pending invite code:", error)
      }
    }

    if (user && !isLoading) {
      checkPendingInviteCode()
    }
  }, [user, isLoading, router, toast])

  // Handle visibility change (tab switching) with throttling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now()

      // Throttle visibility change events
      if (now - lastVisibilityChange.current < minimumVisibilityChangeInterval) {
        console.log("Ignoring rapid visibility change")
        return
      }

      lastVisibilityChange.current = now

      if (document.visibilityState === "visible") {
        console.log("Dashboard tab is now visible")

        // Check connection and refresh data
        checkConnection().then((status) => {
          setConnectionStatus(status)

          if (status.status === "connected" && user && hasFetchedTrips.current) {
            // Only do a background refresh when becoming visible again
            setIsBackgroundRefreshing(true)
            fetchTrips(true)
          } else if (status.status !== "connected") {
            attemptReconnect().then((reconnected) => {
              if (reconnected && user) {
                fetchTrips(true)
              }
            })
          }
        })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Also refresh on focus with throttling
    const handleFocus = () => {
      const now = Date.now()

      // Throttle focus events
      if (now - lastVisibilityChange.current < minimumVisibilityChangeInterval) {
        console.log("Ignoring rapid focus change")
        return
      }

      lastVisibilityChange.current = now
      console.log("Window focused")

      // Only do a background refresh when window is focused again
      if (user && hasFetchedTrips.current) {
        setIsBackgroundRefreshing(true)
        fetchTrips(true)
      }
    }

    window.addEventListener("focus", handleFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [user, fetchTrips])

  const handleRefresh = () => {
    setIsRefreshing(true)
    setFetchAttempts(0)
    setDataError(null)

    // Force check connection
    checkConnection(true).then((status) => {
      setConnectionStatus(status)

      if (status.status === "connected") {
        fetchTrips(true)
      } else {
        attemptReconnect().then((reconnected) => {
          if (reconnected) {
            fetchTrips(true)
          } else {
            setIsRefreshing(false)
            toast({
              title: "Connection Error",
              description: "Could not connect to the server. Please check your internet connection.",
              variant: "destructive",
            })
          }
        })
      }
    })
  }

  const getDaysUntilTrip = (startDate: string) => {
    const days = differenceInDays(new Date(startDate), new Date())
    if (days < 0) return null
    if (days === 0) return "Today!"
    if (days === 1) return "Tomorrow!"
    return `${days} days`
  }

  const getTripGradient = (name: string, destination: string, index: number) => {
    // Create a set of color combinations
    const colorSets = [
      "var(--vault-purple), var(--vault-pink), var(--vault-orange)",
      "var(--vault-blue), var(--vault-teal), var(--vault-green)",
      "var(--vault-orange), var(--vault-yellow), var(--vault-green)",
      "var(--vault-teal), var(--vault-blue), var(--vault-purple)",
      "var(--vault-green), var(--vault-teal), var(--vault-blue)",
      "var(--vault-pink), var(--vault-purple), var(--vault-blue)",
    ]

    // Use a hash of the trip name and destination to pick a consistent color
    const nameHash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const destHash = destination.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const combinedHash = (nameHash + destHash + index) % colorSets.length

    return colorSets[combinedHash]
  }

  // Wait for user/session after OAuth redirect
  useEffect(() => {
    // If we are on the dashboard and user is not ready, show loading
    if (!user && !isLoading) {
      // Poll for session for a few seconds
      let attempts = 0
      const maxAttempts = 10
      const interval = setInterval(() => {
        attempts++
        if (user || isLoading || attempts > maxAttempts) {
          clearInterval(interval)
        }
      }, 300)
      return () => clearInterval(interval)
    }
  }, [user, isLoading])

  // Force full reload if redirected from OAuth and user is not ready
  useEffect(() => {
    if (searchParams?.get("refresh") && !user && !isLoading) {
      window.location.reload()
    }
  }, [searchParams, user, isLoading])

  if (isLoading || isLoadingProfile || (!user && !isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vault-purple/10 via-vault-pink/10 to-vault-yellow/10">
        <div className="text-center">
          <div className="animate-bounce mb-4">
            <User className="h-12 w-12 text-vault-purple mx-auto" />
          </div>
          <div className="animate-pulse text-vault-purple font-medium">Signing you in...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-vault-purple/10 via-vault-pink/10 to-vault-yellow/10">
        <Card className="w-full max-w-md animate-fade-in border-0 shadow-xl">
          <CardHeader className="text-center">
            <div className="mb-4 animate-bounce-slow">
              <Heart className="h-16 w-16 text-vault-pink mx-auto" />
            </div>
            <CardTitle className="text-2xl bg-gradient-to-r from-vault-purple to-vault-pink bg-clip-text text-transparent">
              Welcome Back!
            </CardTitle>
            <CardDescription>
              {authError ? `Authentication error: ${authError}` : "Sign in to see your family adventures"}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Link href="/auth/signin" className="w-full">
              <Button className="w-full bg-gradient-to-r from-vault-purple to-vault-pink hover:opacity-90 transition-all transform hover:scale-105">
                Sign In
              </Button>
            </Link>
            <Link href="/debug" className="w-full">
              <Button variant="outline" className="w-full">
                Debug Authentication
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vault-purple/10 via-vault-pink/10 to-vault-yellow/10">
        <div className="text-center">
          <div className="animate-bounce mb-4">
            <Plane className="h-12 w-12 text-vault-purple mx-auto" />
          </div>
          <div className="text-red-600 font-bold text-xl mb-2">{dataError}</div>
          <Button onClick={() => { setFetchAttempts(0); setDataError(null); fetchTrips(true); }}>
            Retry Now
          </Button>
          <div className="mt-4 text-gray-600 text-sm">We'll keep trying in the background. If the connection is restored, your trips will appear automatically.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-vault-purple/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-vault-pink/20 rounded-full blur-3xl animate-float-delayed" />
      </div>

      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-vault-purple to-vault-pink flex items-center justify-center text-white font-bold text-lg animate-shimmer">
                  V
                </div>
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-vault-yellow animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-vault-purple to-vault-pink bg-clip-text text-transparent">
                  VDH Vault
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Family Adventure HQ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="mr-2 text-gray-500 hover:text-vault-purple"
                aria-label="Refresh trips"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="sr-only">Refresh</span>
              </Button>

              <Link href="/profile">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url || "/placeholder.svg"}
                      alt={profile.full_name || "User"}
                      className="w-8 h-8 rounded-full ring-2 ring-vault-purple/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-vault-purple to-vault-pink flex items-center justify-center text-white text-sm font-bold">
                      {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="hidden sm:inline font-medium">{profile?.full_name || user.email}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Connection status */}
        {isOffline && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-yellow-700 font-medium">You're offline</p>
              <p className="text-sm text-yellow-600">
                {dataSource === "cache"
                  ? "Showing cached data. Some features may be limited."
                  : "Check your internet connection and try again."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
              Retry
            </Button>
          </div>
        )}

        {connectionStatus.status === "disconnected" && !isOffline && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">Connection Error</p>
              <p className="text-sm text-red-600">{connectionStatus.error || "Unable to connect to the database"}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
              Retry
            </Button>
          </div>
        )}

        {dataError && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-amber-700 font-medium">Error Loading Trips</p>
                <p className="text-sm text-amber-600">{dataError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
                Retry
              </Button>
            </div>
            {fetchAttempts >= maxFetchAttempts && (
              <div className="mt-2 text-sm text-amber-600">
                <p>We're having trouble connecting to the server. You can try:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Checking your internet connection</li>
                  <li>Refreshing the page</li>
                  <li>Signing out and signing back in</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {dataSource === "cache" && !isOffline && !dataError && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm">
            <div className="flex-1 text-blue-700">
              Showing cached data.{" "}
              <Button variant="link" onClick={handleRefresh} className="p-0 h-auto text-blue-700 font-medium">
                Refresh
              </Button>{" "}
              to get the latest updates.
            </div>
          </div>
        )}

        {isBackgroundRefreshing && (
          <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center gap-2 text-sm text-green-700">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Updating in background...
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-vault-purple to-vault-pink bg-clip-text text-transparent mb-2">
              Your Adventures
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isLoadingTrips
                ? "Loading your trips..."
                : trips.length === 0
                  ? "Time to plan your next family escapade!"
                  : `${trips.length} ${trips.length === 1 ? "adventure" : "adventures"} in the making`}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/auth/join">
              <Button className="bg-gradient-to-r from-vault-orange to-vault-yellow hover:opacity-90 transition-all transform hover:scale-105 shadow-lg">
                <Users className="mr-2 h-4 w-4" />
                Join Trip
              </Button>
            </Link>
            <Link href="/trips/create">
              <Button className="bg-gradient-to-r from-vault-purple to-vault-pink hover:opacity-90 transition-all transform hover:scale-105 shadow-lg">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Trip
              </Button>
            </Link>
          </div>
        </div>

        {isLoadingTrips && trips.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse border-0 shadow-lg">
                <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600" />
                <CardContent className="py-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                </CardContent>
                <CardFooter className="h-12 bg-gray-100 dark:bg-gray-800" />
              </Card>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <Card className="animate-fade-in border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader className="text-center pb-4">
              <div className="mb-4 relative">
                <Camera className="h-24 w-24 text-vault-purple/20 mx-auto" />
                <Plane className="h-12 w-12 text-vault-purple absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" />
              </div>
              <CardTitle className="text-2xl mb-2">No trips yet? No problem!</CardTitle>
              <CardDescription className="text-lg">
                Every great adventure starts with a single step (or click)
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pb-8">
              <Link href="/trips/create" className="w-full">
                <Button className="w-full bg-gradient-to-r from-vault-purple to-vault-pink hover:opacity-90 transition-all transform hover:scale-105 shadow-lg h-12 text-lg">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Plan Your First Adventure
                </Button>
              </Link>
              <Link href="/auth/join" className="w-full">
                <Button variant="outline" className="w-full h-12 text-lg hover:scale-105 transition-transform">
                  Join a Family Trip
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip, index) => {
              const daysUntil = getDaysUntilTrip(trip.start_date)
              const isUpcoming = new Date(trip.start_date) > new Date()
              const isOngoing = new Date(trip.start_date) <= new Date() && new Date(trip.end_date) >= new Date()

              return (
                <div key={trip.id} className="relative group">
                  <Link href={`/trips/${trip.id}`}>
                    <Card
                      className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-rotate-1 animate-fade-in overflow-hidden group"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div
                        className="h-32 relative overflow-hidden"
                        style={{
                          background: `linear-gradient(to bottom right, ${getTripGradient(trip.name, trip.destination, index)})`,
                        }}
                      >
                        <MapPin className="absolute top-4 right-4 h-8 w-8 text-white/30" />
                        <Plane className="absolute bottom-4 left-4 h-6 w-6 text-white/30 transform rotate-45" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute bottom-4 left-4 text-white">
                          <h3 className="text-2xl font-bold drop-shadow-lg">{trip.name}</h3>
                          <p className="text-white/90 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {trip.destination}
                          </p>
                        </div>
                        {daysUntil && (
                          <Badge className="absolute top-4 left-4 bg-white/90 text-vault-purple hover:bg-white">
                            <Sparkles className="h-3 w-3 mr-1" />
                            {daysUntil}
                          </Badge>
                        )}
                        {isOngoing && (
                          <Badge className="absolute top-4 left-4 bg-vault-green text-white animate-pulse">
                            <Star className="h-3 w-3 mr-1 fill-white" />
                            Happening Now!
                          </Badge>
                        )}
                      </div>
                      <CardContent className="pb-2 pt-4">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <Calendar className="h-4 w-4 mr-1 text-vault-purple" />
                          {new Date(trip.start_date).toLocaleDateString()} -{" "}
                          {new Date(trip.end_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Users className="h-4 w-4 mr-1 text-vault-pink" />
                          {/* Fixed: Show 1 member (the creator) by default, plus any additional members */}
                          {trip.created_by === user.id ? trip.memberCount + 1 : trip.memberCount}{" "}
                          {(trip.created_by === user.id ? trip.memberCount + 1 : trip.memberCount) === 1
                            ? "adventurer"
                            : "adventurers"}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                        Created {formatDistanceToNow(new Date(trip.created_at), { addSuffix: true })}
                      </CardFooter>
                    </Card>
                  </Link>
                </div>
              )
            })}
            <Link href="/trips/create">
              <Card
                className="h-full border-2 border-dashed border-vault-purple/30 flex flex-col items-center justify-center p-6 hover:border-vault-purple/60 hover:shadow-lg transition-all duration-300 transform hover:scale-105 animate-fade-in group"
                style={{ animationDelay: `${trips.length * 0.1}s` }}
              >
                <PlusCircle className="h-16 w-16 text-vault-purple/50 mb-4 group-hover:text-vault-purple transition-colors group-hover:rotate-90 transform duration-300" />
                <p className="text-lg font-medium text-center text-gray-600 dark:text-gray-400 mb-2">
                  Create New Adventure
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
                  Because the best memories haven't been made yet
                </p>
              </Card>
            </Link>
          </div>
        )}
      </main>

      <PWAInstallPrompt />
    </div>
  )
} 