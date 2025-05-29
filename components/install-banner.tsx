"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Smartphone, X } from "lucide-react"

export function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches
    const iosStandalone = (window.navigator as any).standalone === true
    setIsStandalone(standalone || iosStandalone)

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

  if (!showBanner || isStandalone) return null

  return (
    <div className="bg-gradient-to-r from-vault-purple to-vault-pink text-white p-3 animate-slide-down">
      <div className="container mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Smartphone className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">Install VDH Vault for the best experience</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
