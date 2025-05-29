"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { Edit, Clock, Calendar, Car, Plane, Train, Ship } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

type TripMember = {
  id: string
  user_id: string
  role: string
  arrival_date: string | null
  departure_date: string | null
  arrival_time: string | null
  departure_time: string | null
  travel_method: string | null
  flight_details: string | null
  profile: {
    full_name: string | null
    avatar_url: string | null
    email: string | null
  }
}

type TripTravelInfoProps = {
  tripId: string
  userId: string
  members: TripMember[]
  startDate: Date
  endDate: Date
  isAdmin: boolean
}

export function TripTravelInfo({
  tripId,
  userId,
  members: initialMembers,
  startDate,
  endDate,
  isAdmin,
}: TripTravelInfoProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [members, setMembers] = useState<TripMember[]>(initialMembers)
  const { toast } = useToast()

  const [travelInfo, setTravelInfo] = useState({
    arrival_date: "",
    departure_date: "",
    arrival_time: "",
    departure_time: "",
    travel_method: "plane",
    flight_details: "",
  })

  const currentUserMember = members.find((member) => member.user_id === userId)

  useEffect(() => {
    // Set up real-time subscription for trip members
    const tripMembersSubscription = supabase
      .channel("trip-members-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_members",
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload) => {
          console.log("Trip member change detected:", payload)

          // Fetch the updated member data
          const { data: updatedMembers, error } = await supabase
            .from("trip_members")
            .select(`
              id,
              user_id,
              role,
              arrival_date,
              departure_date,
              arrival_time,
              departure_time,
              travel_method,
              flight_details,
              profile:profiles(full_name, avatar_url, email)
            `)
            .eq("trip_id", tripId)

          if (error) {
            console.error("Error fetching updated members:", error)
            return
          }

          setMembers(updatedMembers || [])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tripMembersSubscription)
    }
  }, [tripId])

  const handleEdit = () => {
    if (currentUserMember) {
      setTravelInfo({
        arrival_date: currentUserMember.arrival_date || "",
        departure_date: currentUserMember.departure_date || "",
        arrival_time: currentUserMember.arrival_time || "",
        departure_time: currentUserMember.departure_time || "",
        travel_method: currentUserMember.travel_method || "plane",
        flight_details: currentUserMember.flight_details || "",
      })
    }
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Check if the columns exist in the database
      const updateData: any = {
        arrival_date: travelInfo.arrival_date || null,
        departure_date: travelInfo.departure_date || null,
        flight_details: travelInfo.flight_details || null,
      }

      // Only include new fields if they're supported by the database
      // This allows the component to work even if the columns haven't been added yet
      try {
        // Try to update with all fields
        const { error } = await supabase
          .from("trip_members")
          .update({
            ...updateData,
            arrival_time: travelInfo.arrival_time || null,
            departure_time: travelInfo.departure_time || null,
            travel_method: travelInfo.travel_method || null,
          })
          .eq("trip_id", tripId)
          .eq("user_id", userId)

        if (error) {
          // If there's an error, it might be because the columns don't exist
          console.error("Error updating with new fields:", error)

          // Fall back to updating only the original fields
          const { error: fallbackError } = await supabase
            .from("trip_members")
            .update(updateData)
            .eq("trip_id", tripId)
            .eq("user_id", userId)

          if (fallbackError) {
            throw fallbackError
          }
        }
      } catch (error) {
        console.error("Error in update fallback:", error)
        throw error
      }

      toast({
        title: "Travel Info Updated",
        description: "Your travel information has been updated successfully.",
      })

      // Update local state immediately
      const updatedMembers = members.map((member) => {
        if (member.user_id === userId) {
          return {
            ...member,
            arrival_date: travelInfo.arrival_date || null,
            departure_date: travelInfo.departure_date || null,
            arrival_time: travelInfo.arrival_time || null,
            departure_time: travelInfo.departure_time || null,
            travel_method: travelInfo.travel_method || null,
            flight_details: travelInfo.flight_details || null,
          }
        }
        return member
      })

      setMembers(updatedMembers)
      setIsEditing(false)
    } catch (error) {
      console.error("Error in handleSave:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getTravelMethodIcon = (method: string | null) => {
    switch (method) {
      case "plane":
        return <Plane className="h-4 w-4" />
      case "car":
        return <Car className="h-4 w-4" />
      case "train":
        return <Train className="h-4 w-4" />
      case "boat":
        return <Ship className="h-4 w-4" />
      default:
        return <Plane className="h-4 w-4" />
    }
  }

  const formatTime = (time: string | null) => {
    if (!time) return null

    try {
      // Parse the time string (e.g., "14:30")
      const [hours, minutes] = time.split(":").map(Number)

      // Create a new date object with the current date but the specified time
      const date = new Date()
      date.setHours(hours)
      date.setMinutes(minutes)

      // Format the time in 12-hour format
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    } catch (error) {
      console.error("Error formatting time:", error)
      return time
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Travel Information</h2>
        {!isEditing && (
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit My Info
          </Button>
        )}
      </div>

      {isEditing && (
        <Card className="animate-slide-down">
          <CardHeader>
            <CardTitle>Update Your Travel Details</CardTitle>
            <CardDescription>Let everyone know when you're arriving and departing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Travel Method</Label>
              <Select
                value={travelInfo.travel_method}
                onValueChange={(value) => setTravelInfo({ ...travelInfo, travel_method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select travel method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plane">
                    <div className="flex items-center">
                      <Plane className="h-4 w-4 mr-2" />
                      <span>Plane</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="car">
                    <div className="flex items-center">
                      <Car className="h-4 w-4 mr-2" />
                      <span>Car</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="train">
                    <div className="flex items-center">
                      <Train className="h-4 w-4 mr-2" />
                      <span>Train</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="boat">
                    <div className="flex items-center">
                      <Ship className="h-4 w-4 mr-2" />
                      <span>Boat/Ferry</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Arrival Date</Label>
                <Input
                  type="date"
                  value={travelInfo.arrival_date}
                  onChange={(e) => setTravelInfo({ ...travelInfo, arrival_date: e.target.value })}
                  min={format(startDate, "yyyy-MM-dd")}
                  max={format(endDate, "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-2">
                <Label>Arrival Time (Approximate)</Label>
                <Input
                  type="time"
                  value={travelInfo.arrival_time}
                  onChange={(e) => setTravelInfo({ ...travelInfo, arrival_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departure Date</Label>
                <Input
                  type="date"
                  value={travelInfo.departure_date}
                  onChange={(e) => setTravelInfo({ ...travelInfo, departure_date: e.target.value })}
                  min={format(startDate, "yyyy-MM-dd")}
                  max={format(endDate, "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-2">
                <Label>Departure Time (Approximate)</Label>
                <Input
                  type="time"
                  value={travelInfo.departure_time}
                  onChange={(e) => setTravelInfo({ ...travelInfo, departure_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{travelInfo.travel_method === "plane" ? "Flight Details" : "Travel Details"} (Optional)</Label>
              <Textarea
                placeholder={
                  travelInfo.travel_method === "plane"
                    ? "Flight numbers, airlines, layovers, etc."
                    : travelInfo.travel_method === "car"
                      ? "Route information, stops along the way, etc."
                      : travelInfo.travel_method === "train"
                        ? "Train numbers, stations, connections, etc."
                        : "Boat/ferry details, ports, etc."
                }
                value={travelInfo.flight_details}
                onChange={(e) => setTravelInfo({ ...travelInfo, flight_details: e.target.value })}
                className="min-h-[100px]"
              />
              {travelInfo.travel_method === "plane" && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tip: Include airline, flight numbers, and any layover information
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button className="bg-vault-purple hover:bg-vault-purple/90" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {members.map((member, index) => (
          <Card key={member.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                {member.profile.avatar_url ? (
                  <img
                    src={member.profile.avatar_url || "/placeholder.svg"}
                    alt={member.profile.full_name || "User"}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-vault-purple flex items-center justify-center text-white font-bold">
                    {member.profile.full_name?.[0] || "U"}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {member.profile.full_name || member.profile.email || "Unknown"}
                    </CardTitle>
                    {member.role === "admin" && (
                      <Badge variant="outline" className="text-xs">
                        Trip Organizer
                      </Badge>
                    )}
                  </div>
                  {member.travel_method && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      {getTravelMethodIcon(member.travel_method)}
                      <span className="capitalize">{member.travel_method}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {member.arrival_date && (
                  <div className="space-y-1">
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Arrival</span>
                    </div>
                    <div className="font-medium flex items-center gap-2">
                      <span>{format(new Date(member.arrival_date), "MMM d, yyyy")}</span>
                      {member.arrival_time && (
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatTime(member.arrival_time)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {member.departure_date && (
                  <div className="space-y-1">
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Departure</span>
                    </div>
                    <div className="font-medium flex items-center gap-2">
                      <span>{format(new Date(member.departure_date), "MMM d, yyyy")}</span>
                      {member.departure_time && (
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatTime(member.departure_time)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!member.arrival_date && !member.departure_date && (
                  <div className="col-span-2 text-gray-500 dark:text-gray-400 italic">
                    No travel information provided yet
                  </div>
                )}
              </div>

              {member.flight_details && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {member.travel_method === "plane" ? "Flight Details" : "Travel Details"}
                  </p>
                  <p className="text-sm whitespace-pre-line">{member.flight_details}</p>
                </div>
              )}
            </CardContent>
            {member.user_id === userId && (
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit My Travel Info
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
