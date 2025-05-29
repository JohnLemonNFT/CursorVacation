"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Tab = {
  id: string
  label: string
  icon: React.ReactNode
}

type MobileSecondaryTabsProps = {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
}

export function MobileSecondaryTabs({ tabs, activeTab, onChange }: MobileSecondaryTabsProps) {
  return (
    <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="outline"
          className={cn(
            "flex items-center gap-1 whitespace-nowrap rounded-full px-4 py-2",
            activeTab === tab.id
              ? "bg-vault-purple text-white border-vault-purple hover:bg-vault-purple/90"
              : "text-gray-600 border-gray-300 hover:bg-gray-100",
          )}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </Button>
      ))}
    </div>
  )
}
