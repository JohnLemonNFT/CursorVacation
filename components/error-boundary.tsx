"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Home, RefreshCw } from "lucide-react"
import Link from "next/link"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    console.error("Uncaught error:", error, errorInfo)
  }

  private handleReload = (): void => {
    window.location.reload()
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-vault-purple/10 to-vault-orange/10">
          <Card className="w-full max-w-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 opacity-50"></div>
            <CardHeader className="relative z-10">
              <CardTitle className="text-center text-2xl font-bold text-red-500 flex items-center justify-center gap-2">
                <AlertCircle className="h-6 w-6" />
                Something Went Wrong
              </CardTitle>
              <CardDescription className="text-center">
                We encountered an unexpected error. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-auto max-h-32 mb-4">
                <p className="font-mono text-red-500">{this.state.error?.toString() || "An unknown error occurred"}</p>
              </div>
            </CardContent>
            <CardFooter className="relative z-10 flex flex-col gap-4">
              <Button
                className="w-full bg-gradient-to-r from-vault-purple to-vault-orange hover:opacity-90 transition-all duration-300 text-white flex items-center justify-center gap-2"
                onClick={this.handleReload}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page
              </Button>
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full border-vault-purple/30 hover:bg-vault-purple/10">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
