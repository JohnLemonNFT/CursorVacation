"use client"

import { useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TripLoading() {
  const [isLongLoading, setIsLongLoading] = useState(false)
  const [loadingTime, setLoadingTime] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setLoadingTime(elapsed)

      if (elapsed > 15) {
        setIsLongLoading(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleManualRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-purple-50 dark:bg-gray-900">
      <div className="w-20 h-20 mb-6 text-vault-purple animate-pulse">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          <path d="M14.05 2a9 9 0 018 7.94" />
          <path d="M14.05 6A5 5 0 0120 10.94" />
          <path d="M14.05 10a1 1 0 011 .95" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-center text-vault-purple mb-2">Packing your trip details...</h1>

      <p className="text-gray-600 dark:text-gray-400 text-center mb-6">Hang tight, we're almost there!</p>

      {isLongLoading && (
        <div className="space-y-4 w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-sm text-center">
            <p className="mb-2">This is taking longer than expected ({loadingTime}s)</p>
            <Button onClick={handleManualRefresh} variant="outline" size="sm" className="mx-auto">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh page
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-vault-purple" />
      </div>
    </div>
  )
}
