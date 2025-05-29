"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

export function MobileAppShell({ children }: { children: React.ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Check if running as installed PWA
    const checkStandalone = () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches
      const iosStandalone = (window.navigator as any).standalone === true
      setIsStandalone(standalone || iosStandalone)
    }

    checkStandalone()

    // Add class to body for PWA-specific styling
    if (isStandalone) {
      document.body.classList.add("pwa-standalone")
    }

    return () => {
      document.body.classList.remove("pwa-standalone")
    }
  }, [isStandalone])

  // Add safe area padding for iOS devices
  useEffect(() => {
    const updateSafeArea = () => {
      const root = document.documentElement

      // Get safe area insets
      const safeAreaTop = getComputedStyle(root).getPropertyValue("--sat") || "0px"
      const safeAreaBottom = getComputedStyle(root).getPropertyValue("--sab") || "0px"
      const safeAreaLeft = getComputedStyle(root).getPropertyValue("--sal") || "0px"
      const safeAreaRight = getComputedStyle(root).getPropertyValue("--sar") || "0px"

      root.style.setProperty("--safe-area-top", safeAreaTop)
      root.style.setProperty("--safe-area-bottom", safeAreaBottom)
      root.style.setProperty("--safe-area-left", safeAreaLeft)
      root.style.setProperty("--safe-area-right", safeAreaRight)
    }

    updateSafeArea()
    window.addEventListener("resize", updateSafeArea)

    // Add viewport meta tag for iOS
    const meta = document.createElement("meta")
    meta.name = "viewport"
    meta.content = "width=device-width, initial-scale=1, viewport-fit=cover"
    document.getElementsByTagName("head")[0].appendChild(meta)

    return () => {
      window.removeEventListener("resize", updateSafeArea)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* iOS Status Bar Spacer for PWA */}
      {isStandalone && <div className="h-[env(safe-area-inset-top)] bg-vault-purple" />}

      <div className="flex-1 pb-[env(safe-area-inset-bottom)]">{children}</div>
    </div>
  )
}
