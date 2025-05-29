"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Calendar, Compass } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

type ExploreItem = {
  id: string
  created_at: string
  title: string
  description: string
  date: string | null
  url: string | null
  image_url: string | null
  is_curated: boolean
  added_to_wishlist?: boolean
}

type WishlistItem = {
  id: string
  trip_id: string
  title: string
  description: string | null
  is_completed: boolean
  created_by: string
  explore_item_id?: string
}

type TripExploreProps = {
  tripId: string
  destination: string
  startDate: Date
  endDate: Date
  isAdmin: boolean
  userId: string
}

export function TripExplore({ tripId, destination, startDate, endDate, isAdmin, userId }: TripExploreProps) {
  const [exploreItems, setExploreItems] = useState<ExploreItem[]>([])
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isAddingToWishlist, setIsAddingToWishlist] = useState<string | null>(null)
  const { toast } = useToast()
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    date: "",
    url: "",
    image_url: "",
  })

  useEffect(() => {
    const fetchExploreItems = async () => {
      try {
        setIsLoading(true)

        // Fetch explore items
        const { data, error } = await supabase
          .from("explore_items")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching explore items:", error)
          return
        }

        // Fetch wishlist items to check which explore items have been added
        const { data: wishlistData, error: wishlistError } = await supabase
          .from("wishlist_items")
          .select("id, title, description, is_completed, created_by, explore_item_id")
          .eq("trip_id", tripId)

        if (wishlistError) {
          console.error("Error fetching wishlist items:", wishlistError)
        }

        setWishlistItems(wishlistData || [])

        // Mark items that have already been added to wishlist
        const itemsWithWishlistStatus =
          data?.map((item) => ({
            ...item,
            added_to_wishlist: wishlistData?.some((wishlistItem) => wishlistItem.explore_item_id === item.id) || false,
          })) || []

        setExploreItems(itemsWithWishlistStatus)
      } catch (error) {
        console.error("Error in fetchExploreItems:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchExploreItems()

    // Set up real-time subscription for explore items
    const exploreSubscription = supabase
      .channel("explore-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "explore_items",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          fetchExploreItems()
        },
      )
      .subscribe()

    // Set up real-time subscription for wishlist items
    const wishlistSubscription = supabase
      .channel("wishlist-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wishlist_items",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          fetchExploreItems()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(exploreSubscription)
      supabase.removeChannel(wishlistSubscription)
    }
  }, [tripId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewItem((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddItem = async () => {
    if (!newItem.title.trim() || !newItem.description.trim()) return

    try {
      setIsAddingItem(true)

      // Create the item data without the category field
      const itemData = {
        trip_id: tripId,
        title: newItem.title,
        description: newItem.description,
        date: newItem.date || null,
        url: newItem.url || null,
        image_url: newItem.image_url || null,
        is_curated: true,
      }

      // Add the item to the database
      const { data, error } = await supabase.from("explore_items").insert(itemData).select()

      if (error) {
        console.error("Error adding explore item:", error)
        toast({
          title: "Error",
          description: "Failed to add activity",
          variant: "destructive",
        })
        return
      }

      // Update local state with the new item
      if (data && data.length > 0) {
        setExploreItems((prev) => [
          {
            ...data[0],
            added_to_wishlist: false,
          },
          ...prev,
        ])
      }

      setNewItem({
        title: "",
        description: "",
        date: "",
        url: "",
        image_url: "",
      })

      toast({
        title: "Success",
        description: "Activity added successfully",
      })
    } catch (error) {
      console.error("Error in handleAddItem:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      // Optimistically update UI
      setExploreItems((prev) => prev.filter((item) => item.id !== id))

      const { error } = await supabase.from("explore_items").delete().eq("id", id)

      if (error) {
        console.error("Error deleting explore item:", error)
        toast({
          title: "Error",
          description: "Failed to delete activity",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Success",
        description: "Activity deleted successfully",
      })
    } catch (error) {
      console.error("Error in handleDeleteItem:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleAddToWishlist = async (item: ExploreItem) => {
    try {
      setIsAddingToWishlist(item.id)

      // Optimistically update UI
      setExploreItems((prevItems) =>
        prevItems.map((prevItem) => (prevItem.id === item.id ? { ...prevItem, added_to_wishlist: true } : prevItem)),
      )

      // Create the new wishlist item
      const newWishlistItem = {
        trip_id: tripId,
        created_by: userId,
        title: item.title,
        description: item.description,
        is_completed: false,
        explore_item_id: item.id,
      }

      // Add to wishlist with explore_item_id
      const { error, data } = await supabase.from("wishlist_items").insert(newWishlistItem).select()

      if (error) {
        console.error("Error adding to wishlist:", error)

        // Revert optimistic update on error
        setExploreItems((prevItems) =>
          prevItems.map((prevItem) => (prevItem.id === item.id ? { ...prevItem, added_to_wishlist: false } : prevItem)),
        )

        toast({
          title: "Error",
          description: "Failed to add item to wishlist",
          variant: "destructive",
        })
        return
      }

      // Dispatch a custom event to notify the wishlist component
      if (data && data.length > 0) {
        const event = new CustomEvent("wishlist-item-added", { detail: data[0] })
        window.dispatchEvent(event)
      }

      toast({
        title: "Added to Wishlist",
        description: `"${item.title}" has been added to your wishlist`,
      })
    } catch (error) {
      console.error("Error in handleAddToWishlist:", error)

      // Revert optimistic update on error
      setExploreItems((prevItems) =>
        prevItems.map((prevItem) => (prevItem.id === item.id ? { ...prevItem, added_to_wishlist: false } : prevItem)),
      )

      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsAddingToWishlist(null)
    }
  }

  return (
    <div className="pb-20">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-2xl font-bold text-center text-vault-purple mb-2">{destination}</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          Handpicked suggestions by your trip planner.
        </p>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="w-full bg-vault-purple hover:bg-vault-purple/90 flex items-center justify-center gap-2 text-white"
              onClick={() => {
                setNewItem({
                  title: "",
                  description: "",
                  date: "",
                  url: "",
                  image_url: "",
                })
              }}
            >
              <Plus className="h-5 w-5" />
              Add Suggestion
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-vault-purple">
                <Plus className="h-6 w-6" />
                Add Custom Suggestion
              </DialogTitle>
              <DialogDescription>
                Add your own discovery or idea to the trip's "Explore" section for the family.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Suggestion Name</label>
                <Input
                  name="title"
                  placeholder="E.g., Secret Waterfall Hike, Best Pizza Place"
                  value={newItem.title}
                  onChange={handleInputChange}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <Textarea
                  name="description"
                  placeholder="Tell everyone why this is a great idea..."
                  value={newItem.description}
                  onChange={handleInputChange}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date (Optional)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    name="date"
                    type="date"
                    placeholder="Pick a date"
                    value={newItem.date}
                    onChange={handleInputChange}
                    min={format(startDate, "yyyy-MM-dd")}
                    max={format(endDate, "yyyy-MM-dd")}
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-6">
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-xl">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  className="bg-teal-500 hover:bg-teal-600 rounded-xl flex items-center justify-center gap-2 text-white"
                  onClick={handleAddItem}
                  disabled={!newItem.title.trim() || !newItem.description.trim() || isAddingItem}
                >
                  {isAddingItem ? (
                    "Adding..."
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Add Suggestion
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      ) : exploreItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 text-center">
          <div className="mb-4 p-6 rounded-full bg-gray-100 dark:bg-gray-800 inline-block">
            <Compass className="h-12 w-12 text-vault-purple" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">No activities have been added for {destination} yet.</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-vault-purple hover:bg-vault-purple/90 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add First Suggestion
              </Button>
            </DialogTrigger>
            {/* Dialog content is the same as above */}
          </Dialog>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              <Compass className="h-6 w-6 text-teal-500" />
              <h3 className="text-xl font-semibold text-teal-600">Trip Suggestions</h3>
            </div>

            <div className="space-y-4">
              {exploreItems.map((item) => (
                <Card key={item.id} className="overflow-hidden rounded-xl shadow-sm border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Compass className="h-5 w-5 text-teal-500" />
                        <h4 className="text-lg font-semibold">{item.title}</h4>
                      </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-4">{item.description}</p>

                    {item.date && (
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(item.date), "MMM d, yyyy")}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="w-full border-teal-500 text-teal-600 hover:bg-teal-50 rounded-full flex items-center justify-center gap-2"
                      onClick={() => handleAddToWishlist(item)}
                      disabled={isAddingToWishlist === item.id || item.added_to_wishlist}
                    >
                      {isAddingToWishlist === item.id ? (
                        "Adding..."
                      ) : item.added_to_wishlist ? (
                        "Added to Wishlist"
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Add to Wishlist
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-sm text-purple-600 mt-12 mb-4">
        Vandy Vault © 2025. Cherish your Vandy adventures, together.
      </div>
    </div>
  )
}
