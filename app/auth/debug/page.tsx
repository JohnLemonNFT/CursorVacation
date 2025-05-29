"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"

export default function AuthDebugPage() {
  const { user, session, isLoading, signInWithGoogle } = useAuth()
  const [oauthProviders, setOauthProviders] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [authStatus, setAuthStatus] = useState<string>("Checking...")

  useEffect(() => {
    async function checkAuth() {
      try {
        setAuthStatus("Checking session...")

        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          setAuthStatus("Error getting session")
          throw sessionError
        }

        if (session) {
          setAuthStatus(`Session found for: ${session.user.email}`)
        } else {
          setAuthStatus("No active session")
        }

        // Get OAuth providers
        const { data: providers, error: providersError } = await supabase.auth.getSession()

        if (providersError) {
          throw providersError
        }

        setOauthProviders(providers || [])
      } catch (err) {
        console.error("Auth check error:", err)
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    checkAuth()
  }, [])

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true)
      setError(null)
      await signInWithGoogle()

      // We'll set a timeout to reset the signing in state if it takes too long
      setTimeout(() => {
        setIsSigningIn(false)
      }, 10000)
    } catch (error) {
      console.error("Error signing in:", error)
      setError(error instanceof Error ? error.message : String(error))
      setIsSigningIn(false)
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
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
            <h3 className="font-medium mb-2">Authentication Status</h3>
            <p>
              <strong>Auth Context Status:</strong> {isLoading ? "Loading..." : user ? "Logged in" : "Not logged in"}
            </p>
            <p>
              <strong>Direct Check Status:</strong> {authStatus}
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
            <p>
              <strong>Redirect URL:</strong>{" "}
              {typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "N/A"}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
            </>
          ) : (
            <>
              <Button
                onClick={handleSignIn}
                className="bg-vault-purple hover:bg-vault-purple/90"
                disabled={isSigningIn}
              >
                {isSigningIn ? "Signing in..." : "Sign in with Google"}
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
