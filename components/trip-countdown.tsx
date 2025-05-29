"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns"
import { Sparkles, Plane, Calendar, Clock } from "lucide-react"

type TripCountdownProps = {
  startDate: Date
  endDate: Date
}

export function TripCountdown({ startDate, endDate }: TripCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })
  const [countdownType, setCountdownType] = useState<"until" | "during" | "after">("until")
  const [showSparkle, setShowSparkle] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()

      if (now < startDate) {
        // Trip hasn't started yet
        setCountdownType("until")

        const days = differenceInDays(startDate, now)
        const hours = differenceInHours(startDate, now) % 24
        const minutes = differenceInMinutes(startDate, now) % 60
        const seconds = differenceInSeconds(startDate, now) % 60

        setTimeLeft({ days, hours, minutes, seconds })
      } else if (now <= endDate) {
        // Trip is ongoing
        setCountdownType("during")

        const days = differenceInDays(endDate, now)
        const hours = differenceInHours(endDate, now) % 24
        const minutes = differenceInMinutes(endDate, now) % 60
        const seconds = differenceInSeconds(endDate, now) % 60

        setTimeLeft({ days, hours, minutes, seconds })
      } else {
        // Trip has ended
        setCountdownType("after")
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    // Show sparkle animation every 10 seconds
    const sparkleTimer = setInterval(() => {
      setShowSparkle(true)
      setTimeout(() => setShowSparkle(false), 2000)
    }, 10000)

    return () => {
      clearInterval(timer)
      clearInterval(sparkleTimer)
    }
  }, [startDate, endDate])

  const getCountdownTitle = () => {
    switch (countdownType) {
      case "until":
        return "Trip starts in"
      case "during":
        return "Trip ends in"
      case "after":
        return "Trip has ended"
    }
  }

  const getCountdownColor = () => {
    switch (countdownType) {
      case "until":
        return "bg-gradient-to-r from-vault-purple to-vault-purple/90 text-white"
      case "during":
        return "bg-gradient-to-r from-vault-green to-vault-green/90 text-white"
      case "after":
        return "bg-gradient-to-r from-vault-orange to-vault-orange/90 text-white"
    }
  }

  const getCountdownIcon = () => {
    switch (countdownType) {
      case "until":
        return <Plane className="h-6 w-6 animate-bounce-slow" />
      case "during":
        return <Clock className="h-6 w-6 animate-pulse" />
      case "after":
        return <Calendar className="h-6 w-6" />
    }
  }

  const getFunMessage = () => {
    if (countdownType === "until") {
      if (timeLeft.days > 30) return "Pack your patience, it's still a while away!"
      if (timeLeft.days > 14) return "Time to start making those packing lists!"
      if (timeLeft.days > 7) return "Almost time to start packing!"
      if (timeLeft.days > 3) return "The excitement is building!"
      if (timeLeft.days > 0) return "So close you can almost taste the vacation!"
      if (timeLeft.hours > 0) return "Hours to go! Can you feel the excitement?"
      return "Almost time to go! Final countdown!"
    }

    if (countdownType === "during") {
      if (timeLeft.days > 5) return "Plenty of vacation time left!"
      if (timeLeft.days > 2) return "Still time for more memories!"
      if (timeLeft.days > 0) return "Make the most of these last days!"
      if (timeLeft.hours > 12) return "Less than a day left - treasure it!"
      return "Final hours - make them count!"
    }

    return "Time to plan the next adventure!"
  }

  return (
    <Card className={`${getCountdownColor()} animate-fade-in relative overflow-hidden shadow-lg border-none`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {countdownType === "until" && (
          <>
            <div className="absolute top-0 left-1/4 text-white/10 animate-float-slow">
              <Plane className="h-8 w-8 rotate-45" />
            </div>
            <div className="absolute bottom-0 right-1/4 text-white/10 animate-float">
              <Plane className="h-6 w-6 -rotate-45" />
            </div>
          </>
        )}

        {countdownType === "during" && (
          <>
            <div className="absolute top-0 right-1/4 text-white/10 animate-spin-slow">
              <Clock className="h-8 w-8" />
            </div>
            <div className="absolute bottom-0 left-1/4 text-white/10 animate-pulse">
              <Sparkles className="h-6 w-6" />
            </div>
          </>
        )}
      </div>

      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{getCountdownTitle()}</h3>
          {getCountdownIcon()}
        </div>

        {countdownType !== "after" ? (
          <>
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              <div className="flex flex-col bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <span className="text-3xl font-bold">{timeLeft.days}</span>
                <span className="text-xs">Days</span>
              </div>
              <div className="flex flex-col bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <span className="text-3xl font-bold">{timeLeft.hours}</span>
                <span className="text-xs">Hours</span>
              </div>
              <div className="flex flex-col bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <span className="text-3xl font-bold">{timeLeft.minutes}</span>
                <span className="text-xs">Minutes</span>
              </div>
              <div className="flex flex-col bg-white/10 rounded-lg p-2 backdrop-blur-sm">
                <span className="text-3xl font-bold">{timeLeft.seconds}</span>
                <span className="text-xs">Seconds</span>
              </div>
            </div>
            <p className="text-center text-sm italic text-white/80">{getFunMessage()}</p>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-xl font-medium mb-2">We hope you had a great time!</p>
            <p className="text-sm italic">Time to start planning your next adventure?</p>
          </div>
        )}

        {/* Sparkle animation */}
        {showSparkle && (
          <div className="absolute top-2 right-2 animate-ping">
            <Sparkles className="h-5 w-5 text-yellow-300" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
