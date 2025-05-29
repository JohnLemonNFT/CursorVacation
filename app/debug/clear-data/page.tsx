"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { clearLocalStorageCache } from "@/app/actions/clear-cache"
import { supabase } from "@/lib/supabase"

export default function ClearDataPage() {
  const [isClearing, setIsClearing] = useState(false)
  const [status, setStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

  const clearDatabase = async () => {
    setIsClearing(true)
    setStatus({ type: null, message: "Clearing database..." })

    try {
      // Execute the SQL script
      const { error } = await supabase.rpc('clear_all_data')
      
      if (error) throw error

      setStatus({
        type: "success",
        message: "Database cleared successfully"
      })
    } catch (error) {
      console.error("Error clearing database:", error)
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to clear database"
      })
    } finally {
      setIsClearing(false)
    }
  }

  const clearCache = async () => {
    setIsClearing(true)
    setStatus({ type: null, message: "Clearing local cache..." })

    try {
      const result = await clearLocalStorageCache()
      
      if (!result.success) throw new Error(result.message)

      setStatus({
        type: "success",
        message: `Cache cleared successfully (${result.clearedKeys} items removed)`
      })
    } catch (error) {
      console.error("Error clearing cache:", error)
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to clear cache"
      })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Clear Data</CardTitle>
          <CardDescription>
            Clear all data from the database and local cache. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-4">
            <Button
              variant="destructive"
              onClick={clearDatabase}
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing Database...
                </>
              ) : (
                "Clear Database"
              )}
            </Button>

            <Button
              variant="destructive"
              onClick={clearCache}
              disabled={isClearing}
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing Cache...
                </>
              ) : (
                "Clear Local Cache"
              )}
            </Button>
          </div>

          {status.type && (
            <div className={`p-4 rounded-md ${
              status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              <div className="flex items-start">
                {status.type === "success" ? (
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                )}
                <p>{status.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 