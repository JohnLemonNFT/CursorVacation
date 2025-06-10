import type React from "react"
import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/toaster"
import { MobileAppShell } from "@/components/mobile-app-shell"
import { ErrorBoundary } from "@/components/error-boundary"
import { ServiceWorkerRegistration } from "./sw-register"
import { PagePersistence } from "@/components/page-persistence"
import { AuthErrorHandler } from "@/components/auth-error-handler"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VDH Vault | Family Vacation Planner",
  description: "Plan, capture, and relive family vacations together",
  manifest: "/manifest.json",
  icons: {
    icon: "/placeholder-logo.png",
    apple: "/placeholder-logo.png",
  },
    generator: 'v0.dev'
}

export const viewport: Viewport = {
  themeColor: "#8A4FFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-512x512.png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/icon-512x512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180x180.png" />
        <meta name="theme-color" content="#8A4FFF" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <ErrorBoundary>
              <MobileAppShell>
                <AuthErrorHandler />
                <PagePersistence />
                {children}
                <Toaster />
                <ServiceWorkerRegistration />
              </MobileAppShell>
            </ErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
