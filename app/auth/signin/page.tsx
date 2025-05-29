"use client"

import { CardFooter } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { FcGoogle } from "react-icons/fc"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export default function SignIn() {
  const { user, signInWithGoogle, isLoading: authLoading } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user && !authLoading) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  const handleSignIn = async () => {
    try {
      setError(null)
      setIsSigningIn(true)
      console.log("Starting Google sign-in process...")
      await signInWithGoogle()

      // We'll set a timeout to reset the signing in state if it takes too long
      // This prevents the button from staying disabled indefinitely
      setTimeout(() => {
        setIsSigningIn(false)
      }, 10000) // Reset after 10 seconds if no response
    } catch (error) {
      console.error("Error signing in:", error)
      setError("Failed to sign in with Google. Please try again.")
      toast({
        title: "Sign In Failed",
        description: "There was a problem signing in with Google. Please try again.",
        variant: "destructive",
      })
      setIsSigningIn(false)
    }
  }

  // This ensures the button isn't stuck in a disabled state
  useEffect(() => {
    return () => {
      setIsSigningIn(false)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-vault-purple to-vault-pink flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            V
          </div>
          <CardTitle className="text-2xl">Welcome to VDH Vault</CardTitle>
          <CardDescription>Sign in to start planning your family vacations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          <Button
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 hover:bg-gray-100 border"
            onClick={handleSignIn}
            disabled={isSigningIn}
          >
            <FcGoogle className="w-5 h-5" />
            <span>{isSigningIn ? "Signing in..." : "Sign in with Google"}</span>
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-vault-purple hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-vault-purple hover:underline">
              Privacy Policy
            </Link>
          </div>
          <div className="text-center">
            <Link href="/auth/join">
              <Button variant="link" className="text-vault-purple">
                Have an invite code? Join a trip
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
