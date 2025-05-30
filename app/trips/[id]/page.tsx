"use client"

import React from "react"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Plus,
  ChevronRight,
  Copy,
  Share,
  Home,
  List,
  Compass,
  Camera,
  Plane,
  ImageIcon,
  Sun,
  Umbrella,
  TreePalmIcon as PalmTree,
  RefreshCw,
  AlertCircle,
  WifiOff,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { differenceInDays, format, isBefore, isAfter, addDays } from "date-fns"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { TripCountdown } from "@/components/trip-countdown"
import { TripWishlist } from "@/components/trip-wishlist"
import { TripExplore } from "@/components/trip-explore"
import { TripMemories } from "@/components/trip-memories"
import { TripTravelInfo } from "@/components/trip-travel-info"
import { TripMediaLibrary } from "@/components/trip-media-library"
import { MobileHeader } from "@/components/mobile-header"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { fetchTripDetails } from "@/lib/data-manager"

type Trip = {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  invite_code: string
  shared_album_url: string | null
  created_by: string
}

type TripMember = {
  id: string
  user_id: string
  role: string
  arrival_date: string | null
  departure_date: string | null
  flight_details: string | null
  arrival_time: string | null
  departure_time: string | null
  travel_method: string | null
  profile: {
    full_name: string | null
    avatar_url: string | null
    email: string | null
  } | null
}

// Connection state type
type ConnectionState = {
  status: "connected" | "disconnected" | "unknown"
  lastChecked: number
  error?: string
}

// Fun vacation quotes
const VACATION_QUOTES = [
  "Time to make memories that will last a lifetime!",
  "The best stories are found between the pages of a passport.",
  "Vacation calories don't count, right?",
  "Life is short. Take the trip. Buy the shoes. Eat the cake.",
  "On vacation, calories don't count and bedtimes don't exist!",
  "A family that travels together, stays together.",
  "Vacation mode: Activated!",
  "Warning: Exposure to vacation may cause extreme happiness.",
  "Keep calm and vacation on!",
  "Adventure awaits, go find it!",
]

