import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get("code")
    const error = requestUrl.searchParams.get("error")
    const errorDescription = requestUrl.searchParams.get("error_description")

    // Handle OAuth error
    if (error) {
      console.error(`Auth error: ${error}`, errorDescription)
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent(errorDescription || error)}`, request.url),
      )
    }

    if (!code) {
      console.error("No code provided in callback")
      return NextResponse.redirect(new URL("/auth/signin?error=no_code", request.url))
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("Error exchanging code for session:", exchangeError.message)
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent(exchangeError.message)}`, request.url),
      )
    }

    // Redirect to dashboard after successful authentication
    return NextResponse.redirect(new URL("/dashboard", request.url))
  } catch (error) {
    console.error("Unexpected error in auth callback:", error)
    return NextResponse.redirect(new URL("/auth/signin?error=unexpected", request.url))
  }
}
