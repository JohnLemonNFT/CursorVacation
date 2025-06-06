"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Camera, X, Sparkles, User, LogOut, ImageIcon, Upload } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
}

export default function ProfilePage() {
  const { user, signOut, isLoading } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    avatarUrl: "",
  })

  useEffect(() => {
    const fetchOrCreateProfile = async () => {
      if (!user) return
      setIsLoadingProfile(true)
      try {
        let { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .eq("id", user.id)
          .single()

        if (error && error.code === "PGRST116") {
          // No profile found, create one without Google avatar
          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email || "",
            avatar_url: null,
            email: user.email,
          })
          if (insertError) {
            console.error("Error creating profile:", insertError)
            setIsLoadingProfile(false)
            return
          }
          // Refetch profile
          const { data: newData, error: newError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, email")
            .eq("id", user.id)
            .single()
          if (newError) {
            setIsLoadingProfile(false)
            return
          }
          setProfile(newData)
          setFormData({
            fullName: newData.full_name || "",
            avatarUrl: newData.avatar_url || "",
          })
        } else if (data) {
          setProfile(data)
          setFormData({
            fullName: data.full_name || "",
            avatarUrl: data.avatar_url || "",
          })
        }
      } catch (error) {
        console.error("Error in fetchOrCreateProfile:", error)
      } finally {
        setIsLoadingProfile(false)
      }
    }
    if (user) {
      fetchOrCreateProfile()
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveProfile = async () => {
    if (!user) return

    try {
      setIsSaving(true)

      console.log("Updating profile with payload:", {
        full_name: formData.fullName,
        avatar_url: formData.avatarUrl,
      })
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          avatar_url: formData.avatarUrl,
        })
        .eq("id", user.id)
      if (updateError) {
        console.error("Error updating profile:", updateError)
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        })
        return
      }

      // Re-fetch the updated profile from Supabase
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .eq("id", user.id)
        .single()
      console.log("Re-fetched profile after update:", updatedProfile)
      setProfile(updatedProfile)

      toast({
        title: "Profile Updated! 🎉",
        description: "Looking good! Your profile has been updated successfully",
      })

      // Update local state
      setProfile((prev) => {
        if (!prev) return null
        return {
          ...prev,
          full_name: formData.fullName,
          avatar_url: formData.avatarUrl,
        }
      })

    } catch (error) {
      console.error("Error in handleSaveProfile:", error)
    }
      setIsSaving(false)
    }

  const handleSignOut = async () => {
    await signOut()
  }

  if (isLoading || isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vault-purple/10 via-vault-pink/10 to-vault-yellow/10">
        <div className="text-center">
          <div className="animate-bounce mb-4">
            <User className="h-12 w-12 text-vault-purple mx-auto" />
          </div>
          <div className="animate-pulse text-vault-purple font-medium">Loading your profile...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-vault-purple/10 via-vault-pink/10 to-vault-yellow/10">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view your profile</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/auth/signin" className="w-full">
              <Button className="w-full bg-gradient-to-r from-vault-purple to-vault-pink hover:opacity-90">
                Sign In
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-6">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-vault-purple/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-vault-pink/20 rounded-full blur-3xl animate-float-delayed" />
      </div>

      <div className="container mx-auto max-w-md relative z-10">
        <div className="mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="flex items-center gap-2 -ml-2 hover:scale-105 transition-transform p-0">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card className="animate-fade-in border-0 shadow-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-md">
          <CardHeader className="text-center pb-2 px-4 sm:px-6">
            <div className="mb-2 relative inline-block mx-auto">
              <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-vault-yellow animate-pulse z-10" />
              <CardTitle className="text-2xl sm:text-3xl bg-gradient-to-r from-vault-purple to-vault-pink bg-clip-text text-transparent">
                Your Profile
              </CardTitle>
            </div>
            <CardDescription className="text-base">Make yourself look good for the family album!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4 px-4 sm:px-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gradient-to-r from-vault-purple to-vault-pink p-1 animate-shimmer">
                <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-vault-purple to-vault-pink text-white text-3xl font-bold">
                      {formData.fullName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <h3 className="text-xl font-bold">{formData.fullName || "Adventure Seeker"}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm truncate max-w-[250px] mx-auto">{user.email}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-vault-purple" />
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Your awesome name"
                value={formData.fullName}
                onChange={handleInputChange}
                className="h-10 text-base border focus:border-vault-purple transition-colors"
              />
              <p className="text-xs text-gray-500">This is how your family will see you</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avatarUrl" className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-vault-purple" />
                Profile Picture
              </Label>
              <Input
                id="avatarUrl"
                name="avatarUrl"
                placeholder="Enter URL for your profile picture"
                value={formData.avatarUrl}
                onChange={handleInputChange}
                className="h-10 text-base border focus:border-vault-purple transition-colors"
              />
              <p className="text-xs text-gray-500">Optional: Add a profile picture</p>
            </div>

            <div className="pt-2">
              <Button
                className="w-full bg-gradient-to-r from-vault-purple to-vault-pink hover:opacity-90 transition-all transform hover:scale-[1.02] shadow-md h-11 text-base text-white"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 px-4 sm:px-6 pt-0 pb-4">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
            <div className="w-full">
              <Button
                variant="outline"
                className="w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all h-10 text-sm"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Don't worry, we'll save your spot for next time! 👋
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
