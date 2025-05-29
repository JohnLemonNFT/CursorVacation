"use client"

import { useState } from "react"
import { ArrowLeft, Share, Settings, MoreVertical } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type MobileHeaderProps = {
  title: string
  backHref: string
  inviteCode?: string
  showSettings?: boolean
  settingsHref?: string
  onShare?: () => void
}

export function MobileHeader({
  title,
  backHref,
  inviteCode,
  showSettings = false,
  settingsHref,
  onShare,
}: MobileHeaderProps) {
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleCopyInviteCode = () => {
    if (!inviteCode) return

    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (onShare) {
      onShare()
      return
    }

    if (!inviteCode) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my trip: ${title}`,
          text: `I've invited you to join my trip on VDH Vault. Use invite code: ${inviteCode}`,
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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-teal-500 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto py-3 px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link href={backHref}>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-white hover:bg-teal-600">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold truncate max-w-[200px] text-white">{title}</h1>
            </div>
            <div className="flex items-center gap-1">
              {inviteCode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-10 w-10 text-white hover:bg-teal-600"
                  onClick={handleShare}
                >
                  <Share className="h-5 w-5" />
                </Button>
              )}

              {showSettings && settingsHref ? (
                <Link href={settingsHref}>
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-white hover:bg-teal-600">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              ) : showSettings ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-white hover:bg-teal-600">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {inviteCode && (
                      <DropdownMenuItem onClick={handleShare}>
                        <Share className="h-4 w-4 mr-2" />
                        Share Trip
                      </DropdownMenuItem>
                    )}
                    {inviteCode && (
                      <DropdownMenuItem onClick={handleCopyInviteCode}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Invite Code
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer to account for fixed header */}
      <div className="h-[calc(56px+env(safe-area-inset-top))]"></div>

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
                <Input id="invite-code" value={inviteCode} readOnly className="font-mono" />
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
