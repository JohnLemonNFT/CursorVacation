"use client"

import { useEffect, useState } from "react"
import { RefreshCw, CheckCircle, AlertTriangle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

type SyncStatus = "idle" | "syncing" | "success" | "error" | "pending"

interface SyncIndicatorProps {
  className?: string
  status?: SyncStatus
  lastSynced?: Date | null
  error?: string | null
  onRetry?: () => void
}

export function SyncIndicator({
  className,
  status = "idle",
  lastSynced = null,
  error = null,
  onRetry,
}: SyncIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>("")

  // Update the time ago text
  useEffect(() => {
    if (!lastSynced) return

    const updateTimeAgo = () => {
      const now = new Date()
      const diffMs = now.getTime() - lastSynced.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHour = Math.floor(diffMin / 60)

      if (diffSec < 10) {
        setTimeAgo("just now")
      } else if (diffSec < 60) {
        setTimeAgo(`${diffSec}s ago`)
      } else if (diffMin < 60) {
        setTimeAgo(`${diffMin}m ago`)
      } else {
        setTimeAgo(`${diffHour}h ago`)
      }
    }

    // Update immediately
    updateTimeAgo()

    // Then update every 10 seconds
    const interval = setInterval(updateTimeAgo, 10000)
    return () => clearInterval(interval)
  }, [lastSynced])

  return (
    <div className={cn("flex items-center text-xs gap-1.5", className)}>
      {status === "syncing" && (
        <>
          <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
          <span className="text-blue-700">Syncing...</span>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-green-700">
            {lastSynced ? (
              <>
                Synced <span className="text-green-600">{timeAgo}</span>
              </>
            ) : (
              "Synced"
            )}
          </span>
        </>
      )}

      {status === "error" && (
        <>
          <AlertTriangle className="h-3 w-3 text-red-500" />
          <span className="text-red-700">{error || "Sync failed"}</span>
          {onRetry && (
            <button onClick={onRetry} className="text-blue-600 hover:text-blue-800 hover:underline ml-1 font-medium">
              Retry
            </button>
          )}
        </>
      )}

      {status === "pending" && (
        <>
          <Clock className="h-3 w-3 text-amber-500" />
          <span className="text-amber-700">Changes pending...</span>
        </>
      )}

      {status === "idle" && lastSynced && (
        <>
          <CheckCircle className="h-3 w-3 text-gray-400" />
          <span className="text-gray-500">
            Last synced <span className="text-gray-600">{timeAgo}</span>
          </span>
        </>
      )}
    </div>
  )
}
