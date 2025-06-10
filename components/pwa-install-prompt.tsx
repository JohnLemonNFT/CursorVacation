"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Download, Share, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Image from "next/image"

type Platform = "ios" | "android" | "desktop" | "unknown"

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [platform, setPlatform] = useState<Platform>("unknown")
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed as PWA
    const checkStandalone = () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches
      const iosStandalone = (window.navigator as any).standalone === true
      setIsStandalone(standalone || iosStandalone)
    }

    checkStandalone()

    // Detect platform
    const detectPlatform = (): Platform => {
      const userAgent = navigator.userAgent.toLowerCase()

      // iOS detection
      if (/iphone|ipad|ipod/.test(userAgent)) {
        return "ios"
      }

      // Android detection
      if (/android/.test(userAgent)) {
        return "android"
      }

      // Desktop
      if (!/mobile|tablet/.test(userAgent)) {
        return "desktop"
      }

      return "unknown"
    }

    const detectedPlatform = detectPlatform()
    setPlatform(detectedPlatform)

    // Don't show prompt if already installed
    if (isStandalone) {
      return
    }

    // Check if we should show the prompt
    try {
      const hasSeenPrompt = localStorage.getItem("pwa-prompt-seen")
      const lastPromptTime = localStorage.getItem("pwa-prompt-time")
      const now = Date.now()

      // Show prompt if never seen or if it's been more than 7 days
      if (!hasSeenPrompt || (lastPromptTime && now - Number.parseInt(lastPromptTime) > 7 * 24 * 60 * 60 * 1000)) {
        // For iOS, show immediately since there's no beforeinstallprompt event
        if (detectedPlatform === "ios") {
          setTimeout(() => setShowPrompt(true), 2000)
        }
      }
    } catch (error) {
      console.log("Storage not available")
    }

    // Handle Android/Desktop install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Show prompt after a delay
      setTimeout(() => setShowPrompt(true), 2000)
    }

    if (detectedPlatform === "android" || detectedPlatform === "desktop") {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }

    return () => {
      if (detectedPlatform === "android" || detectedPlatform === "desktop") {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      }
    }
  }, [isStandalone])

  const handleInstallClick = async () => {
    if (platform === "ios") {
      setShowInstructions(true)
      console.log("[PWA] Showing iOS install instructions dialog")
    } else if (deferredPrompt) {
      // Show the install prompt for Android/Desktop
      deferredPrompt.prompt()

      const { outcome } = await deferredPrompt.userChoice
      console.log(`User response to install prompt: ${outcome}`)

      setDeferredPrompt(null)
      setShowPrompt(false)
    }

    // Mark as seen
    try {
      localStorage.setItem("pwa-prompt-seen", "true")
      localStorage.setItem("pwa-prompt-time", Date.now().toString())
    } catch (error) {
      console.log("Storage not available")
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    try {
      localStorage.setItem("pwa-prompt-seen", "true")
      localStorage.setItem("pwa-prompt-time", Date.now().toString())
    } catch (error) {
      console.log("Storage not available")
    }
  }

  // Don't show anything if already installed
  if (isStandalone) return null

  // Mobile-optimized prompt
  if (showPrompt && (platform === "ios" || platform === "android")) {
    return (
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-slide-up">
        <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
                  <Image src="/icon-512x512.png" alt="VDH Vault App Icon" width={48} height={48} className="rounded-xl" />
                </div>
                <div>
                  <CardTitle className="text-lg">Add to Home Screen</CardTitle>
                  <CardDescription className="text-sm">Get the best experience with quick access</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="flex gap-2">
              <Button className="flex-1 bg-vault-purple hover:bg-vault-purple/90" onClick={handleInstallClick}>
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleDismiss}>
                Maybe Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Desktop prompt
  if (showPrompt && platform === "desktop") {
    return (
      <div className="fixed top-20 right-4 z-50 animate-slide-in-right max-w-sm">
        <Card className="bg-white dark:bg-gray-800 shadow-lg border-0">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base">Install VDH Vault</CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2" onClick={handleDismiss}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <CardDescription className="text-sm">Install the app for quick access and offline use</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <Button className="w-full bg-vault-purple hover:bg-vault-purple/90" onClick={handleInstallClick} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Install
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // iOS Installation Instructions Dialog
  if (showInstructions && platform === "ios") {
    return (
      <Dialog open={showInstructions} onOpenChange={() => {}} modal>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Install VDH Vault</DialogTitle>
            <DialogDescription>Follow these steps to add VDH Vault to your home screen</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowInstructions(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}
