"use client"

import { useState } from "react"
import { Bell, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

type SimpleMemoryReminderProps = {
  tripId: string
  isActive: boolean
  onAddMemory: () => void
}

export function SimpleMemoryReminder({ tripId, isActive, onAddMemory }: SimpleMemoryReminderProps) {
  const [showReminder, setShowReminder] = useState(false)

  // If trip is not active, don't show anything
  if (!isActive) return null

  return (
    <>
      {/* Floating reminder button */}
      <div className="fixed bottom-20 right-4 z-40">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg bg-white dark:bg-gray-800 h-12 w-12 transition-all duration-300 hover:scale-110"
          onClick={() => setShowReminder(true)}
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      {/* Daily reminder popup */}
      {showReminder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-600 to-orange-500"></div>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-5 w-5 mr-2 text-orange-500" />
                Time to Capture Today's Memories!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                The day is winding down - take a moment to journal your favorite moments from today's adventures!
              </p>

              <div className="bg-purple-600/10 p-3 rounded-md">
                <h4 className="text-sm font-medium text-purple-600">Today's Memory Prompts:</h4>
                <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                  <li>• What was your favorite moment today?</li>
                  <li>• Did anything unexpected happen?</li>
                  <li>• What made you laugh or smile?</li>
                  <li>• What was the best thing you ate?</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowReminder(false)}>
                Remind Me Later
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-purple-600 to-orange-500 hover:opacity-90"
                onClick={() => {
                  setShowReminder(false)
                  onAddMemory()
                }}
              >
                Add Memory Now
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  )
}
