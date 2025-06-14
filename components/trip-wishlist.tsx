"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Sparkles, Trash, Star, PartyPopper, Lightbulb, Landmark, CalendarHeart, Utensils, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

type WishlistItem = {
  id: string
  created_at: string
  title: string
  description: string | null
  is_completed: boolean
  created_by: string
  explore_item_id: string | null
  category: string
  profile: {
    full_name: string | null
    avatar_url: string | null
  }
}

type TripWishlistProps = {
  tripId: string
  userId: string
  personFilter: string | null
  members?: Array<{
    user_id: string
    profile: {
      full_name: string | null
      avatar_url: string | null
    } | null
  }>
  setPersonFilter?: (id: string | null) => void
}

// Fun wishlist messages
const WISHLIST_MESSAGES = [
  "Dream it, wish it, do it!",
  "The best adventures are the ones you plan together!",
  "Every great trip starts with a wishlist!",
  "What's on your vacation bucket list?",
  "Wishes are the first step to amazing memories!",
]

export function TripWishlist({ tripId, userId, personFilter, members = [], setPersonFilter }: TripWishlistProps) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newItemTitle, setNewItemTitle] = useState("")
  const [newItemDescription, setNewItemDescription] = useState("")
  const [newItemCategory, setNewItemCategory] = useState("Other")
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [randomMessage, setRandomMessage] = useState("")
  const [completedItemId, setCompletedItemId] = useState<string | null>(null)
  const [surpriseItemId, setSurpriseItemId] = useState<string | null>(null)
  const surpriseItemRef = useRef<HTMLDivElement>(null)

  const fetchWishlistItems = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from("wishlist_items")
        .select(`
          *,
          profile:profiles(full_name, avatar_url)
        `)
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching wishlist items:", error)
        return
      }

      setWishlistItems(data || [])
    } catch (error) {
      console.error("Error in fetchWishlistItems:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Set random message
    const randomIndex = Math.floor(Math.random() * WISHLIST_MESSAGES.length)
    setRandomMessage(WISHLIST_MESSAGES[randomIndex])

    fetchWishlistItems()

    // Listen for custom events from the explore component
    const handleWishlistItemAdded = (event: CustomEvent) => {
      const newItem = event.detail
      if (newItem && newItem.trip_id === tripId) {
        // Fetch the profile info for the new item
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", newItem.created_by)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              newItem.profile = profile
              setWishlistItems((prev) => [newItem, ...prev])
            }
          })
      }
    }

    window.addEventListener("wishlist-item-added", handleWishlistItemAdded as EventListener)

    // Set up real-time subscription
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
        (payload) => {
          // Handle different types of changes
          if (payload.eventType === "INSERT") {
            // Add new item to the list
            const newItem = payload.new as WishlistItem

            // Fetch the profile info for the new item
            supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", newItem.created_by)
              .single()
              .then(({ data: profile }) => {
                if (profile) {
                  newItem.profile = profile
                  setWishlistItems((prev) => [newItem, ...prev])
                }
              })
          } else if (payload.eventType === "UPDATE") {
            // Update existing item
            const updatedItem = payload.new as WishlistItem
            setWishlistItems((prev) =>
              prev.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item)),
            )
          } else if (payload.eventType === "DELETE") {
            // Remove deleted item
            const deletedItemId = payload.old.id
            setWishlistItems((prev) => prev.filter((item) => item.id !== deletedItemId))
          }
        },
      )
      .subscribe()

    return () => {
      window.removeEventListener("wishlist-item-added", handleWishlistItemAdded as EventListener)
      supabase.removeChannel(wishlistSubscription)
    }
  }, [tripId])

  // Scroll to surprise item when it's selected
  useEffect(() => {
    if (surpriseItemId && surpriseItemRef.current) {
      surpriseItemRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [surpriseItemId])

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return

    try {
      setIsAddingItem(true)

      // Create new item object for optimistic update
      const newItem: Partial<WishlistItem> = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        created_by: userId,
        title: newItemTitle,
        description: newItemDescription || null,
        is_completed: false,
        explore_item_id: null,
        category: newItemCategory,
        profile: {
          full_name: "You", // Temporary name until real data loads
          avatar_url: null,
        },
      }

      // Optimistically update UI
      setWishlistItems((prev) => [newItem as WishlistItem, ...prev])

      // Show confetti animation
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)

      // Reset form
      setNewItemTitle("")
      setNewItemDescription("")
      setNewItemCategory("Other")
      setShowAddForm(false)

      // Actually perform the insert
      const { error, data } = await supabase
        .from("wishlist_items")
        .insert({
          trip_id: tripId,
          created_by: userId,
          title: newItemTitle,
          description: newItemDescription || null,
          is_completed: false,
          explore_item_id: null,
          category: newItemCategory,
        })
        .select(`
        *,
        profile:profiles(full_name, avatar_url)
      `)
        .single()

      if (error) {
        console.error("Error adding wishlist item:", error)
        // Revert optimistic update on error
        setWishlistItems((prev) => prev.filter((item) => item.id !== newItem.id))
        return
      }

      // Update with the real data from the server
      setWishlistItems((prev) => prev.map((item) => (item.id === newItem.id ? data : item)))
    } catch (error) {
      console.error("Error in handleAddItem:", error)
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleToggleComplete = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistically update UI
      setWishlistItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_completed: !currentStatus } : item)),
      )

      if (!currentStatus) {
        // Item was just completed
        setCompletedItemId(id)
        setTimeout(() => setCompletedItemId(null), 2000)
      }

      // Perform the actual update
      const { error } = await supabase.from("wishlist_items").update({ is_completed: !currentStatus }).eq("id", id)

      if (error) {
        console.error("Error updating wishlist item:", error)
        // Revert optimistic update on error
        setWishlistItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, is_completed: currentStatus } : item)),
        )
      }
    } catch (error) {
      console.error("Error in handleToggleComplete:", error)
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      // Optimistically update UI
      const itemToDelete = wishlistItems.find((item) => item.id === id)
      setWishlistItems((prev) => prev.filter((item) => item.id !== id))

      // Perform the actual delete
      const { error } = await supabase.from("wishlist_items").delete().eq("id", id)

      if (error) {
        console.error("Error deleting wishlist item:", error)
        // Revert optimistic update on error
        if (itemToDelete) {
          setWishlistItems((prev) => [...prev, itemToDelete])
        }
      }
    } catch (error) {
      console.error("Error in handleDeleteItem:", error)
    }
  }

  const handleSurpriseMe = () => {
    // Clear any previous selection
    setSurpriseItemId(null)

    // Get all incomplete wishlist items
    const incompleteItems = wishlistItems.filter((item) => !item.is_completed)

    if (incompleteItems.length === 0) {
      // No incomplete items to choose from
      return
    }

    // Select a random incomplete item
    const randomIndex = Math.floor(Math.random() * incompleteItems.length)
    const selectedItem = incompleteItems[randomIndex]

    // Highlight the selected item
    setSurpriseItemId(selectedItem.id)

    // Clear the highlight after 5 seconds
    setTimeout(() => {
      setSurpriseItemId(null)
    }, 5000)
  }

  // Group filteredWishlistItems by category
  const grouped = wishlistItems.filter(item => {
    if (personFilter) {
      return item.created_by === personFilter
    }
    return true
  }).reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, WishlistItem[]>)

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  function getInitials(name: string | null) {
    if (!name) return "?"
    const parts = name.trim().split(" ")
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <div className="space-y-6 relative">
      {/* Person filter buttons */}
      {members.length > 0 && setPersonFilter && (
        <div className="mb-4 max-w-xs">
          <Select value={personFilter || "all"} onValueChange={val => setPersonFilter(val === "all" ? null : val)}>
            <SelectTrigger className="w-full bg-white/80 dark:bg-gray-800/80 border-vault-purple/30 focus:border-vault-purple focus:ring-vault-purple">
              <SelectValue placeholder="Filter by person" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {members.map(member => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profile?.full_name || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {/* Confetti animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="absolute top-1/4 left-1/4 animate-float-confetti">
            <PartyPopper className="h-8 w-8 text-vault-purple" />
          </div>
          <div className="absolute top-1/3 right-1/3 animate-float-confetti-slow">
            <PartyPopper className="h-6 w-6 text-vault-orange" />
          </div>
          <div className="absolute bottom-1/3 left-1/3 animate-float-confetti-reverse">
            <PartyPopper className="h-10 w-10 text-vault-yellow" />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-vault-purple to-vault-orange">
            Wishlist
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">{randomMessage}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-yellow/30 hover:bg-vault-yellow/10 transition-all duration-300 transform hover:scale-105"
            onClick={handleSurpriseMe}
            disabled={wishlistItems.filter((item) => !item.is_completed).length === 0}
          >
            <Sparkles className="h-4 w-4 text-vault-yellow" />
            <span>Surprise Me</span>
          </Button>
          <Button
            className="bg-gradient-to-r from-vault-purple to-vault-purple/90 hover:opacity-90 transition-all duration-300 transform hover:scale-105 text-white"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="animate-slide-down border border-white/40 shadow-lg overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/5 via-white/5 to-vault-orange/5 opacity-50"></div>
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-vault-yellow" />
              Add Wishlist Item
            </CardTitle>
            <CardDescription>Add an activity or place you'd like to visit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="space-y-2">
              <Input
                placeholder="Activity title"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-purple/30 focus:border-vault-purple focus:ring-vault-purple"
              />
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Description (optional)"
                value={newItemDescription}
                onChange={(e) => setNewItemDescription(e.target.value)}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-purple/30 focus:border-vault-purple focus:ring-vault-purple min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <Select
                value={newItemCategory}
                onValueChange={setNewItemCategory}
              >
                <SelectTrigger className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-purple/30 focus:border-vault-purple focus:ring-vault-purple">
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
          </CardContent>
          <CardFooter className="flex justify-between relative z-10">
            <Button
              variant="outline"
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
              onClick={() => {
                setShowAddForm(false)
                setNewItemTitle("")
                setNewItemDescription("")
                setNewItemCategory("Other")
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-vault-purple to-vault-purple/90 hover:opacity-90 transition-all duration-300 text-white"
              onClick={handleAddItem}
              disabled={!newItemTitle.trim() || isAddingItem}
            >
              {isAddingItem ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span> Adding...
                </span>
              ) : (
                <span className="flex items-center">
                  <Plus className="h-4 w-4 mr-2" /> Add to Wishlist
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border border-white/40 shadow-md">
              <CardHeader className="pb-2">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : wishlistItems.length === 0 ? (
        <Card className="border border-white/40 shadow-md overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/5 via-white/5 to-vault-orange/5 opacity-50"></div>
          <CardContent className="flex flex-col items-center justify-center py-8 relative z-10">
            <div className="mb-4 text-vault-purple">
              <Lightbulb className="h-12 w-12 animate-pulse" />
            </div>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
              Your wishlist is empty. Add activities you'd like to do on your trip!
            </p>
            <Button
              className="bg-gradient-to-r from-vault-purple to-vault-purple/90 hover:opacity-90 transition-all duration-300 transform hover:scale-105 text-white"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
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
                      <Card
                        key={item.id}
                        ref={item.id === surpriseItemId ? surpriseItemRef : null}
                        className={cn(
                          "animate-fade-in border border-white/40 shadow-md overflow-hidden relative transition-all duration-300",
                          item.is_completed ? "bg-gray-50/80 dark:bg-gray-800/50" : "hover:shadow-lg hover:scale-[1.01]",
                          completedItemId === item.id ? "ring-2 ring-green-500 ring-offset-2" : "",
                          surpriseItemId === item.id ? "ring-2 ring-vault-yellow ring-offset-2 animate-pulse" : "",
                          CATEGORY_CONFIG[catKey].border
                        )}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/5 via-white/5 to-vault-orange/5 opacity-50"></div>

                        {/* Celebration animation when completing an item */}
                        {completedItemId === item.id && (
                          <div className="absolute top-2 right-2 animate-ping">
                            <PartyPopper className="h-5 w-5 text-green-500" />
                          </div>
                        )}

                        {/* Surprise highlight */}
                        {surpriseItemId === item.id && (
                          <div className="absolute inset-0 border-4 border-vault-yellow rounded-lg z-10 pointer-events-none"></div>
                        )}

                        <CardHeader className="relative z-10">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={item.is_completed}
                                  onCheckedChange={() => handleToggleComplete(item.id, item.is_completed)}
                                  className="data-[state=checked]:bg-vault-purple data-[state=checked]:border-vault-purple"
                                />
                                <CardTitle
                                  className={cn(
                                    "transition-all duration-300",
                                    item.is_completed ? "line-through text-gray-500 dark:text-gray-400" : "",
                                    surpriseItemId === item.id ? "text-vault-yellow font-bold" : "",
                                  )}
                                >
                                  {item.title}
                                  {surpriseItemId === item.id && (
                                    <span className="ml-2 inline-flex items-center">
                                      <Sparkles className="h-4 w-4 text-vault-yellow animate-spin-slow" />
                                      <span className="text-vault-yellow text-sm ml-1">Let's do this!</span>
                                    </span>
                                  )}
                                </CardTitle>
                              </div>
                              <CardDescription>
                                Added by {item.profile?.full_name || "Unknown"} •{" "}
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                              </CardDescription>
                            </div>
                            {item.created_by === userId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-gray-500 hover:text-red-500 transition-colors duration-300"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        {item.description && (
                          <CardContent
                            className={cn(
                              "relative z-10 transition-all duration-300",
                              item.is_completed ? "text-gray-500 dark:text-gray-400" : "",
                            )}
                          >
                            {item.description}
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