export default function TripDetail() {
  const { user, isLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripId = params.id as string
  const { toast } = useToast()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [members, setMembers] = useState<TripMember[]>([])
  const [isLoadingTrip, setIsLoadingTrip] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState(() => {
    // Try to get the tab from URL or localStorage
    const tabParam = searchParams?.get("tab")
    if (tabParam) return tabParam

    // Use direct localStorage with try/catch for better reliability
    try {
      if (typeof window !== "undefined") {
        const savedTab = localStorage.getItem(`trip-${tripId}-tab`)
        return savedTab || "overview"
      }
    } catch (e) {
      console.warn("Could not access localStorage", e)
    }
    return "overview"
  })

  const [isUserMember, setIsUserMember] = useState(false)
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false)
  const lastFetchTime = useRef<number>(0)
  const [randomQuote, setRandomQuote] = useState("")
  const [showFloatingElements, setShowFloatingElements] = useState(false)
  const [fetchAttempts, setFetchAttempts] = useState(0)
  const maxFetchAttempts = 3 // Reduced from 5
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false)
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [loadingStartTime, setLoadingStartTime] = useState<number>(0)
  const [loadingDuration, setLoadingDuration] = useState<number>(0)
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastVisibilityChange = useRef(Date.now())
  const [isOffline, setIsOffline] = useState(false)
  const [dataSource, setDataSource] = useState<"cache" | "network" | "unknown">("unknown")
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>({ status: "unknown", lastChecked: 0 })
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      console.log("Browser reports online status")
      setIsOffline(false)
      // Try to reconnect and refresh data
      if (user) {
        loadTripData(true)
      }
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
      try {
        // Simple ping to check if Supabase is reachable
        const { data, error } = await supabase.from("trips").select("id").limit(1)

        if (error) {
          console.error("Connection check failed:", error)
          setConnectionStatus({
            status: "disconnected",
            lastChecked: Date.now(),
            error: error.message,
          })
          return false
        }

        setConnectionStatus({
          status: "connected",
          lastChecked: Date.now(),
        })
        return true
      } catch (err) {
        console.error("Connection check error:", err)
        setConnectionStatus({
          status: "disconnected",
          lastChecked: Date.now(),
          error: err instanceof Error ? err.message : "Unknown error",
        })
        return false
      }
    }

    checkConnectionStatus()

    // Check connection status periodically
    const interval = setInterval(checkConnectionStatus, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Get a random vacation quote
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * VACATION_QUOTES.length)
    setRandomQuote(VACATION_QUOTES[randomIndex])

    // Show floating elements after a short delay
    const timer = setTimeout(() => {
      setShowFloatingElements(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Save active tab to localStorage when it changes
  useEffect(() => {
    if (tripId && activeTab) {
      // Use direct localStorage with try/catch for better reliability
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(`trip-${tripId}-tab`, activeTab)
        }
      } catch (e) {
        console.warn("Could not save active tab to localStorage", e)
      }
    }
  }, [activeTab, tripId])

  // Set a timeout to show error if loading takes too long
  useEffect(() => {
    let loadingTimer: NodeJS.Timeout | null = null
    let errorTimer: NodeJS.Timeout | null = null

    if (isLoadingTrip) {
      if (!loadingStartTime) {
        setLoadingStartTime(Date.now())
      }

      // Start a timer to update loading duration every second
      if (!loadingTimerRef.current) {
        loadingTimer = setInterval(() => {
          setLoadingDuration(Math.floor((Date.now() - loadingStartTime) / 1000))
        }, 1000)
        loadingTimerRef.current = loadingTimer
      }

      // Set a timeout to show error after 15 seconds
      if (!loadingTimeout) {
        errorTimer = setTimeout(() => {
          if (isLoadingTrip) {
            setError("Loading is taking longer than expected. Please try refreshing the page.")
            setIsLoadingTrip(false)
          }
        }, 15000) // 15 seconds timeout
        setLoadingTimeout(errorTimer)
      }
    } else {
      // Clear timers when not loading
      setLoadingStartTime(0)
      setLoadingDuration(0)
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current)
        loadingTimerRef.current = null
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
        setLoadingTimeout(null)
      }
    }

    return () => {
      if (loadingTimer) {
        clearInterval(loadingTimer)
      }
      if (errorTimer) {
        clearTimeout(errorTimer)
      }
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current)
        loadingTimerRef.current = null
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout)
        setLoadingTimeout(null)
      }
    }
  }, [isLoadingTrip, loadingTimeout, loadingStartTime])

  // Try to load cached trip data
  useEffect(() => {
    if (tripId && !hasAttemptedFetch) {
      try {
        const cachedTripData = localStorage.getItem(`cached-trip-${tripId}`)
        if (cachedTripData) {
          const parsedData = JSON.parse(cachedTripData)
          // Standardize cache version to "1.0"
          if (parsedData.version !== "1.0") {
            console.log("Cache version mismatch, will fetch fresh data")
            return
          }
          if (parsedData.trip && parsedData.members) {
            console.log("Using cached trip data")
            setTrip(parsedData.trip)
            setMembers(parsedData.members)
            setDataSource("cache")
          }
        }
      } catch (e) {
        console.warn("Could not load cached trip data:", e)
      }
    }
  }, [tripId, hasAttemptedFetch])

  // Initial load
  useEffect(() => {
    if (user && tripId && !hasAttemptedFetch) {
      loadTripData(true)
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [user, tripId, hasAttemptedFetch])

  // Retry fetching if we haven't reached max attempts
  useEffect(() => {
    if (
      error &&
      fetchAttempts < maxFetchAttempts &&
      user &&
      !isManuallyRefreshing
    ) {
      console.warn(
        `Retrying fetch (${fetchAttempts + 1}/${maxFetchAttempts}) due to error:`,
        error
      )
      const timer = setTimeout(() => {
        loadTripData(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
    if (error && fetchAttempts >= maxFetchAttempts) {
      console.error("Max fetch attempts reached. Stopping retries.", error)
      // Optionally, show a toast or set a special error state here
    }
  }, [error, fetchAttempts, user, isManuallyRefreshing])

  // Handle visibility change (tab switching)
  useEffect(() => {
    let isMounted = true
    let visibilityChangeTimeout: NodeJS.Timeout | null = null

    const handleVisibilityChange = () => {
      if (!isMounted) return

      if (document.visibilityState === "visible") {
        console.log("Trip page is now visible")

        // Only refresh if it's been more than 30 seconds since last visibility change
        const now = Date.now()
        const timeSinceLastChange = now - lastVisibilityChange.current

        if (timeSinceLastChange > 30000) { // Increased from 15 seconds to 30 seconds
          console.log("It's been more than 30 seconds, refreshing data")
          lastVisibilityChange.current = now
          
          // Clear any existing timeout
          if (visibilityChangeTimeout) {
            clearTimeout(visibilityChangeTimeout)
          }

          // Add a small delay to prevent rapid refreshes
          visibilityChangeTimeout = setTimeout(() => {
            if (isMounted) {
              loadTripData(true)
            }
          }, 1000)
        } else {
          console.log("Skipping refresh, last visibility change was too recent")
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Also refresh on focus
    const handleFocus = () => {
      console.log("Window focused")
      handleVisibilityChange()
    }

    window.addEventListener("focus", handleFocus)

    return () => {
      isMounted = false
      if (visibilityChangeTimeout) {
        clearTimeout(visibilityChangeTimeout)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [])

  const handleShare = async () => {
    if (!trip) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my trip: ${trip.name}`,
          text: `I've invited you to join my trip on VDH Vault. Use invite code: ${trip.invite_code}`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
        // Fallback to copying the invite code
        navigator.clipboard.writeText(trip.invite_code)
        toast({
          title: "Copied!",
          description: "Invite code copied to clipboard",
          duration: 2000,
        })
      }
    } else {
      // Fallback to copying the invite code
      navigator.clipboard.writeText(trip.invite_code)
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard",
        duration: 2000,
      })
    }
  }

  const handleManualRefresh = () => {
    setIsManuallyRefreshing(true)
    setFetchAttempts(0)
    setError("")
    lastVisibilityChange.current = Date.now()

    checkConnection(true).then((status) => {
      const typedStatus = status as ConnectionState
      setConnectionStatus(typedStatus)

      if (typedStatus.status === "connected") {
        loadTripData(true)
      } else {
        attemptReconnect().then((reconnected) => {
          if (reconnected) {
            loadTripData(true)
          } else {
            setIsManuallyRefreshing(false)
            toast({
              title: "Connection Error",
              description: typedStatus.error || "Could not connect to the server. Please check your internet connection.",
              variant: "destructive",
            })
          }
        })
      }
    })
  }

  const loadTripData = async (force = false) => {
    if (!user || !tripId) {
      console.log("Waiting for user or tripId:", { user: !!user, tripId: !!tripId })
      return
    }

    // Clear any existing fetch timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
      fetchTimeoutRef.current = null
    }

    // Prevent fetching too frequently unless forced
    const now = Date.now()
    if (!force && now - lastFetchTime.current < 30000) { // 30 second cooldown
      console.log("Skipping fetch, too recent:", Math.round((now - lastFetchTime.current) / 1000) + "s ago")
      return
    }

    try {
      setIsLoadingTrip(true)
      setHasAttemptedFetch(true)
      lastFetchTime.current = now
      setFetchAttempts((prev) => prev + 1)
      setLoadingStartTime(Date.now())

      // Simple auth check
      if (!user.id) {
        throw new Error("Authentication required")
      }

      // Additional check to ensure all required dependencies are initialized
      if (!supabase || !supabase.auth) {
        throw new Error("Database client not initialized")
      }

      console.log("Fetching trip details:", tripId)

      // Set a timeout for the fetch operation
      const fetchPromise = fetchTripDetails(tripId, user.id, force)
      const timeoutPromise = new Promise((_, reject) => {
        fetchTimeoutRef.current = setTimeout(() => {
          reject(new Error("Fetch operation timed out"))
        }, 5000) // 5 second timeout
      })

      const result = (await Promise.race([fetchPromise, timeoutPromise])) as {
        trip: Trip
        members: TripMember[]
        fromCache?: boolean
        offline?: boolean
      }

      // Only update state if the fetch was successful
      if (result && typeof result === "object" && "trip" in result && "members" in result) {
        setTrip(result.trip)
        setMembers(result.members)
        setDataSource(result.fromCache ? "cache" : "network")
        setIsOffline(result.offline || false)
        setIsUserMember(true)
        setError("")
        setFetchAttempts(0)
        console.log("Trip data loaded successfully")
        console.log("Trip members:", result.members) // Debug log for trip members
        console.log("Raw response from fetchTripDetails:", result) // Debug log for raw response
      } else {
        throw new Error("Invalid response format")
      }

      setIsLoadingTrip(false)
      setIsManuallyRefreshing(false)
    } catch (error) {
      console.error("Error in loadTripData:", error)

      if (error instanceof Error) {
        // Handle specific error types
        switch (error.message) {
          case "AUTH_ERROR":
          case "Authentication required":
            router.push("/auth/signin")
            return
          case "ACCESS_DENIED":
            router.push("/dashboard")
            return
          case "Database client not initialized":
            setError("Unable to connect to the database. Please try again.")
            break
          case "Fetch operation timed out":
            setError("The request took too long to complete. Please check your connection and try again.")
            break
          case "Invalid response format":
            setError("Received invalid data from the server. Please try again.")
            break
          default:
            setError(error.message)
        }
      } else {
        setError("An unexpected error occurred. Please try again.")
      }

      setIsLoadingTrip(false)
      setIsManuallyRefreshing(false)
    }
  }

  if (isLoading || (isLoadingTrip && !hasAttemptedFetch)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-vault-purple/10 to-vault-orange/10">
        <div className="animate-bounce mb-4">
          <Plane className="h-12 w-12 text-vault-purple" />
        </div>
        <div className="text-xl font-bold text-vault-purple animate-pulse">Packing your trip details...</div>
        <p className="text-gray-500 mt-2 italic">Hang tight, we're almost there!</p>
      </div>
    )
  }

  // Show loading with refresh button after 5 seconds
  if (isLoadingTrip && loadingDuration >= 5) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-vault-purple/10 to-vault-orange/10">
        <div className="animate-bounce mb-4">
          <Plane className="h-12 w-12 text-vault-purple" />
        </div>
        <div className="text-xl font-bold text-vault-purple animate-pulse">Still loading your trip...</div>
        <p className="text-gray-500 mt-2 italic">This is taking longer than expected ({loadingDuration}s)</p>

        <div className="mt-6">
          <Button
            onClick={handleManualRefresh}
            className="bg-vault-purple hover:bg-vault-purple/90 text-white flex items-center gap-2"
            disabled={isManuallyRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isManuallyRefreshing && "animate-spin")} />
            {isManuallyRefreshing ? "Refreshing..." : "Refresh Now"}
          </Button>
        </div>

        <div className="mt-4">
          <Link href="/dashboard">
            <Button variant="outline" className="border-vault-purple/30 hover:bg-vault-purple/10">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-vault-purple/10 to-vault-orange/10">
        <Card className="w-full max-w-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/20 to-vault-orange/20 opacity-50"></div>
          <CardHeader className="relative z-10">
            <CardTitle className="text-center text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-vault-purple to-vault-orange">
              Sign In Required
            </CardTitle>
            <CardDescription className="text-center">Please sign in to view this amazing trip!</CardDescription>
          </CardHeader>
          <CardFooter className="relative z-10">
            <Link href="/auth/signin" className="w-full">
              <Button className="w-full bg-gradient-to-r from-vault-purple to-vault-orange hover:opacity-90 transition-all duration-300 transform hover:scale-105 text-white">
                Sign In to Continue
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-vault-purple/10 to-vault-orange/10">
        <Card className="w-full max-w-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 opacity-50"></div>
          <CardHeader className="relative z-10">
            <CardTitle className="text-center text-2xl font-bold text-red-500 flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6" />
              Oops! Something Went Wrong
            </CardTitle>
            <CardDescription className="text-center">
              {error || "We couldn't find this trip. It might have been deleted or you don't have access."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="relative z-10 flex flex-col gap-4">
            <Button
              className="w-full bg-gradient-to-r from-vault-purple to-vault-orange hover:opacity-90 transition-all duration-300 text-white flex items-center justify-center gap-2"
              onClick={handleManualRefresh}
              disabled={isManuallyRefreshing}
            >
              {isManuallyRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>
            <Link href="/dashboard" className="w-full">
              <Button variant="outline" className="w-full border-vault-purple/30 hover:bg-vault-purple/10">
                Back to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const tripStartDate = new Date(trip.start_date)
  const tripEndDate = new Date(trip.end_date)
  const today = new Date()
  const isPastTrip = isAfter(today, addDays(tripEndDate, 1))
  const isActiveTrip = isAfter(today, tripStartDate) && isBefore(today, addDays(tripEndDate, 1))
  const isFutureTrip = isBefore(today, tripStartDate)
  const tripDuration = differenceInDays(tripEndDate, tripStartDate) + 1

  // Define main navigation tabs
  const mainTabs = [
    { id: "overview", label: "Overview", icon: <Home className="h-5 w-5" /> },
    { id: "memories", label: "Memories", icon: <Camera className="h-5 w-5" /> },
    { id: "wishlist", label: "Wishlist", icon: <List className="h-5 w-5" /> },
    { id: "explore", label: "Explore", icon: <Compass className="h-5 w-5" /> },
    { id: "travel", label: "Travel", icon: <Plane className="h-5 w-5" /> },
    { id: "media", label: "Media", icon: <ImageIcon className="h-5 w-5" /> },
  ]

  // Function to directly open memory form
  const openMemoryForm = () => {
    setActiveTab("memories")
    // Add a small delay before showing the add form
    setTimeout(() => {
      const event = new CustomEvent("show-memory-form")
      window.dispatchEvent(event)
    }, 300)
  }

  // Function to directly open add wishlist form
  const openWishlistForm = () => {
    setActiveTab("wishlist")
    // Add a small delay before showing the add form
    setTimeout(() => {
      const event = new CustomEvent("show-wishlist-form")
      window.dispatchEvent(event)
    }, 300)
  }

  const getDaysUntilTrip = (startDate: string) => {
    const days = differenceInDays(new Date(startDate), new Date())
    if (days < 0) return null
    if (days === 0) return "Today!"
    if (days === 1) return "Tomorrow!"
    return `${days} days`
  }

  // Mock functions for data fetching and connection checks
  const checkConnection = async (force: boolean) => {
    // Simulate checking connection status
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ status: "connected", lastChecked: Date.now() })
      }, 300)
    })
  }

  const attemptReconnect = async () => {
    // Simulate attempting to reconnect
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 1000)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-vault-purple/5 to-vault-orange/5 relative pb-20 md:pb-0">
      {/* Floating elements */}
      {showFloatingElements && (
        <>
          <div className="hidden md:block absolute top-20 left-10 text-vault-purple/20 animate-float-slow">
            <PalmTree className="h-16 w-16" />
          </div>
          <div className="hidden md:block absolute bottom-20 right-10 text-vault-orange/20 animate-float">
            <Sun className="h-12 w-12" />
          </div>
          <div className="hidden md:block absolute top-40 right-20 text-vault-yellow/20 animate-float-reverse">
            <Umbrella className="h-10 w-10" />
          </div>
        </>
      )}

      {/* Mobile Header */}
      <MobileHeader
        title={trip.name}
        backHref="/dashboard"
        inviteCode={trip.invite_code}
        showSettings={true}
        settingsHref={`/trips/${trip.id}/settings`}
        onShare={handleShare}
      />

      {/* Main content */}
      <main className="container mx-auto py-2 px-3 sm:px-6 lg:px-8 relative z-10">
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
              onClick={handleManualRefresh}
              disabled={isManuallyRefreshing}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isManuallyRefreshing && "animate-spin")} />
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
              onClick={handleManualRefresh}
              disabled={isManuallyRefreshing}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isManuallyRefreshing && "animate-spin")} />
              Retry
            </Button>
          </div>
        )}

        {dataSource === "cache" && !isOffline && !error && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm">
            <div className="flex-1 text-blue-700">
              Showing cached data.{" "}
              <Button variant="link" onClick={handleManualRefresh} className="p-0 h-auto text-blue-700 font-medium">
                Refresh
              </Button>{" "}
              to get the latest updates.
            </div>
          </div>
        )}

        {/* Manual refresh button */}
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isManuallyRefreshing}
            className="text-gray-500 hover:text-vault-purple"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isManuallyRefreshing && "animate-spin")} />
            {isManuallyRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Random vacation quote - desktop only */}
        <div className="text-center mb-6 hidden md:block">
          <p className="text-sm italic text-gray-600 dark:text-gray-400 animate-fade-in">{randomQuote}</p>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:block">
          <div className="grid grid-cols-6 gap-2 mb-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-1 shadow-md">
            {mainTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                className={cn(
                  "transition-all duration-300 transform hover:scale-105",
                  activeTab === tab.id ? "bg-gradient-to-r from-vault-purple to-vault-purple/90 text-white" : "",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <div className="flex items-center">
                  {React.cloneElement(tab.icon as React.ReactElement<any, any>, { className: "h-4 w-4 mr-2" })}
                  {tab.label}
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="animate-fade-in pb-16 md:pb-0">
          {activeTab === "overview" && (
            <>
              {/* Mobile Overview */}
              <div className="md:hidden space-y-4">
                {/* Trip Info Card */}
                <Card className="overflow-hidden relative border border-white/40 shadow-md">
                  <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/10 via-white/5 to-vault-orange/10 opacity-50"></div>
                  <CardContent className="p-4 relative z-10">
                    {/* Trip Status Badge */}
                    <div className="flex justify-center mb-2">
                      {isActiveTrip && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                          <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                          Happening Now!
                        </span>
                      )}
                      {isPastTrip && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Completed
                        </span>
                      )}
                      {isFutureTrip && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-vault-purple/20 text-vault-purple">
                          Upcoming
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    <div className="text-center mb-3">
                      <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-vault-purple to-vault-orange">
                        {trip.destination}
                      </h2>
                      <div className="flex items-center justify-center text-sm text-gray-600">
                        <MapPin className="h-3 w-3 mr-1 text-vault-orange" />
                        <span>{trip.destination}</span>
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div className="flex flex-col space-y-2 mb-4">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-vault-purple" />
                        <span>
                          {format(tripStartDate, "MMM d, yyyy")} - {format(tripEndDate, "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 mr-2 text-vault-green" />
                        <span>
                          {tripDuration} {tripDuration === 1 ? "day" : "days"}
                        </span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Users className="h-4 w-4 mr-2 text-vault-orange" />
                        <span>
                          {members.length + 1} {members.length + 1 === 1 ? "member" : "members"}
                        </span>
                      </div>
                    </div>

                    {/* Countdown */}
                    <TripCountdown startDate={tripStartDate} endDate={tripEndDate} />
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center justify-between py-4 px-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-purple/30 hover:bg-vault-purple/10 transition-all duration-300 shadow-sm"
                    onClick={openWishlistForm}
                  >
                    <div className="flex items-center">
                      <Plus className="h-5 w-5 text-vault-purple mr-3" />
                      <span className="font-medium">Add to Wishlist</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-vault-purple" />
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center justify-between py-4 px-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-orange/30 hover:bg-vault-orange/10 transition-all duration-300 shadow-sm"
                    onClick={openMemoryForm}
                  >
                    <div className="flex items-center">
                      <Plus className="h-5 w-5 text-vault-orange mr-3" />
                      <span className="font-medium">Post Memory</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-vault-orange" />
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center justify-between py-4 px-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-green/30 hover:bg-vault-green/10 transition-all duration-300 shadow-sm"
                    onClick={() => setActiveTab("explore")}
                  >
                    <div className="flex items-center">
                      <Compass className="h-5 w-5 text-vault-green mr-3" />
                      <span className="font-medium">Explore Activities</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-vault-green" />
                  </Button>
                </div>

                {/* Invite Card */}
                <Card className="mt-4 border-2 border-vault-purple border-dashed bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/5 via-white/5 to-vault-orange/5 opacity-50"></div>
                  <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="text-lg flex items-center">
                      <Users className="h-4 w-4 mr-2 text-vault-purple" />
                      Invite Family
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 pt-0">
                    <div className="flex flex-col gap-3">
                      <div className="bg-vault-purple/10 px-3 py-2 rounded-md font-mono text-base font-bold tracking-wider text-center border border-vault-purple/20 shadow-inner">
                        {trip.invite_code}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 flex items-center justify-center gap-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-purple/30 hover:bg-vault-purple/10 transition-all duration-300 h-9"
                          onClick={() => {
                            navigator.clipboard.writeText(trip.invite_code)
                            toast({
                              title: "Copied!",
                              description: "Invite code copied to clipboard",
                              duration: 2000,
                            })
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span className="text-sm">Copy</span>
                        </Button>
                        <Button
                          className="flex-1 bg-gradient-to-r from-vault-purple to-vault-purple/90 hover:opacity-90 transition-all duration-300 flex items-center justify-center gap-1 text-white h-9"
                          onClick={handleShare}
                        >
                          <Share className="h-3.5 w-3.5" />
                          <span className="text-sm">Share</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Desktop Overview */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2 overflow-hidden relative border border-white/40 shadow-xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/10 via-white/5 to-vault-orange/10 opacity-50"></div>
                  <CardHeader className="pb-2 relative z-10">
                    <div className="flex items-center">
                      <div className="mr-2">
                        {isActiveTrip && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 animate-pulse">
                            <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                            Happening Now!
                          </span>
                        )}
                        {isPastTrip && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Completed
                          </span>
                        )}
                        {isFutureTrip && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-vault-purple/20 text-vault-purple">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-vault-purple to-vault-orange">
                        {trip.name}
                      </CardTitle>
                    </div>
                    <CardDescription className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-vault-orange" />
                      <span className="font-medium">{trip.destination}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                      <div className="flex items-center text-sm bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-full shadow-sm">
                        <Calendar className="h-4 w-4 mr-1 text-vault-purple" />
                        {format(tripStartDate, "MMM d, yyyy")} - {format(tripEndDate, "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center text-sm bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-full shadow-sm">
                        <Clock className="h-4 w-4 mr-1 text-vault-green" />
                        {tripDuration} {tripDuration === 1 ? "day" : "days"}
                      </div>
                      <div className="flex items-center text-sm bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-full shadow-sm">
                        <Users className="h-4 w-4 mr-1 text-vault-orange" />
                        {members.length + 1} {members.length + 1 === 1 ? "member" : "members"}
                      </div>
                    </div>

                    <TripCountdown startDate={tripStartDate} endDate={tripEndDate} />

                    {isActiveTrip && !isPastTrip && (
                      <div className="mt-6 bg-vault-purple/10 rounded-lg p-4 border border-vault-purple/20 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className="h-5 w-5 text-vault-purple" />
                          <h3 className="font-medium text-vault-purple">Today's Memory Check-in</h3>
                        </div>
                        <p className="text-sm mb-3">
                          Don't forget to capture today's special moments! End each day by journaling your favorite
                          memories.
                        </p>
                        <Button
                          className="w-full bg-gradient-to-r from-vault-purple to-vault-orange hover:opacity-90 transition-all duration-300 text-white"
                          onClick={() => {
                            setActiveTab("memories")
                            // Add a small delay before showing the add form
                            setTimeout(() => {
                              const event = new CustomEvent("show-memory-form")
                              window.dispatchEvent(event)
                            }, 300)
                          }}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Today's Memories
                        </Button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                      <Button
                        variant="outline"
                        className="flex items-center justify-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-purple/30 hover:bg-vault-purple/10 transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                        onClick={() => setActiveTab("wishlist")}
                      >
                        <Plus className="h-4 w-4 text-vault-purple" />
                        <span>Add to Wishlist</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-vault-purple" />
                      </Button>
                      <Button
                        variant="outline"
                        className="flex items-center justify-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-orange/30 hover:bg-vault-orange/10 transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                        onClick={() => {
                          setActiveTab("memories")
                        }}
                      >
                        <Plus className="h-4 w-4 text-vault-orange" />
                        <span>Post Memory</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-vault-orange" />
                      </Button>
                      <Button
                        variant="outline"
                        className="flex items-center justify-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-green/30 hover:bg-vault-green/10 transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                        onClick={() => setActiveTab("explore")}
                      >
                        <Plus className="h-4 w-4 text-vault-green" />
                        <span>Explore Activities</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-vault-green" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 mt-6 border-2 border-vault-purple border-dashed bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/5 via-white/5 to-vault-orange/5 opacity-50"></div>
                  <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="text-xl flex items-center">
                      <Users className="h-5 w-5 mr-2 text-vault-purple" />
                      Invite Family Members
                    </CardTitle>
                    <CardDescription>Share this invite code with family to join your trip</CardDescription>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <div className="bg-vault-purple/10 px-4 py-2 rounded-md font-mono text-lg font-bold tracking-wider text-center min-w-[150px] border border-vault-purple/20 shadow-inner">
                        {trip.invite_code}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-purple/30 hover:bg-vault-purple/10 transition-all duration-300"
                          onClick={() => {
                            navigator.clipboard.writeText(trip.invite_code)
                            toast({
                              title: "Copied!",
                              description: "Invite code copied to clipboard",
                              duration: 2000,
                            })
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          <span>Copy Code</span>
                        </Button>
                        <Button
                          className="bg-gradient-to-r from-vault-purple to-vault-purple/90 hover:opacity-90 transition-all duration-300 flex items-center gap-2 text-white"
                          onClick={handleShare}
                        >
                          <Share className="h-4 w-4" />
                          <span>Share Trip</span>
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                      Family members can join by entering this code at{" "}
                      <span className="font-medium text-vault-purple">vdhvault.com/join</span> or by using the "Join
                      Trip" button on the dashboard.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Simple Member List */}
              {activeTab === "overview" && members.length > 0 && (
                <div className="flex flex-col items-start mt-2 mb-4">
                  <span className="text-sm text-gray-500 mb-1">Members:</span>
                  <div className="flex flex-row gap-3 flex-wrap">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 px-2 py-1 rounded-full shadow-sm">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-vault-purple to-vault-pink flex items-center justify-center text-white text-xs font-bold">
                          {member.profile && member.profile.full_name ? member.profile.full_name[0] : "U"}
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                          {member.profile && member.profile.full_name ? member.profile.full_name : "Unknown"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "memories" && (
            <TripMemories tripId={trip.id} userId={user.id} startDate={tripStartDate} endDate={tripEndDate} />
          )}

          {activeTab === "wishlist" && <TripWishlist tripId={trip.id} userId={user.id} />}

          {activeTab === "explore" && (
            <TripExplore
              tripId={trip.id}
              userId={user.id}
              destination={trip.destination}
              startDate={tripStartDate}
              endDate={tripEndDate}
              isAdmin={trip.created_by === user.id}
            />
          )}

          {activeTab === "travel" && (
            <TripTravelInfo
              tripId={trip.id}
              userId={user.id}
              members={members}
              startDate={tripStartDate}
              endDate={tripEndDate}
              isAdmin={trip.created_by === user.id}
            />
          )}

          {activeTab === "media" && (
            <TripMediaLibrary
              sharedAlbumUrl={trip.shared_album_url}
              tripId={trip.id}
              isAdmin={trip.created_by === user.id}
            />
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg z-50 md:hidden pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="flex justify-around py-2">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center px-2 py-1 rounded-lg transition-colors",
                activeTab === tab.id
                  ? "text-vault-purple bg-vault-purple/10"
                  : "text-gray-500 hover:text-vault-purple hover:bg-vault-purple/5",
              )}
            >
              {React.cloneElement(tab.icon as React.ReactElement<any, any>, {
                className: cn("h-6 w-6 mb-1", activeTab === tab.id ? "text-vault-purple" : "text-gray-500"),
              })}
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <PWAInstallPrompt />
    </div>
  )
}
