// Helper functions to safely access localStorage and sessionStorage
// with fallbacks for contexts where storage is not available

// Memory fallback when browser storage is not available
const memoryStorage = new Map<string, string>()

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === "undefined") return memoryStorage.get(key) || null
      return localStorage.getItem(key)
    } catch (error) {
      console.warn("Unable to access localStorage:", error)
      return memoryStorage.get(key) || null
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === "undefined") {
        memoryStorage.set(key, value)
        return
      }
      localStorage.setItem(key, value)
    } catch (error) {
      console.warn("Unable to write to localStorage:", error)
      memoryStorage.set(key, value)
    }
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window === "undefined") {
        memoryStorage.delete(key)
        return
      }
      localStorage.removeItem(key)
    } catch (error) {
      console.warn("Unable to remove from localStorage:", error)
      memoryStorage.delete(key)
    }
  },
}

// Separate memory storage for session
const sessionMemoryStorage = new Map<string, string>()

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === "undefined") return sessionMemoryStorage.get(key) || null
      return sessionStorage.getItem(key)
    } catch (error) {
      console.warn("Unable to access sessionStorage:", error)
      return sessionMemoryStorage.get(key) || null
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === "undefined") {
        sessionMemoryStorage.set(key, value)
        return
      }
      sessionStorage.setItem(key, value)
    } catch (error) {
      console.warn("Unable to write to sessionStorage:", error)
      sessionMemoryStorage.set(key, value)
    }
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window === "undefined") {
        sessionMemoryStorage.delete(key)
        return
      }
      sessionStorage.removeItem(key)
    } catch (error) {
      console.warn("Unable to remove from sessionStorage:", error)
      sessionMemoryStorage.delete(key)
    }
  },
}
