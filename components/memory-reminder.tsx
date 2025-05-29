"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

type MemoryReminderProps = {
  tripId: string
  userId: string
  startDate: Date
  endDate: Date
  isActive: boolean
}

export function MemoryReminder({ tripId, userId, startDate, endDate, isActive }: MemoryReminderProps) {
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
          onClick={() => {
            // Find and click the "Post Memory" button
            setTimeout(() => {
              const postMemoryButton = Array.from(document.querySelectorAll("button")).find((button) =>
                button.textContent?.includes("Post Memory"),
              ) as HTMLElement
              if (postMemoryButton) postMemoryButton.click()
            }, 300)
          }}
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </>
  )
}
