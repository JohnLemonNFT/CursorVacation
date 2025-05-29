"use client"

import { useState, useEffect } from "react"
import { Lightbulb, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Memory prompt categories
const MEMORY_PROMPTS = {
  general: [
    "What was the highlight of your day?",
    "What made you laugh today?",
    "What surprised you the most today?",
    "What's something new you tried today?",
    "What was your favorite meal today?",
    "What's a moment you want to remember forever?",
    "What was the most beautiful thing you saw today?",
    "What was challenging today and how did you overcome it?",
    "What did you learn today?",
    "What are you looking forward to tomorrow?",
    "What's one thing that made today different from yesterday?",
    "What's a small detail you noticed today that you might forget later?",
  ],
  family: [
    "What funny thing did a family member do or say today?",
    "What moment brought your family closer today?",
    "What new side of a family member did you see today?",
    "What family tradition did you continue or create today?",
    "What was your favorite family photo opportunity today?",
    "How did your kids react to something new today?",
    "What made your partner/spouse smile today?",
    "What's something you appreciated about your family today?",
    "What's a conversation with family you want to remember?",
    "How did your family surprise you today?",
    "What family inside joke came up today?",
    "What's something you learned about a family member today?",
  ],
  activities: [
    "What activity exceeded your expectations today?",
    "What activity would you recommend to others?",
    "What was the most adventurous thing you did today?",
    "What activity would you like to do again?",
    "What activity surprised you with how fun it was?",
    "What activity created the best memories today?",
    "What was the most relaxing thing you did today?",
    "What activity brought out the best in everyone?",
    "What activity didn't go as planned but turned out great anyway?",
    "What's an activity you'd like to try next time?",
  ],
  food: [
    "What was the most delicious thing you ate today?",
    "What local specialty did you try today?",
    "What food experience will you remember from today?",
    "What was the most unusual food you tried today?",
    "What restaurant would you recommend based on today?",
    "What food photo did you take today?",
    "What's a recipe you want to recreate at home?",
    "What was everyone's favorite meal today?",
    "What food surprised you with how good it was?",
    "What's the most Instagram-worthy food you had today?",
  ],
  reflection: [
    "How did today compare to what you expected?",
    "What made today different from a normal day at home?",
    "What did you appreciate most about today?",
    "What did today teach you about yourself or your family?",
    "What will you remember most about today in 5 years?",
    "How did today change your perspective on something?",
    "What's something you're grateful for from today?",
    "What's a moment from today you wish you could bottle up and keep forever?",
    "How did this place affect you today?",
    "What's something you realized today?",
  ],
  photos: [
    "Take a photo of everyone's smiles today",
    "Capture the most beautiful view you saw today",
    "Take a photo of something that made you laugh",
    "Capture your meal before everyone digs in",
    "Take a group selfie in front of today's landmark",
    "Photograph something tiny or easily overlooked",
    "Capture a candid moment of someone enjoying themselves",
    "Take a photo that shows the local culture or atmosphere",
    "Photograph your accommodations to remember where you stayed",
    "Take a before/after photo of an activity today",
    "Capture the sunset or sunrise if you saw one today",
    "Take a photo of something that represents today's mood",
  ],
  videos: [
    "Record a quick 10-second tour of where you're staying",
    "Film everyone's reaction to something exciting",
    "Capture a short video of the local sounds (street musicians, ocean waves, etc.)",
    "Record a brief interview asking everyone their favorite part of the day",
    "Film a short walkthrough of an interesting place you visited",
    "Capture a funny moment that happened today",
    "Record a quick message to your future self about today",
    "Film a beautiful view with a slow pan",
    "Capture a short video of local transportation you used",
    "Record a quick taste test of a local food or drink",
  ],
  journaling: [
    "Write about three things that made today memorable",
    "Describe the best conversation you had today",
    "Write about something that challenged you today",
    "Describe the most beautiful thing you saw in detail",
    "Write about how this trip is different from what you expected",
    "Describe the sounds, smells, and feelings of a special moment today",
    "Write a short story about a funny incident from today",
    "Describe someone interesting you met or observed today",
    "Write about how this place is changing you",
    "Describe something you want to remember exactly as it was today",
    "Write about how this trip compares to previous vacations",
    "Describe what you're looking forward to tomorrow",
  ],
}

type MemoryPromptsProps = {
  category?: keyof typeof MEMORY_PROMPTS | "random"
  onSelectPrompt?: (prompt: string) => void
}

export function MemoryPrompts({ category = "random", onSelectPrompt }: MemoryPromptsProps) {
  const [currentPrompts, setCurrentPrompts] = useState<string[]>([])

  const generatePrompts = () => {
    if (category === "random") {
      // Get all prompts from all categories
      const allPrompts = Object.values(MEMORY_PROMPTS).flat()

      // Shuffle and pick 3 random prompts
      const shuffled = [...allPrompts].sort(() => 0.5 - Math.random())
      setCurrentPrompts(shuffled.slice(0, 3))
    } else {
      // Get prompts from the specified category
      const categoryPrompts = MEMORY_PROMPTS[category]

      // Shuffle and pick 3 random prompts
      const shuffled = [...categoryPrompts].sort(() => 0.5 - Math.random())
      setCurrentPrompts(shuffled.slice(0, 3))
    }
  }

  useEffect(() => {
    generatePrompts()
  }, [category])

  return (
    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-vault-orange/20 overflow-hidden relative mb-4">
      <div className="absolute inset-0 bg-gradient-to-br from-vault-purple/5 via-white/5 to-vault-orange/5 opacity-50"></div>
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-vault-orange" />
            <h3 className="text-sm font-medium">Memory Prompts</h3>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={generatePrompts}>
            <RefreshCw className="h-3 w-3" />
            <span className="sr-only">Refresh prompts</span>
          </Button>
        </div>

        <div className="space-y-2">
          {currentPrompts.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start text-left h-auto py-2 text-sm bg-white/60 dark:bg-gray-800/60 hover:bg-vault-orange/10 border-vault-orange/20"
              onClick={() => onSelectPrompt && onSelectPrompt(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
