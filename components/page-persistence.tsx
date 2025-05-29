"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function PagePersistence() {
  const pathname = usePathname()

  useEffect(() => {
    // Store the current path in sessionStorage
    if (pathname) {
      try {
        sessionStorage.setItem("lastPath", pathname)
        console.log("Stored current path:", pathname)
      } catch (e) {
        console.error("Failed to store path in sessionStorage:", e)
      }
    }

    // Handle page visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab is now visible")

        // Check if we need to restore the path
        try {
          const lastPath = sessionStorage.getItem("lastPath")
          if (lastPath && lastPath !== pathname) {
            console.log(`Current path: ${pathname}, Last path: ${lastPath}`)
          }
        } catch (e) {
          console.error("Failed to check last path:", e)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [pathname])

  // Handle beforeunload to detect page refreshes
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        sessionStorage.setItem("pageWasUnloaded", "true")
      } catch (e) {
        console.error("Failed to set unload flag:", e)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

  return null
}
