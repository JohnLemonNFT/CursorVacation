"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import type { User, Session, Provider } from "@supabase/supabase-js"
import { usePathname, useRouter } from "next/navigation"
import { safeSessionStorage } from "@/lib/safe-storage"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signInWithGoogle: () => Promise<{ provider: Provider; url: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Use refs to track initialization and prevent multiple redirects
  const isInitialized = useRef(false)
  const authChangeCount = useRef(0)
  const lastAuthEvent = useRef<string | null>(null)
  const initializationPromise = useRef<Promise<void> | null>(null)

  useEffect(() => {
    const setupAuth = async () => {
      if (isInitialized.current) return

      setIsLoading(true)
      console.log("Setting up auth...")

      try {
        // Create a promise to track initialization
        initializationPromise.current = (async () => {
          // Get initial session
          const { data } = await supabase.auth.getSession()

          if (data.session) {
            console.log("Initial session found for:", data.session.user.email)
            setSession(data.session)
            setUser(data.session.user)

            // Store auth in sessionStorage to persist across tab switches
            safeSessionStorage.setItem("authUser", JSON.stringify(data.session.user))
          } else {
            console.log("No initial session found")
            setSession(null)
            setUser(null)
          }
        })()

        await initializationPromise.current
      } catch (error) {
        console.error("Error getting initial session:", error)
      } finally {
        isInitialized.current = true
        setIsLoading(false)
      }
    }

    // Try to restore user from sessionStorage first (for quick tab switching)
    const storedUser = safeSessionStorage.getItem("authUser")
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        console.log("Restored user from sessionStorage:", parsedUser.email)
      } catch (e) {
        console.error("Failed to parse stored user:", e)
      }
    }

    setupAuth()

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Wait for initialization to complete before processing auth changes
      if (initializationPromise.current) {
        await initializationPromise.current
      }

      authChangeCount.current += 1
      const count = authChangeCount.current

      console.log(`Auth state change #${count}: ${event}`, newSession?.user?.email || "no user")

      // Prevent duplicate events
      if (lastAuthEvent.current === event && event !== "SIGNED_OUT") {
        console.log(`Ignoring duplicate ${event} event`)
        return
      }

      lastAuthEvent.current = event

      // Update state
      setSession(newSession)
      setUser(newSession?.user ?? null)

      // Store in sessionStorage
      if (newSession?.user) {
        safeSessionStorage.setItem("authUser", JSON.stringify(newSession.user))
      } else if (event === "SIGNED_OUT") {
        safeSessionStorage.removeItem("authUser")
      }

      // Handle profile creation/update for new sign-ins
      if (event === "SIGNED_IN" && newSession?.user) {
        try {
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", newSession.user.id)
            .single()

          if (!existingProfile) {
            // Create profile with Google data
            const googleAvatar = newSession.user.user_metadata?.avatar_url || newSession.user.user_metadata?.picture
            const googleName = newSession.user.user_metadata?.full_name || newSession.user.user_metadata?.name

            await supabase.from("profiles").insert({
              id: newSession.user.id,
              email: newSession.user.email,
              full_name: googleName,
              avatar_url: googleAvatar,
            })
          }
        } catch (error) {
          console.error("Error handling profile:", error)
        }
      }

      // Handle redirects
      if (event === "SIGNED_IN") {
        // Only redirect to dashboard if we're on a sign-in related page
        const authPages = ["/auth/signin", "/auth/join", "/auth/callback", "/"]
        if (authPages.some((page) => pathname === page)) {
          console.log("Redirecting to dashboard from auth page")
          router.push("/dashboard")
        } else {
          console.log("Already in app, not redirecting")
        }
      }

      if (event === "SIGNED_OUT") {
        console.log("Signed out, redirecting to home")
        router.push("/")
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router, pathname])

  const signInWithGoogle = async () => {
    console.log("Initiating Google sign-in...")

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "email profile",
        },
      })

      if (error) {
        console.error("Google sign in error:", error)
        throw error
      }

      console.log("Sign-in initiated successfully:", data)
      return data
    } catch (error) {
      console.error("Error in signInWithGoogle:", error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
