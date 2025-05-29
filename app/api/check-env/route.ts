export async function GET() {
  return Response.json({
    publicKeyExists: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKeyExists: !!process.env.VAPID_PRIVATE_KEY,
    // Don't return the actual keys for security reasons
  })
}
