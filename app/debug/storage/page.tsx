"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { safeLocalStorage, safeSessionStorage } from "@/lib/safe-storage"

export default function StorageDebugPage() {
  const [localStorageAvailable, setLocalStorageAvailable] = useState<boolean | null>(null)
  const [sessionStorageAvailable, setSessionStorageAvailable] = useState<boolean | null>(null)
  const [cookiesAvailable, setCookiesAvailable] = useState<boolean | null>(null)
  const [testResult, setTestResult] = useState<string>("")

  useEffect(() => {
    // Check localStorage
    try {
      localStorage.setItem("test", "test")
      localStorage.removeItem("test")
      setLocalStorageAvailable(true)
    } catch (e) {
      setLocalStorageAvailable(false)
    }

    // Check sessionStorage
    try {
      sessionStorage.setItem("test", "test")
      sessionStorage.removeItem("test")
      setSessionStorageAvailable(true)
    } catch (e) {
      setSessionStorageAvailable(false)
    }

    // Check cookies
    try {
      document.cookie = "test=test; path=/; max-age=3600"
      setCookiesAvailable(document.cookie.includes("test=test"))
    } catch (e) {
      setCookiesAvailable(false)
    }
  }, [])

  const runStorageTest = () => {
    try {
      // Test our safe storage utilities
      const testKey = "storage-test-" + Date.now()
      const testValue = "test-value-" + Date.now()

      // Test localStorage
      safeLocalStorage.setItem(testKey, testValue)
      const localResult = safeLocalStorage.getItem(testKey) === testValue
      safeLocalStorage.removeItem(testKey)

      // Test sessionStorage
      safeSessionStorage.setItem(testKey, testValue)
      const sessionResult = safeSessionStorage.getItem(testKey) === testValue
      safeSessionStorage.removeItem(testKey)

      setTestResult(`
        Safe localStorage test: ${localResult ? "✅ PASSED" : "❌ FAILED"}
        Safe sessionStorage test: ${sessionResult ? "✅ PASSED" : "❌ FAILED"}
      `)
    } catch (e) {
      setTestResult(`Test failed with error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div className="container max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Storage Debug</CardTitle>
          <CardDescription>Check browser storage availability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="font-medium">localStorage:</div>
            <div>
              {localStorageAvailable === null ? "Checking..." : localStorageAvailable ? "✅ Available" : "❌ Blocked"}
            </div>

            <div className="font-medium">sessionStorage:</div>
            <div>
              {sessionStorageAvailable === null
                ? "Checking..."
                : sessionStorageAvailable
                  ? "✅ Available"
                  : "❌ Blocked"}
            </div>

            <div className="font-medium">Cookies:</div>
            <div>{cookiesAvailable === null ? "Checking..." : cookiesAvailable ? "✅ Available" : "❌ Blocked"}</div>
          </div>

          {testResult && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm whitespace-pre-line">
              {testResult}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={runStorageTest} className="w-full">
            Run Safe Storage Test
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
