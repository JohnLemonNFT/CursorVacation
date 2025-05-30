"use client"

import { useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"

export function AuthErrorHandler() {
  const { toast } = useToast()

  useEffect(() => {
    // Create a special error handler for storage access errors
    const handleStorageError = (event: ErrorEvent) => {
      // Only handle storage access errors
      if (
        event.message?.includes("Access to storage is not allowed") ||
        event.error?.message?.includes("Access to storage is not allowed")
      ) {
        // Prevent the error from appearing in the console
        event.preventDefault()

        // Log a more helpful message
        console.log("Note: Storage access errors from Google Auth are expected and won't affect functionality.")

        return true
      }
      return false
    }

    // Add the error handler
    window.addEventListener("error", handleStorageError)

    // Add unhandled promise rejection handler
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes("Access to storage is not allowed") ||
        String(event.reason).includes("Access to storage is not allowed")
      ) {
        // Prevent the error from appearing in the console
        event.preventDefault()

        // Log a more helpful message
        console.log("Note: Storage access errors from Google Auth are expected and won't affect functionality.")

        return true
      }
      return false
    }

    window.addEventListener("unhandledrejection", handleRejection)

    return () => {
      window.removeEventListener("error", handleStorageError)
      window.removeEventListener("unhandledrejection", handleRejection)
    }
  }, [toast])

  return null
}
