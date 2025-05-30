"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Calendar, ImageIcon, Trash, X, Camera, Sparkles, Heart } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format, eachDayOfInterval } from "date-fns"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { MemoryReminder } from "./memory-reminder"
// Remove the MemoryStreak import
// import { MemoryStreak } from "./memory-streak"

type Memory = {
  id: string
  created_at: string
  content: string
  date: string
  media_urls: string[] | null
  created_by: string
  profile: {
    full_name: string | null
    avatar_url: string | null
  }
}

type TripMemoriesProps = {
  tripId: string
  userId: string
  startDate: Date
  endDate: Date
}

// Fun memory prompts
const MEMORY_PROMPTS = [
  "What was the funniest moment today?",
  "What surprised you the most?",
  "What's something new you tried?",
  "What was your favorite meal?",
  "What's something you learned today?",
  "What's a moment you want to remember forever?",
  "What made you laugh today?",
  "What was the best view you saw?",
  "Who did you meet that was interesting?",
  "What's something you want to do again?",
  "What was challenging today?",
  "What made this day special?",
]

export function TripMemories({ tripId, userId, startDate, endDate }: TripMemoriesProps) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isAddingMemory, setIsAddingMemory] = useState(false)
  const [newMemory, setNewMemory] = useState({
    content: "",
    date: format(new Date(), "yyyy-MM-dd"),
    media_urls: [] as string[],
  })
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [randomPrompt, setRandomPrompt] = useState("")
  const [showHeartAnimation, setShowHeartAnimation] = useState(false)

  // Set a random memory prompt
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MEMORY_PROMPTS.length)
    setRandomPrompt(MEMORY_PROMPTS[randomIndex])
  }, [showAddForm])

  const fetchMemories = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from("memories")
        .select(`
          *,
          profile:profiles(full_name, avatar_url)
        `)
        .eq("trip_id", tripId)
        .order("date", { ascending: false })

      if (error) {
        console.error("Error fetching memories:", error)
        return
      }

      setMemories(data || [])
    } catch (error) {
      console.error("Error in fetchMemories:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMemories()

    // Set up real-time subscription
    const memoriesSubscription = supabase
      .channel("memories-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memories",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log("Memory change detected:", payload)
          fetchMemories()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(memoriesSubscription)
    }
  }, [tripId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewMemory((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setUploadedFiles((prev) => [...prev, ...filesArray])
    }
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddMemory = async () => {
    if (!newMemory.content.trim() || !newMemory.date) return

    try {
      setIsAddingMemory(true)

      // Upload files if any
      const mediaUrls: string[] = []

      if (uploadedFiles.length > 0) {
        setIsUploading(true)

        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i]
          const fileExt = file.name.split(".").pop()
          const fileName = `${tripId}/${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`

          const { data, error } = await supabase.storage.from("memories").upload(fileName, file)

          if (error) {
            console.error("Error uploading file:", error)
            continue
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("memories").getPublicUrl(fileName)

          mediaUrls.push(publicUrl)

          // Update progress
          setUploadProgress(Math.round(((i + 1) / uploadedFiles.length) * 100))
        }

        setIsUploading(false)
        setUploadProgress(0)
      }

      // Add memory with media URLs
      const { data: newMemoryData, error } = await supabase
        .from("memories")
        .insert({
          trip_id: tripId,
          created_by: userId,
          content: newMemory.content,
          date: newMemory.date,
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        })
        .select(`
        *,
        profile:profiles(full_name, avatar_url)
      `)
        .single()

      if (error) {
        console.error("Error adding memory:", error)
        return
      }

      // Immediately update the local state with the new memory
      if (newMemoryData) {
        setMemories((prevMemories) => [newMemoryData, ...prevMemories])
      }

      // Reset form
      setNewMemory({
        content: "",
        date: format(new Date(), "yyyy-MM-dd"),
        media_urls: [],
      })
      setUploadedFiles([])
      setShowAddForm(false)

      // Show heart animation
      setShowHeartAnimation(true)
      setTimeout(() => setShowHeartAnimation(false), 2000)
    } catch (error) {
      console.error("Error in handleAddMemory:", error)
    } finally {
      setIsAddingMemory(false)
    }
  }

  const handleDeleteMemory = async (id: string) => {
    try {
      const { error } = await supabase.from("memories").delete().eq("id", id)

      if (error) {
        console.error("Error deleting memory:", error)
      } else {
        // Immediately update local state
        setMemories((prevMemories) => prevMemories.filter((memory) => memory.id !== id))
      }
    } catch (error) {
      console.error("Error in handleDeleteMemory:", error)
    }
  }

  const handleSelectPrompt = (prompt: string) => {
    setNewMemory((prev) => ({
      ...prev,
      content: prompt + "\n\n",
    }))
    setShowAddForm(true)
  }

  // Group memories by date
  const groupedMemories: { [key: string]: Memory[] } = {}
  memories.forEach((memory) => {
    const date = memory.date
    if (!groupedMemories[date]) {
      groupedMemories[date] = []
    }
    groupedMemories[date].push(memory)
  })

  // Get all days in the trip
  const allDays = eachDayOfInterval({ start: startDate, end: endDate })

  return (
    <div className="space-y-6 relative pb-[calc(120px+env(safe-area-inset-bottom))]">
      {/* Memory Reminder */}
      <MemoryReminder tripId={tripId} userId={userId} startDate={startDate} endDate={endDate} isActive={true} />

      {/* Heart animation */}
      {showHeartAnimation && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <Heart className="h-20 w-20 text-red-500 animate-pulse-grow" />
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <Button
        className="fixed right-6 z-50 rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-vault-purple to-vault-purple/90 hover:opacity-90 transition-all duration-300 transform hover:scale-105 md:hidden bottom-[calc(72px+env(safe-area-inset-bottom))]"
        onClick={() => setShowAddForm(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-vault-purple to-vault-orange">
            Memories
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Capture the moments that make this trip special
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-vault-purple to-vault-purple/90 hover:opacity-90 transition-all duration-300 transform hover:scale-105"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Post Memory
        </Button>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-vault-purple to-vault-orange">
          Memories
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Capture the moments that make this trip special
        </p>
      </div>

      {/* Add Memory Form */}
      {showAddForm && (
        <Card className="animate-slide-down border border-white/40 shadow-lg overflow-hidden relative fixed inset-0 z-50 md:relative md:inset-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/5 via-white/5 to-vault-orange/5 opacity-50"></div>
          <CardHeader className="relative z-10">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2 text-vault-orange" />
                Post a Memory
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddForm(false)}
                className="md:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <CardDescription>Share a special moment from your trip</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-purple/30 hover:bg-vault-purple/10 transition-all duration-300",
                      !newMemory.date && "text-muted-foreground",
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4 text-vault-purple" />
                    {newMemory.date ? format(new Date(newMemory.date), "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-4">
                    <Input
                      type="date"
                      name="date"
                      value={newMemory.date}
                      onChange={handleInputChange}
                      min={format(startDate, "yyyy-MM-dd")}
                      max={format(endDate, "yyyy-MM-dd")}
                      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-purple/30 focus:border-vault-purple focus:ring-vault-purple"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>What happened today?</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-vault-purple flex items-center gap-1"
                  onClick={() => {
                    const randomIndex = Math.floor(Math.random() * MEMORY_PROMPTS.length)
                    setRandomPrompt(MEMORY_PROMPTS[randomIndex])
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  New prompt
                </Button>
              </div>
              <div className="bg-vault-purple/10 p-3 rounded-md mb-2 text-sm italic text-vault-purple">
                <span className="font-medium">Memory prompt:</span> {randomPrompt}
              </div>
              <Textarea
                name="content"
                placeholder="Share your experience..."
                value={newMemory.content}
                onChange={handleInputChange}
                className="min-h-[120px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-purple/30 focus:border-vault-purple focus:ring-vault-purple"
              />
            </div>
            <div className="space-y-2">
              <Label>Photos (optional)</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-vault-orange/30 hover:bg-vault-orange/10 transition-all duration-300"
                >
                  <ImageIcon className="h-4 w-4 mr-2 text-vault-orange" />
                  Add Photos
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                  multiple
                />
              </div>
              {uploadedFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file) || "/placeholder.svg"}
                        alt={`Preview ${index}`}
                        className="w-full h-24 object-cover rounded-md shadow-md transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {isUploading && (
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-vault-purple to-vault-orange h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-center text-gray-500">Uploading photos: {uploadProgress}%</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between relative z-10">
            <Button
              variant="outline"
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
              onClick={() => {
                setShowAddForm(false)
                setNewMemory({
                  content: "",
                  date: format(new Date(), "yyyy-MM-dd"),
                  media_urls: [],
                })
                setUploadedFiles([])
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-vault-purple to-vault-purple/90 hover:opacity-90 transition-all duration-300"
              onClick={handleAddMemory}
              disabled={!newMemory.content.trim() || isAddingMemory || isUploading}
            >
              {isAddingMemory ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span> Posting...
                </span>
              ) : (
                <span className="flex items-center">
                  <Camera className="h-4 w-4 mr-2" /> Post Memory
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Memories Timeline */}
      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
              <div className="grid grid-cols-1 gap-4">
                <Card className="border border-white/40 shadow-md">
                  <CardHeader className="pb-2">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      ) : memories.length === 0 ? (
        <Card className="border border-white/40 shadow-md overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/5 via-white/5 to-vault-orange/5 opacity-50"></div>
          <CardContent className="flex flex-col items-center justify-center py-8 relative z-10">
            <div className="mb-4 text-vault-orange">
              <Camera className="h-12 w-12 animate-pulse" />
            </div>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
              No memories posted yet. Start capturing your trip moments!
            </p>
            <Button
              className="bg-gradient-to-r from-vault-purple to-vault-purple/90 hover:opacity-90 transition-all duration-300 transform hover:scale-105"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Post First Memory
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedMemories)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map((date, dateIndex) => (
              <div key={date} className="animate-fade-in" style={{ animationDelay: `${dateIndex * 0.1}s` }}>
                {/* Sticky Date Header */}
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 rounded-lg shadow-sm mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-vault-orange" />
                    {format(new Date(date), "EEEE, MMMM d, yyyy")}
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {groupedMemories[date].map((memory, memoryIndex) => (
                    <Card
                      key={memory.id}
                      className="memory-card animate-fade-in border border-white/40 shadow-md overflow-hidden relative transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
                      style={{ animationDelay: `${dateIndex * 0.1 + memoryIndex * 0.05}s` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/5 via-white/5 to-vault-orange/5 opacity-50"></div>
                      <CardHeader className="pb-2 relative z-10">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {memory.profile.avatar_url ? (
                              <img
                                src={memory.profile.avatar_url || "/placeholder.svg"}
                                alt={memory.profile.full_name || "User"}
                                className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vault-purple to-vault-orange flex items-center justify-center text-white shadow-md">
                                {memory.profile.full_name?.[0] || "U"}
                              </div>
                            )}
                            <div>
                              <CardTitle className="text-lg">{memory.profile.full_name || "Unknown"}</CardTitle>
                              <CardDescription>{format(new Date(memory.created_at), "h:mm a")}</CardDescription>
                            </div>
                          </div>
                          {memory.created_by === userId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteMemory(memory.id)}
                              className="text-gray-500 hover:text-red-500 transition-colors duration-300"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <p className="whitespace-pre-line mb-4">{memory.content}</p>
                        {memory.media_urls && memory.media_urls.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                            {memory.media_urls.map((url, i) => (
                              <div
                                key={i}
                                className="polaroid transform transition-all duration-300 hover:rotate-1 hover:scale-105"
                              >
                                <div className="relative">
                                  <div className="tape tape-top-right"></div>
                                  <img
                                    src={url || "/placeholder.svg"}
                                    alt={`Memory ${i}`}
                                    className="w-full h-auto rounded-sm shadow-md"
                                    loading="lazy"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
