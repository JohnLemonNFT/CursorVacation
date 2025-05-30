"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Calendar, Compass, Landmark, CalendarHeart, Utensils, Sparkles, Trash, Pencil } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  category?: string
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

// Helper for category config
const CATEGORY_CONFIG = {
  Attractions: {
    icon: <Landmark className="h-5 w-5 text-teal-500 mr-2" />, color: 'text-teal-600', border: 'border-teal-200',
  },
  Events: {
    icon: <CalendarHeart className="h-5 w-5 text-vault-purple mr-2" />, color: 'text-vault-purple', border: 'border-vault-purple/30',
  },
  Restaurants: {
    icon: <Utensils className="h-5 w-5 text-orange-500 mr-2" />, color: 'text-orange-600', border: 'border-orange-200',
  },
  Other: {
    icon: <Sparkles className="h-5 w-5 text-gray-400 mr-2" />, color: 'text-gray-500', border: 'border-gray-200',
  },
}

export function TripExplore({ tripId, destination, startDate, endDate, isAdmin, userId }: TripExploreProps) {
  console.log('TripExplore isAdmin:', isAdmin)
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
    category: "Other",
  })
  const [responses, setResponses] = useState<{ [suggestionId: string]: 'yes' | 'no' }>({})
  const [currentIndex, setCurrentIndex] = useState(0)

  // Filter out suggestions already added to the current user's wishlist
  const pendingSuggestions = exploreItems.filter(
    item => !wishlistItems.some(
      w => w.explore_item_id === item.id && w.created_by === userId
    )
  )

  // Group exploreItems by category
  const grouped = pendingSuggestions.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, ExploreItem[]>)

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

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
          .select("id, title, description, is_completed, created_by, explore_item_id, trip_id")
          .eq("trip_id", tripId)

        if (wishlistError) {
          console.error("Error fetching wishlist items:", wishlistError)
        }

        setWishlistItems((wishlistData || []).map((item) => ({
          ...item,
          trip_id: item.trip_id || tripId,
        })))

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

  useEffect(() => {
    // Fetch user responses
    const fetchResponses = async () => {
      const { data, error } = await supabase
        .from('suggestion_responses')
        .select('suggestion_id, response')
        .eq('user_id', userId)
        .eq('trip_id', tripId)
      if (!error && data) {
        const map: { [suggestionId: string]: 'yes' | 'no' } = {}
        data.forEach((r: any) => { map[r.suggestion_id] = r.response })
        setResponses(map)
      }
    }
    if (userId && tripId) fetchResponses()
  }, [userId, tripId])

  const currentSuggestion = pendingSuggestions[currentIndex] || null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewItem((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddItem = async () => {
    if (!newItem.title.trim() || !newItem.description.trim()) return

    try {
      setIsAddingItem(true)

      // Create the item data with the category field
      const itemData = {
        trip_id: tripId,
        title: newItem.title,
        description: newItem.description,
        date: newItem.date || null,
        url: newItem.url || null,
        image_url: newItem.image_url || null,
        is_curated: true,
        category: newItem.category,
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
        setExploreItems((prev) => [data[0], ...prev])
      }

      // Reset form
      setNewItem({
        title: "",
        description: "",
        date: "",
        url: "",
        image_url: "",
        category: "Other",
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
        category: item.category || "Other",
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

  const handleRespond = async (item: ExploreItem, response: 'yes' | 'no') => {
    // Optimistically update UI
    setResponses(prev => ({ ...prev, [item.id]: response }))
    setCurrentIndex(0) // Always show the next available

    // Record response in DB
    await supabase.from('suggestion_responses').upsert({
      trip_id: tripId,
      user_id: userId,
      suggestion_id: item.id,
      response,
    }, { onConflict: 'user_id,suggestion_id' })

    // If yes, add to wishlist
    if (response === 'yes') {
      await handleAddToWishlist(item)
    }
  }

  // Add state for editing
  const [editItem, setEditItem] = useState<ExploreItem | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', category: 'Other', date: '' })
  const [isEditing, setIsEditing] = useState(false)

  const openEditDialog = (item: ExploreItem) => {
    setEditItem(item)
    setEditForm({
      title: item.title,
      description: item.description,
      category: item.category || 'Other',
      date: item.date || '',
    })
    setIsEditing(true)
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditCategoryChange = (value: string) => {
    setEditForm((prev) => ({ ...prev, category: value }))
  }

  const handleEditSave = async () => {
    if (!editItem) return
    const updated = {
      title: editForm.title,
      description: editForm.description,
      category: editForm.category,
      date: editForm.date || null,
    }
    // Optimistically update UI
    setExploreItems((prev) => prev.map((item) => item.id === editItem.id ? { ...item, ...updated } : item))
    setIsEditing(false)
    setEditItem(null)
    // Update in DB
    await supabase.from('explore_items').update(updated).eq('id', editItem.id)
  }

  return (
    <div className="pb-20">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-2xl font-bold text-center text-vault-purple mb-2">{destination}</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          {isAdmin
            ? 'Handpicked suggestions by your trip planner.'
            : 'These are curated suggestions by your trip admin.'}
        </p>

        {isAdmin && (
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
                    category: "Other",
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <Select
                    value={newItem.category}
                    onValueChange={(value) => setNewItem((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(CATEGORY_CONFIG).map((category) => (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center">
                            {CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG].icon}
                            <span>{category}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      ) : pendingSuggestions.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 text-center">
          <div className="mb-4 p-6 rounded-full bg-gray-100 dark:bg-gray-800 inline-block">
            <Compass className="h-12 w-12 text-vault-purple" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">No more suggestions to review!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => {
            const catKey = (cat in CATEGORY_CONFIG ? cat : 'Other') as keyof typeof CATEGORY_CONFIG;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2 cursor-pointer select-none" onClick={() => toggleCollapse(cat)}>
                  {CATEGORY_CONFIG[catKey].icon}
                  <h3 className={`text-lg font-bold tracking-wide ${CATEGORY_CONFIG[catKey].color}`}>{cat === 'Other' ? 'Other Ideas' : cat}</h3>
                  <span className="ml-2 text-xs text-gray-400">({items.length})</span>
                  <span className="ml-auto text-xs text-gray-400">{collapsed[cat] ? 'Show' : 'Hide'}</span>
                </div>
                {!collapsed[cat] && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`relative bg-white rounded-xl shadow-md border-2 px-5 py-4 flex flex-col justify-between min-h-[120px] ${CATEGORY_CONFIG[catKey].border}`}
                        style={{ marginBottom: '12px' }}
                      >
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="font-bold text-lg text-vault-purple mb-1 truncate text-left">{item.title}</div>
                          {item.description && (
                            <div className="text-gray-600 text-left text-sm mb-1 line-clamp-2">{item.description}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-auto pt-2 text-left">Curated by your trip planner</div>
                        </div>
                        {isAdmin && (
                          <div className="absolute top-2 right-2 flex gap-1 z-20">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-400 hover:text-blue-600"
                                  aria-label="Edit suggestion"
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Pencil className="h-5 w-5" />
                                </Button>
                              </DialogTrigger>
                            </Dialog>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-gray-400 hover:text-red-600"
                                  aria-label="Delete suggestion"
                                >
                                  <Trash className="h-5 w-5" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-xs">
                                <DialogHeader>
                                  <DialogTitle>Delete Suggestion?</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to delete this suggestion? This cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-end gap-2 mt-4">
                                  <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </DialogClose>
                                  <DialogClose asChild>
                                    <Button variant="destructive" onClick={() => handleDeleteItem(item.id)}>
                                      Delete
                                    </Button>
                                  </DialogClose>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                        <button
                          className="mt-4 w-full py-2 rounded-full bg-gradient-to-r from-vault-purple to-vault-orange text-white font-semibold shadow hover:shadow-md hover:opacity-90 transition-all text-base"
                          onClick={() => handleAddToWishlist(item)}
                        >
                          + Add to Wishlist
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Global Edit Dialog */}
      {isEditing && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Suggestion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <Input
                  name="title"
                  value={editForm.title}
                  onChange={handleEditInputChange}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <Textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditInputChange}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <Select value={editForm.category} onValueChange={handleEditCategoryChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORY_CONFIG).map((category) => (
                      <SelectItem key={category} value={category}>
                        <div className="flex items-center">
                          {CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG].icon}
                          <span>{category}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date (Optional)</label>
                <Input
                  name="date"
                  type="date"
                  value={editForm.date}
                  onChange={handleEditInputChange}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleEditSave} className="bg-teal-500 text-white">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="text-center text-sm text-purple-600 mt-12 mb-4">
        Vandy Vault © 2025. Cherish your Vandy adventures, together.
      </div>
    </div>
  )
}
