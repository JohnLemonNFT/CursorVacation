"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").then(
          (registration) => {
            console.log("ServiceWorker registration successful with scope: ", registration.scope)

            // Check for updates
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("New service worker installed, but waiting to activate")
                  }
                })
              }
            })

            // Handle updates
            let refreshing = false
            navigator.serviceWorker.addEventListener("controllerchange", () => {
              if (!refreshing) {
                refreshing = true
                console.log("Controller changed, refreshing page")
                window.location.reload()
              }
            })
          },
          (err) => {
            console.log("ServiceWorker registration failed: ", err)
          },
        )
      })
    }
  }, [])

  return null
}
