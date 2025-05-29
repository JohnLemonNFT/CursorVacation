"use client"

import { useState } from "react"
import { Lightbulb, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type MemoryPromptsSimpleProps = {
  onSelectPrompt: (prompt: string) => void
}

export function MemoryPromptsSimple({ onSelectPrompt }: MemoryPromptsSimpleProps) {
  const [expanded, setExpanded] = useState(false)

  // Categories of prompts
  const promptCategories = [
    {
      name: "Family Moments",
      prompts: [
        "What made everyone laugh today?",
        "What was the sweetest family moment today?",
        "Did anyone try something new today?",
        "What surprised you about a family member today?",
        "What family inside joke came up today?",
      ],
    },
    {
      name: "Activities & Adventures",
      prompts: [
        "What was the most exciting thing you did today?",
        "What was challenging but worth it today?",
        "Did you discover any hidden gems today?",
        "What would you do again in a heartbeat?",
        "What unexpected adventure did you have?",
      ],
    },
    {
      name: "Food & Treats",
      prompts: [
        "What was the best thing you ate today?",
        "Did you try any local specialties?",
        "What was the most unusual food you tried?",
        "Where was your favorite meal and why?",
        "What treat are you still thinking about?",
      ],
    },
    {
      name: "Reflections",
      prompts: [
        "What are you grateful for today?",
        "What did you learn today?",
        "How did today compare to your expectations?",
        "What would you tell someone about today?",
        "What moment do you want to remember forever?",
      ],
    },
  ]

  // Get random prompts from each category
  const getRandomPrompts = () => {
    return promptCategories.map((category) => {
      const randomIndex = Math.floor(Math.random() * category.prompts.length)
      return {
        category: category.name,
        prompt: category.prompts[randomIndex],
      }
    })
  }

  const [randomPrompts, setRandomPrompts] = useState(getRandomPrompts)

  const refreshPrompts = () => {
    setRandomPrompts(getRandomPrompts())
  }

  return (
    <div className="w-full">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 mb-2 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
        onClick={() => setExpanded(!expanded)}
      >
        <Lightbulb className="h-4 w-4" />
        {expanded ? "Hide Memory Prompts" : "Need Inspiration?"}
      </Button>

      {expanded && (
        <Card className="mb-4 border-purple-100 bg-purple-50/50 overflow-hidden">
          <CardContent className="p-3">
            <div className="space-y-2">
              {randomPrompts.map((item, index) => (
                <div key={index} className="group">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left text-sm font-normal p-2 h-auto hover:bg-purple-100/70"
                    onClick={() => onSelectPrompt(item.prompt)}
                  >
                    <div className="flex items-start gap-2">
                      <Plus className="h-4 w-4 mt-0.5 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div>
                        <p className="text-gray-900">{item.prompt}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                    </div>
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right">
              <Button variant="ghost" size="sm" className="text-xs text-purple-600" onClick={refreshPrompts}>
                Show different prompts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
