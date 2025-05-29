"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { FcGoogle } from "react-icons/fc"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

export default function JoinTrip() {
  const { user, signInWithGoogle, isLoading: authLoading } = useAuth()
  const [inviteCode, setInviteCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleJoinTrip = async () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code")
      return
    }

    if (!user) {
      // Save invite code to localStorage and trigger sign in
      localStorage.setItem("pendingInviteCode", inviteCode)
      await handleSignIn()
      return
    }

    try {
      setIsJoining(true)
      setError("")

      // Check if trip exists with this invite code
      const { data: trips, error: tripError } = await supabase
        .from("trips")
        .select("id")
        .eq("invite_code", inviteCode)
        .single()

      if (tripError || !trips) {
        setError("Invalid invite code. Please check and try again.")
        setIsJoining(false)
        return
      }

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await supabase
        .from("trip_members")
        .select("id")
        .eq("trip_id", trips.id)
        .eq("user_id", user.id)
        .single()

      if (existingMember) {
        // User is already a member, just redirect
        router.push(`/trips/${trips.id}`)
        return
      }

      // Add user as a member
      const { error: joinError } = await supabase.from("trip_members").insert({
        trip_id: trips.id,
        user_id: user.id,
        role: "member",
      })

      if (joinError) {
        setError("Failed to join trip. Please try again.")
        setIsJoining(false)
        return
      }

      // Redirect to trip page
      router.push(`/trips/${trips.id}`)
    } catch (error) {
      console.error("Error joining trip:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsJoining(false)
    }
  }

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true)
      setError("")
      await signInWithGoogle()

      // We'll set a timeout to reset the signing in state if it takes too long
      setTimeout(() => {
        setIsSigningIn(false)
      }, 10000) // Reset after 10 seconds if no response
    } catch (error) {
      console.error("Error signing in:", error)
      setError("Failed to sign in with Google. Please try again.")
      setIsSigningIn(false)
    }
  }

  // This ensures the button isn't stuck in a disabled state
  useEffect(() => {
    return () => {
      setIsSigningIn(false)
      setIsJoining(false)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-vault-purple to-vault-pink flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            V
          </div>
          <CardTitle className="text-2xl">Join a Family Trip</CardTitle>
          <CardDescription>Enter your invite code to join a vacation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="Enter invite code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <Button
            className="w-full bg-vault-purple hover:bg-vault-purple/90"
            onClick={handleJoinTrip}
            disabled={isJoining || isSigningIn}
          >
            {isJoining ? "Joining..." : "Join Trip"}
          </Button>

          {!user && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or sign in first</span>
              </div>
            </div>
          )}

          {!user && (
            <Button
              className="w-full flex items-center justify-center gap-2 bg-white text-gray-800 hover:bg-gray-100 border"
              onClick={handleSignIn}
              disabled={isSigningIn}
            >
              <FcGoogle className="w-5 h-5" />
              <span>{isSigningIn ? "Signing in..." : "Sign in with Google"}</span>
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/auth/signin">
            <Button variant="link" className="text-vault-purple">
              Create your own trip
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
