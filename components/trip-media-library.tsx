"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExternalLink, Edit, Save, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

type TripMediaLibraryProps = {
  sharedAlbumUrl: string | null
  tripId: string
  isAdmin: boolean
}

export function TripMediaLibrary({ sharedAlbumUrl, tripId, isAdmin }: TripMediaLibraryProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [albumUrl, setAlbumUrl] = useState(sharedAlbumUrl || "")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Update local state when props change
  useEffect(() => {
    setAlbumUrl(sharedAlbumUrl || "")
  }, [sharedAlbumUrl])

  const handleSave = async () => {
    try {
      setIsSaving(true)

      console.log("Updating album URL:", albumUrl)

      const { error } = await supabase
        .from("trips")
        .update({ shared_album_url: albumUrl || null })
        .eq("id", tripId)

      if (error) {
        console.error("Error updating album URL:", error)
        toast({
          title: "Error",
          description: "Failed to update album URL. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Album Updated",
        description: "Your shared album link has been updated successfully",
      })

      // Force a refresh of the page data
      router.refresh()

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

  const handleCancel = () => {
    setAlbumUrl(sharedAlbumUrl || "")
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Media Library</h2>
        {isAdmin && !isEditing && (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Album Link
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shared Photo Album</CardTitle>
          <CardDescription>All trip photos and videos are stored in the shared album</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="album-url">Album URL</Label>
                <Input
                  id="album-url"
                  placeholder="Google Photos or Apple Photos shared album link"
                  value={albumUrl}
                  onChange={(e) => setAlbumUrl(e.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Paste the shared album link from Google Photos or Apple Photos
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="bg-vault-purple hover:bg-vault-purple/90" onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {sharedAlbumUrl ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Click the link below to view and add photos to the shared album:
                  </p>
                  <a
                    href={sharedAlbumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-vault-purple hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Shared Album
                  </a>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No shared album has been set up for this trip yet.
                  </p>
                  {isAdmin && (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      Add Album Link
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Use the Shared Album</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">For Google Photos:</h4>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>Open the shared album link</li>
              <li>Click "Join" to add yourself to the album</li>
              <li>Use the "+" button to add your photos</li>
              <li>All members can view and add photos</li>
            </ol>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">For Apple Photos:</h4>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>Open the shared album link on your iPhone/iPad</li>
              <li>Tap "Join" to subscribe to the album</li>
              <li>Add photos using the "+" button</li>
              <li>Enable "Public Website" for non-Apple users</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
