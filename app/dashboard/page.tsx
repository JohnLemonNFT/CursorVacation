"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PlusCircle,
  Calendar,
  MapPin,
  Users,
  Sparkles,
  Plane,
  Camera,
  Heart,
  Star,
  RefreshCw,
  AlertCircle,
  WifiOff,
  User,
} from "lucide-react"
import Link from "next/link"
import { supabase, handleSupabaseError } from "@/lib/supabase"
import { formatDistanceToNow, differenceInDays } from "date-fns"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { checkConnection, attemptReconnect, type ConnectionState } from "@/lib/data-manager"
import { Suspense } from "react"
import DashboardClientWrapper from "@/components/DashboardClientWrapper"

type Trip = {
  id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  created_at: string
  created_by: string
  memberCount: number
}

type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardClientWrapper />
    </Suspense>
  )
}
