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
  const [isInitialized, setIsInitialized] = useState(false)
  const initializationPromise = useRef<Promise<void> | null>(null)
  const hasRedirected = useRef(false)

  useEffect(() => {
    const initializeAuth = async () => {
      if (initializationPromise.current) {
        return initializationPromise.current
      }

      initializationPromise.current = (async () => {
        try {
          console.log("Initializing auth state...")
          setIsLoading(true)

          // Get session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error("Error getting session:", sessionError)
            throw sessionError
          }

          if (session?.user) {
            console.log("Session found, setting user:", session.user.id)
            setSession(session)
            setUser(session.user)
          } else {
            console.log("No session found, checking sessionStorage")
            // Try to restore from sessionStorage
            const storedUser = sessionStorage.getItem("user")
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser)
                console.log("Restored user from sessionStorage:", parsedUser.id)
                setUser(parsedUser)
              } catch (e) {
                console.error("Error parsing stored user:", e)
                sessionStorage.removeItem("user")
              }
            }
          }

          // Set up auth state change listener
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth state changed:", event, session?.user?.id)
            
            // Wait for initialization to complete
            if (initializationPromise.current) {
              await initializationPromise.current
            }

            if (event === "SIGNED_IN" && session?.user) {
              console.log("User signed in:", session.user.id)
              setSession(session)
              setUser(session.user)
              sessionStorage.setItem("user", JSON.stringify(session.user))
            } else if (event === "SIGNED_OUT") {
              console.log("User signed out")
              setSession(null)
              setUser(null)
              sessionStorage.removeItem("user")
            }
          })

          setIsInitialized(true)
          subscription.unsubscribe()
        } catch (error) {
          console.error("Error initializing auth:", error)
          setSession(null)
          setUser(null)
          sessionStorage.removeItem("user")
          throw error
        } finally {
          setIsLoading(false)
        }
      })()

      return initializationPromise.current
    }

    initializeAuth().catch(error => {
      console.error("Failed to initialize auth:", error)
      setIsLoading(false)
    })
  }, [])

  const value = {
    user,
    session,
    isLoading: isLoading || !isInitialized,
    signInWithGoogle: async () => {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error
        return data
      } catch (error) {
        console.error("Error signing in with Google:", error)
        throw error
      }
    },
    signOut: async () => {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setSession(null)
        setUser(null)
        sessionStorage.removeItem("user")
      } catch (error) {
        console.error("Error signing out:", error)
        throw error
      }
    },
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
