"use client"

import type React from "react"
import { cn } from "@/lib/utils"

type Tab = {
  id: string
  label: string
  icon: React.ReactNode
}

type MobileTabsProps = {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
}

export function MobileTabs({ tabs, activeTab, onChange }: MobileTabsProps) {
  return (
    <div className="flex justify-around bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={cn("mobile-tab flex-1 py-3", activeTab === tab.id ? "active text-vault-purple" : "text-gray-500")}
          onClick={() => onChange(tab.id)}
        >
          <div className="flex flex-col items-center">
            {tab.icon}
            <span className="text-xs mt-1">{tab.label}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
