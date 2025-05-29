"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Sparkles, MapPin, Camera, Plane, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

export default function CreateTrip() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    destination: "",
    sharedAlbumUrl: "",
  })

  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const generateInviteCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleCreateTrip = async () => {
    if (!user) return

    // Validate form
    if (!formData.name.trim()) {
      setError("Trip name is required")
      return
    }

    if (!formData.destination.trim()) {
      setError("Destination is required")
      return
    }

    if (!startDate) {
      setError("Start date is required")
      return
    }

    if (!endDate) {
      setError("End date is required")
      return
    }

    if (startDate > endDate) {
      setError("End date must be after start date")
      return
    }

    try {
      setIsCreating(true)
      setError("")

      const inviteCode = generateInviteCode()

      // Create trip
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert({
          name: formData.name,
          destination: formData.destination,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          invite_code: inviteCode,
          shared_album_url: formData.sharedAlbumUrl || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (tripError) {
        console.error("Error creating trip:", tripError)
        setError("Failed to create trip. Please try again.")
        setIsCreating(false)
        return
      }

      // Add creator as a member
      const { error: memberError } = await supabase.from("trip_members").insert({
        trip_id: trip.id,
        user_id: user.id,
        role: "admin",
      })

      if (memberError) {
        console.error("Error adding member:", memberError)
        toast({
          title: "Warning",
          description: "Trip created but there was an issue adding you as a member. Please try refreshing.",
          variant: "destructive",
        })
      }

      // Redirect to trip page
      router.push(`/trips/${trip.id}?tab=travel`)
    } catch (error) {
      console.error("Error in handleCreateTrip:", error)
      setError("An unexpected error occurred. Please try again.")
      setIsCreating(false)
    } finally {
      // Ensure we reset the creating state even if there's an error
      // This prevents the button from being stuck in loading state
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vault-purple/10 via-vault-pink/10 to-vault-yellow/10">
        <div className="text-center">
          <div className="animate-bounce mb-4">
            <Plane className="h-12 w-12 text-vault-purple mx-auto" />
          </div>
          <div className="animate-pulse text-vault-purple font-medium">Loading...</div>
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
            <CardDescription>Please sign in to create a trip</CardDescription>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-vault-purple/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-vault-pink/20 rounded-full blur-3xl animate-float-delayed" />
        <Plane className="absolute top-20 right-10 h-8 w-8 text-vault-purple/10 transform rotate-45 animate-float" />
        <MapPin className="absolute bottom-20 left-10 h-8 w-8 text-vault-pink/10 animate-float-delayed" />
      </div>

      <div className="container mx-auto max-w-2xl relative z-10">
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" className="flex items-center gap-2 -ml-2 hover:scale-105 transition-transform">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card className="animate-fade-in border-0 shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-md">
          <CardHeader className="text-center pb-2">
            <div className="mb-4 relative inline-block mx-auto">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-vault-purple to-vault-pink flex items-center justify-center animate-shimmer">
                <Plane className="h-10 w-10 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-vault-yellow animate-pulse" />
            </div>
            <CardTitle className="text-3xl bg-gradient-to-r from-vault-purple to-vault-pink bg-clip-text text-transparent">
              Plan Your Adventure
            </CardTitle>
            <CardDescription className="text-lg">Where will your family's next story begin?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-vault-purple" />
                Trip Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Summer Vacation 2024"
                value={formData.name}
                onChange={handleInputChange}
                className="h-12 text-base border-2 focus:border-vault-purple transition-colors"
              />
              <p className="text-xs text-gray-500">Make it memorable!</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination" className="text-base font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-vault-pink" />
                Destination
              </Label>
              <Input
                id="destination"
                name="destination"
                placeholder="Orlando, Florida"
                value={formData.destination}
                onChange={handleInputChange}
                className="h-12 text-base border-2 focus:border-vault-pink transition-colors"
              />
              <p className="text-xs text-gray-500">Where dreams come true</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-vault-orange" />
                  Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal border-2 hover:border-vault-orange transition-colors",
                        !startDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-vault-yellow" />
                  End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal border-2 hover:border-vault-yellow transition-colors",
                        !endDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => (startDate ? date < startDate : false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sharedAlbumUrl" className="text-base font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-vault-green" />
                Shared Album Link
                <Badge variant="outline" className="ml-2">
                  Optional
                </Badge>
              </Label>
              <Input
                id="sharedAlbumUrl"
                name="sharedAlbumUrl"
                placeholder="Google Photos or Apple Photos shared album link"
                value={formData.sharedAlbumUrl}
                onChange={handleInputChange}
                className="h-12 text-base border-2 focus:border-vault-green transition-colors"
              />
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <span className="text-vault-green mt-0.5">💡</span>
                <p>
                  Keep all your memories in one place. Don't worry, you can always add or update this later in trip
                  settings.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm flex items-center gap-2 animate-shake">
                <span className="text-lg">😅</span>
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              className="w-full sm:w-auto bg-gradient-to-r from-vault-purple to-vault-pink hover:opacity-90 transition-all transform hover:scale-105 shadow-lg h-12 text-base text-white"
              onClick={handleCreateTrip}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Creating Magic...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Adventure
                </>
              )}
            </Button>
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full h-12 text-base hover:scale-105 transition-transform">
                Cancel
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400 animate-fade-in">
          <p className="mb-2">Pro tip: The best trips include:</p>
          <div className="flex justify-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <span className="text-lg">🍕</span> Good food
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">😂</span> Lots of laughs
            </span>
            <span className="flex items-center gap-1">
              <span className="text-lg">📸</span> Too many photos
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
