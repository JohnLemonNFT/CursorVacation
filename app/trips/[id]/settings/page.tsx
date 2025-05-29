"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"

type Trip = {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  invite_code: string
  shared_album_url: string | null
  created_by: string
}

export default function TripSettings() {
  const { user, isLoading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string
  const { toast } = useToast()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoadingTrip, setIsLoadingTrip] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [formData, setFormData] = useState({
    name: "",
    destination: "",
    sharedAlbumUrl: "",
  })
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchTripDetails = async () => {
      if (!user || !tripId) return

      try {
        setIsLoadingTrip(true)
        console.log("Fetching trip details for settings page:", tripId)

        // Get trip details
        const { data: tripData, error: tripError } = await supabase.from("trips").select("*").eq("id", tripId).single()

        if (tripError) {
          console.error("Error fetching trip:", tripError)
          setError("Trip not found")
          setIsLoadingTrip(false)
          return
        }

        // Check if user is the creator
        if (tripData.created_by !== user.id) {
          setError("You don't have permission to edit this trip")
          setIsLoadingTrip(false)
          router.push(`/trips/${tripId}`)
          return
        }

        console.log("Trip data loaded:", tripData)
        setTrip(tripData)
        setFormData({
          name: tripData.name,
          destination: tripData.destination,
          sharedAlbumUrl: tripData.shared_album_url || "",
        })
        setStartDate(new Date(tripData.start_date))
        setEndDate(new Date(tripData.end_date))

        setIsLoadingTrip(false)
      } catch (error) {
        console.error("Error in fetchTripDetails:", error)
        setError("An unexpected error occurred")
        setIsLoadingTrip(false)
      }
    }

    if (user && tripId) {
      fetchTripDetails()
    }
  }, [user, tripId, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveTrip = async () => {
    if (!user || !trip) return

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
      setIsSaving(true)
      setError("")

      console.log("Updating trip with data:", {
        name: formData.name,
        destination: formData.destination,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        shared_album_url: formData.sharedAlbumUrl || null,
      })

      // Update trip
      const { error: updateError } = await supabase
        .from("trips")
        .update({
          name: formData.name,
          destination: formData.destination,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          shared_album_url: formData.sharedAlbumUrl || null,
        })
        .eq("id", tripId)

      if (updateError) {
        console.error("Error updating trip:", updateError)
        setError("Failed to update trip. Please try again.")
        setIsSaving(false)
        return
      }

      console.log("Trip updated successfully")

      // Clear any cached trip data
      try {
        // Clear any localStorage cache for this trip
        localStorage.removeItem(`trip-${tripId}-data`)
      } catch (e) {
        console.error("Error clearing cached trip data:", e)
      }

      toast({
        title: "Trip Updated",
        description: "Your trip has been updated successfully",
      })

      // Force a refresh of the page data
      router.refresh()

      // Redirect to trip page
      router.push(`/trips/${tripId}`)
    } catch (error) {
      console.error("Error in handleSaveTrip:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || isLoadingTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-vault-purple">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view this page</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/auth/signin" className="w-full">
              <Button className="w-full bg-vault-purple hover:bg-vault-purple/90">Sign In</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (error === "Trip not found" || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || "Trip not found"}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/dashboard" className="w-full">
              <Button className="w-full">Back to Dashboard</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href={`/trips/${tripId}`}>
            <Button variant="ghost" className="flex items-center gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Trip
            </Button>
          </Link>
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl">Trip Settings</CardTitle>
            <CardDescription>Edit your trip details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Trip Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Summer Vacation 2023"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                name="destination"
                placeholder="Orlando, Florida"
                value={formData.destination}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
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
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
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
              <Label htmlFor="sharedAlbumUrl">Shared Album Link (Optional)</Label>
              <Input
                id="sharedAlbumUrl"
                name="sharedAlbumUrl"
                placeholder="Google Photos or Apple Photos shared album link"
                value={formData.sharedAlbumUrl}
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                <span className="text-amber-500">💡</span>
                <span>Add a Google Photos or Apple Photos shared album link. You can update this anytime.</span>
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              className="w-full sm:w-auto bg-vault-purple hover:bg-vault-purple/90"
              onClick={handleSaveTrip}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Link href={`/trips/${tripId}`} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
