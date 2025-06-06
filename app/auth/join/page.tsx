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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-vault-purple/10 to-vault-orange/10 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Join a Trip</CardTitle>
          <CardDescription>Enter your invite code to join a family trip.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleJoinTrip();
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                autoFocus
                autoComplete="off"
                maxLength={12}
                className="font-mono tracking-widest text-lg"
                disabled={isJoining || isSigningIn || authLoading}
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-vault-purple to-vault-orange hover:opacity-90"
              disabled={isJoining || isSigningIn || authLoading}
            >
              {isJoining ? "Joining..." : "Join Trip"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {!user && (
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={handleSignIn}
              disabled={isSigningIn || isJoining || authLoading}
            >
              <FcGoogle className="h-5 w-5" />
              {isSigningIn ? "Signing in..." : "Sign in with Google"}
            </Button>
          )}
          <div className="text-xs text-gray-500 mt-2 text-center">
            Don't have an invite code? <Link href="/dashboard" className="text-vault-purple underline">Go to Dashboard</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
