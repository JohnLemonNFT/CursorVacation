"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

type SimpleMemoryReminderProps = {
  tripId: string
  isActive: boolean
  onAddMemory: () => void
}

export function SimpleMemoryReminder({ tripId, isActive, onAddMemory }: SimpleMemoryReminderProps) {
  // If trip is not active, don't show anything
  if (!isActive) return null

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <Button
        variant="outline"
        size="icon"
        className="rounded-full shadow-lg bg-white dark:bg-gray-800 h-12 w-12 transition-all duration-300 hover:scale-110"
        onClick={onAddMemory}
      >
        <Bell className="h-5 w-5" />
      </Button>
    </div>
  )
}
