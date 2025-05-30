"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Smartphone, X, Share, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Platform = "ios" | "android" | "desktop" | "unknown"

export function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [platform, setPlatform] = useState<Platform>("unknown")

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches
    const iosStandalone = (window.navigator as any).standalone === true
    setIsStandalone(standalone || iosStandalone)

    // Detect platform
    const detectPlatform = (): Platform => {
      const userAgent = navigator.userAgent.toLowerCase()
      if (/iphone|ipad|ipod/.test(userAgent)) {
        return "ios"
      }
      if (/android/.test(userAgent)) {
        return "android"
      }
      if (!/mobile|tablet/.test(userAgent)) {
        return "desktop"
      }
      return "unknown"
    }

    const detectedPlatform = detectPlatform()
    setPlatform(detectedPlatform)

    // Only show on mobile devices that haven't installed
    const isMobile = /mobile|tablet/i.test(navigator.userAgent)

    if (isMobile && !isStandalone) {
      try {
        const bannerDismissed = localStorage.getItem("install-banner-dismissed")
        if (!bannerDismissed) {
          setTimeout(() => setShowBanner(true), 1000)
        }
      } catch (e) {
        setTimeout(() => setShowBanner(true), 1000)
      }
    }
  }, [isStandalone])

  const handleDismiss = () => {
    setShowBanner(false)
    try {
      localStorage.setItem("install-banner-dismissed", "true")
    } catch (e) {
      console.log("Storage not available")
    }
  }

  const handleBannerClick = () => {
    setShowInstructions(true)
  }

  if (!showBanner || isStandalone) return null

  return (
    <>
      <div 
        className="bg-gradient-to-r from-vault-purple to-vault-pink text-white p-3 animate-slide-down cursor-pointer hover:opacity-90 transition-opacity"
        onClick={handleBannerClick}
      >
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">Tap to install VDH Vault for the best experience</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={(e) => {
            e.stopPropagation()
            handleDismiss()
          }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Installation Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Install VDH Vault</DialogTitle>
            <DialogDescription>Follow these steps to add VDH Vault to your home screen</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {platform === "ios" ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-vault-purple/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-vault-purple">1</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Tap the share button</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Share className="h-4 w-4" />
                      <span>At the bottom of Safari</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-vault-purple/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-vault-purple">2</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Scroll down and tap</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Plus className="h-4 w-4" />
                      <span>"Add to Home Screen"</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-vault-purple/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-vault-purple">3</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Tap "Add"</p>
                    <p className="text-xs text-gray-500">VDH Vault will appear on your home screen</p>
                  </div>
                </div>
              </>
            ) : platform === "android" ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-vault-purple/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-vault-purple">1</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Tap the menu button</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Three dots in the top right</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-vault-purple/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-vault-purple">2</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Select "Add to Home screen"</p>
                    <p className="text-xs text-gray-500">Or "Install app" depending on your browser</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-vault-purple/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-vault-purple">3</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Confirm installation</p>
                    <p className="text-xs text-gray-500">VDH Vault will be added to your home screen</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">Please use a mobile device to install the app.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowInstructions(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
