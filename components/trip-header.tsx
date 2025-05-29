"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share, Copy, ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { User } from "@supabase/supabase-js"
import { MobileHeader } from "@/components/mobile-header"
import { useToast } from "@/components/ui/use-toast"

type TripHeaderProps = {
  trip: {
    id: string
    name: string
    invite_code: string
    created_by: string
  }
  user: User
}

export function TripHeader({ trip, user }: TripHeaderProps) {
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(trip.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my trip: ${trip.name}`,
          text: `I've invited you to join my trip on VDH Vault. Use invite code: ${trip.invite_code}`,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
        setShowShareDialog(true)
      }
    } else {
      setShowShareDialog(true)
    }
  }

  // Use the mobile header on small screens
  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden">
        <MobileHeader
          title={trip.name}
          backHref="/dashboard"
          inviteCode={trip.invite_code}
          showSettings={trip.created_by === user.id}
          settingsHref={`/trips/${trip.id}/settings`}
          onShare={handleShare}
        />
      </div>

      {/* Desktop header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm hidden md:block">
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold">{trip.name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share className="h-5 w-5" />
              </Button>
              {trip.created_by === user.id && (
                <Link href={`/trips/${trip.id}/settings`}>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Trip</DialogTitle>
            <DialogDescription>Share this invite code with family members to join your trip.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <div className="flex items-center gap-2">
                <Input id="invite-code" value={trip.invite_code} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyInviteCode}
                  className={copied ? "bg-green-100 dark:bg-green-900" : ""}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && <p className="text-sm text-green-600 dark:text-green-400">Copied to clipboard!</p>}
            </div>
            <div className="space-y-2">
              <Label>Share Link</Label>
              <div className="flex items-center gap-2">
                <Input value={window.location.href} readOnly />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
