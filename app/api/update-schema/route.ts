import { NextResponse } from "next/server"

export async function GET() {
  // Return success without trying to modify the schema
  return NextResponse.json({ success: true })
}
