"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react"
import { checkConnection, attemptReconnect, type ConnectionState } from "@/lib/data-manager"
import { cn } from "@/lib/utils"

interface ConnectionStatusProps {
  className?: string
  showDetails?: boolean
  onStatusChange?: (status: ConnectionState) => void
}

export function ConnectionStatus({ className, showDetails = false, onStatusChange }: ConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionState>({ status: "unknown", lastChecked: 0 })
  const [isChecking, setIsChecking] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    // Check connection on mount
    checkConnectionStatus()

    // Check connection status periodically
    const interval = setInterval(checkConnectionStatus, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const checkConnectionStatus = async () => {
    const result = await checkConnection()
    setStatus(result)

    if (onStatusChange) {
      onStatusChange(result)
    }
  }

  const handleCheckConnection = async () => {
    setIsChecking(true)
    await checkConnectionStatus()
    setIsChecking(false)
  }

  const handleReconnect = async () => {
    setIsReconnecting(true)
    const success = await attemptReconnect()

    if (success) {
      await checkConnectionStatus()
    }

    setIsReconnecting(false)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {status.status === "connected" ? (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1.5 px-2 py-1"
        >
          <Wifi className="h-3.5 w-3.5" />
          <span>Connected</span>
          {showDetails && (
            <span className="text-xs text-green-600 ml-1">
              {Math.floor((Date.now() - status.lastChecked) / 1000)}s ago
            </span>
          )}
        </Badge>
      ) : status.status === "disconnected" ? (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1.5 px-2 py-1">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Disconnected</span>
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1.5 px-2 py-1"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Checking...</span>
        </Badge>
      )}

      {showDetails && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckConnection}
            disabled={isChecking}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", isChecking && "animate-spin")} />
            Check
          </Button>

          {status.status === "disconnected" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="h-7 px-2 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isReconnecting && "animate-spin")} />
              Reconnect
            </Button>
          )}
        </div>
      )}

      {showDetails && status.error && (
        <div className="mt-1 text-xs text-red-600 flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{status.error}</span>
        </div>
      )}
    </div>
  )
}
