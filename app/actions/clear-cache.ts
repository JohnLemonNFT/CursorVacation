"use server"

export async function clearLocalStorageCache() {
  try {
    // Clear all trip-related cache
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith('cached-trip-') ||
        key.startsWith('trip-') ||
        key.startsWith('connection_') ||
        key.startsWith('last_') ||
        key.startsWith('cached_')
      )) {
        keysToRemove.push(key)
      }
    }

    // Remove all matching keys
    keysToRemove.forEach(key => localStorage.removeItem(key))

    return {
      success: true,
      message: "Cache cleared successfully",
      clearedKeys: keysToRemove.length
    }
  } catch (error) {
    console.error("Error clearing cache:", error)
    return {
      success: false,
      message: "Failed to clear cache",
      error: error instanceof Error ? error.message : String(error)
    }
  }
} 