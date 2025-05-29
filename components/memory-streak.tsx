"use client"

import { useState, useEffect } from "react"
import { Flame, Trophy, Calendar, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { eachDayOfInterval, parseISO, isSameDay } from "date-fns"

type MemoryStreakProps = {
  tripId: string
  userId: string
  startDate: Date
  endDate: Date
}

export function MemoryStreak({ tripId, userId, startDate, endDate }: MemoryStreakProps) {
  const [streak, setStreak] = useState(0)
  const [totalDays, setTotalDays] = useState(0)
  const [journaledDays, setJournaledDays] = useState<Date[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMemories = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("memories")
          .select("date")
          .eq("trip_id", tripId)
          .eq("created_by", userId)

        if (error) {
          console.error("Error fetching memories:", error)
          return
        }

        // Convert string dates to Date objects
        const dates = data.map((item) => parseISO(item.date))
        setJournaledDays(dates)

        // Calculate total days in trip
        const allDays = eachDayOfInterval({ start: startDate, end: endDate })
        setTotalDays(allDays.length)

        // Calculate current streak
        let currentStreak = 0
        const today = new Date()

        // If trip hasn't started yet, streak is 0
        if (today < startDate) {
          setStreak(0)
          setLoading(false)
          return
        }

        // If trip has ended, calculate final streak
        if (today > endDate) {
          // For each day in the trip, check if there's a memory
          for (const day of allDays) {
            const hasMemory = dates.some((date) => isSameDay(date, day))
            if (hasMemory) {
              currentStreak++
            } else {
              // Reset streak if a day was missed
              currentStreak = 0
            }
          }
        } else {
          // Trip is ongoing, calculate streak up to today
          const daysUntilToday = eachDayOfInterval({
            start: startDate,
            end: today > endDate ? endDate : today,
          })

          for (const day of daysUntilToday) {
            const hasMemory = dates.some((date) => isSameDay(date, day))
            if (hasMemory) {
              currentStreak++
            } else {
              // Reset streak if a day was missed
              currentStreak = 0
            }
          }
        }

        setStreak(currentStreak)
      } catch (error) {
        console.error("Error in fetchMemories:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMemories()
  }, [tripId, userId, startDate, endDate])

  if (loading) return null

  // Only show if there's a streak or if they've journaled at least once
  if (streak === 0 && journaledDays.length === 0) return null

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-vault-purple/20 overflow-hidden relative mb-4">
      <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/5 via-white/5 to-vault-orange/5 opacity-50"></div>
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${streak > 0 ? "bg-vault-orange/20" : "bg-gray-200"}`}>
              <Flame className={`h-5 w-5 ${streak > 0 ? "text-vault-orange animate-subtle-pulse" : "text-gray-400"}`} />
            </div>
            <div>
              <h3 className="text-sm font-medium">Memory Streak</h3>
              <p className="text-xs text-gray-500">
                {streak > 0
                  ? `You've journaled ${streak} day${streak === 1 ? "" : "s"} in a row!`
                  : "Start your streak by adding today's memories!"}
              </p>
            </div>
          </div>
          <div className="text-2xl font-bold flex items-center">
            {streak > 0 && <span className="text-vault-orange">{streak}</span>}
            {streak >= 3 && <Trophy className="h-5 w-5 ml-1 text-yellow-500" />}
          </div>
        </div>

        {journaledDays.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>
                  {journaledDays.length} of {totalDays} days journaled
                </span>
              </div>
              <div className="flex">
                {[...Array(Math.min(5, totalDays))].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < journaledDays.length
                        ? "text-vault-purple fill-vault-purple"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
