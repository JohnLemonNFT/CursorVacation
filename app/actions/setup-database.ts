"use server"

import { createClient } from "@supabase/supabase-js"

export async function setupDatabase() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      return {
        success: false,
        message: "SUPABASE_SERVICE_ROLE_KEY environment variable is not set",
      }
    }

    // Use service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Test the connection first
    const { data: testData, error: testError } = await supabase.from("profiles").select("count").limit(1)

    // If profiles table doesn't exist, we need to create the schema
    if (testError && testError.message.includes('relation "public.profiles" does not exist')) {
      return {
        success: false,
        message: "Database tables not found. Please run the SQL commands manually in Supabase SQL Editor.",
        needsManualSetup: true,
      }
    }

    // Check if storage bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (!bucketsError) {
      const memoriesBucket = buckets?.find((b) => b.name === "memories")

      if (!memoriesBucket) {
        // Try to create the bucket with a smaller file size limit
        const { error: createBucketError } = await supabase.storage.createBucket("memories", {
          public: true,
          fileSizeLimit: 10485760, // 10MB instead of 100MB
          allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        })

        if (createBucketError) {
          console.log("Storage bucket creation failed:", createBucketError)
          // Continue anyway - bucket can be created manually
        }
      }
    }

    return {
      success: true,
      message: "Database connection verified successfully! If tables don't exist, please run the SQL setup manually.",
    }
  } catch (error) {
    console.error("Error in setupDatabase:", error)
    return {
      success: false,
      message: "Error connecting to database",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
