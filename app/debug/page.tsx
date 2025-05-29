"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function DebugPage() {
  const [session, setSession] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        setLoading(true)

        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        setSession(session)
        setUser(session?.user || null)
      } catch (err) {
        console.error("Auth check error:", err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event)
      setSession(session)
      setUser(session?.user || null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Authentication Debug</CardTitle>
          <CardDescription>Check your authentication status and session details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-4">Loading authentication status...</div>
          ) : (
            <>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <h3 className="font-medium mb-2">Authentication Status</h3>
                <p>
                  <strong>Logged in:</strong> {user ? "Yes" : "No"}
                </p>
                {user && (
                  <>
                    <p>
                      <strong>User ID:</strong> {user.id}
                    </p>
                    <p>
                      <strong>Email:</strong> {user.email}
                    </p>
                    <p>
                      <strong>Provider:</strong> {user.app_metadata?.provider || "Unknown"}
                    </p>
                  </>
                )}
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-red-600 dark:text-red-400">
                  <h3 className="font-medium mb-2">Error</h3>
                  <p>{error}</p>
                </div>
              )}

              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <h3 className="font-medium mb-2">Session Details</h3>
                {session ? (
                  <pre className="text-xs overflow-auto max-h-40 p-2 bg-gray-200 dark:bg-gray-700 rounded">
                    {JSON.stringify(session, null, 2)}
                  </pre>
                ) : (
                  <p>No active session</p>
                )}
              </div>

              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <h3 className="font-medium mb-2">Environment</h3>
                <p>
                  <strong>Window Location:</strong> {typeof window !== "undefined" ? window.location.href : "N/A"}
                </p>
                <p>
                  <strong>Origin:</strong> {typeof window !== "undefined" ? window.location.origin : "N/A"}
                </p>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3">
          {user ? (
            <>
              <Button onClick={handleSignOut} variant="outline">
                Sign Out
              </Button>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
            </>
          ) : (
            <>
              <Button onClick={handleSignIn} className="bg-vault-purple hover:bg-vault-purple/90">
                Sign in with Google
              </Button>
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
