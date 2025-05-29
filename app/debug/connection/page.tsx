"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase, checkSupabaseConnection } from "@/lib/supabase"
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ConnectionDebugPage() {
  const [isChecking, setIsChecking] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">("online")
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean
    error?: string
    duration?: number
  } | null>(null)
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean
    error?: string
    user?: string
  } | null>(null)

  useEffect(() => {
    // Set initial network status
    setNetworkStatus(navigator.onLine ? "online" : "offline")

    // Add event listeners for network status
    const handleOnline = () => setNetworkStatus("online")
    const handleOffline = () => setNetworkStatus("offline")

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const checkConnection = async () => {
    setIsChecking(true)

    try {
      // Check Supabase connection
      const status = await checkSupabaseConnection()
      setSupabaseStatus(status)

      // Check auth status
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        setAuthStatus({
          authenticated: false,
          error: error.message,
        })
      } else {
        setAuthStatus({
          authenticated: !!data.session,
          user: data.session?.user.email || undefined,
        })
      }
    } catch (error) {
      console.error("Error checking connection:", error)
    } finally {
      setIsChecking(false)
    }
  }

  const refreshAuth = async () => {
    try {
      setIsChecking(true)
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        setAuthStatus({
          authenticated: false,
          error: error.message,
        })
      } else {
        setAuthStatus({
          authenticated: !!data.session,
          user: data.session?.user.email || undefined,
        })
      }
    } catch (error) {
      console.error("Error refreshing auth:", error)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-vault-purple">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl bg-gradient-to-r from-vault-purple to-vault-pink bg-clip-text text-transparent">
              Connection Diagnostics
            </CardTitle>
            <CardDescription>Check your connection to VDH Vault services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <span className="font-medium">Network Status</span>
              </div>
              <div className="flex items-center">
                {networkStatus === "online" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-green-600 font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-600 font-medium">Offline</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <span className="font-medium">Database Connection</span>
              </div>
              <div className="flex items-center">
                {supabaseStatus === null ? (
                  <span className="text-gray-500">Checking...</span>
                ) : supabaseStatus.connected ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-green-600 font-medium">Connected ({supabaseStatus.duration}ms)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-600 font-medium">Failed</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <span className="font-medium">Authentication</span>
              </div>
              <div className="flex items-center">
                {authStatus === null ? (
                  <span className="text-gray-500">Checking...</span>
                ) : authStatus.authenticated ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-green-600 font-medium">Authenticated</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-600 font-medium">Not Authenticated</span>
                  </>
                )}
              </div>
            </div>

            {supabaseStatus && !supabaseStatus.connected && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Database Connection Error</p>
                    <p className="text-sm mt-1">{supabaseStatus.error}</p>
                  </div>
                </div>
              </div>
            )}

            {authStatus && !authStatus.authenticated && (
              <div className="p-3 bg-amber-50 text-amber-700 rounded-md">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Authentication Error</p>
                    <p className="text-sm mt-1">{authStatus.error || "Not signed in"}</p>
                  </div>
                </div>
              </div>
            )}

            {authStatus && authStatus.authenticated && (
              <div className="p-3 bg-green-50 text-green-700 rounded-md">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Signed in as:</p>
                    <p className="text-sm mt-1">{authStatus.user}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              onClick={checkConnection}
              disabled={isChecking}
              className="bg-vault-purple hover:bg-vault-purple/90"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
              {isChecking ? "Checking..." : "Check Connection"}
            </Button>

            <Button onClick={refreshAuth} disabled={isChecking || !authStatus?.authenticated} variant="outline">
              Refresh Auth Token
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Troubleshooting Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">If you're having connection issues:</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Check your internet connection</li>
                <li>Try refreshing the page</li>
                <li>Clear your browser cache</li>
                <li>Try signing out and signing back in</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-2">If you're seeing authentication errors:</h3>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Try refreshing your authentication token</li>
                <li>Sign out and sign back in</li>
                <li>Check if you're using the correct account</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/auth/signin">
              <Button variant="outline">Sign Out & In Again</Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-vault-purple hover:bg-vault-purple/90">Return to Dashboard</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
