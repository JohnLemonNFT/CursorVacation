// A simple queue system for offline operations

type QueuedOperation = {
  id: string
  operation: string
  data: any
  timestamp: number
  retryCount: number
  lastRetry: number | null
}

const QUEUE_STORAGE_KEY = "offline-operations-queue"
const MAX_RETRY_COUNT = 5
const RETRY_DELAY_BASE = 5000 // 5 seconds base delay

// Load the queue from storage
function loadQueue(): QueuedOperation[] {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error("Failed to load offline queue:", e)
  }
  return []
}

// Save the queue to storage
function saveQueue(queue: QueuedOperation[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
  } catch (e) {
    console.error("Failed to save offline queue:", e)
  }
}

// Add an operation to the queue
export function queueOperation(operation: string, data: any): string {
  const queue = loadQueue()
  const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  queue.push({
    id,
    operation,
    data,
    timestamp: Date.now(),
    retryCount: 0,
    lastRetry: null,
  })

  saveQueue(queue)
  console.log(`Operation queued: ${operation}`, data)

  // Try to process the queue immediately if we're online
  if (navigator.onLine) {
    processQueue()
  }

  return id
}

// Process the queue
export async function processQueue(): Promise<boolean> {
  if (!navigator.onLine) {
    console.log("Cannot process queue while offline")
    return false
  }

  const queue = loadQueue()
  if (queue.length === 0) {
    return true
  }

  console.log(`Processing offline queue: ${queue.length} operations`)
  let success = true

  // Process each operation
  for (let i = 0; i < queue.length; i++) {
    const operation = queue[i]

    // Skip operations that have exceeded max retry count
    if (operation.retryCount >= MAX_RETRY_COUNT) {
      console.warn(`Operation ${operation.id} exceeded max retry count, skipping`)
      continue
    }

    // Apply exponential backoff for retries
    if (operation.lastRetry) {
      const backoffTime = RETRY_DELAY_BASE * Math.pow(2, operation.retryCount)
      const timeSinceLastRetry = Date.now() - operation.lastRetry

      if (timeSinceLastRetry < backoffTime) {
        console.log(`Skipping operation ${operation.id}, next retry in ${(backoffTime - timeSinceLastRetry) / 1000}s`)
        continue
      }
    }

    try {
      // Update retry information
      queue[i] = {
        ...operation,
        retryCount: operation.retryCount + 1,
        lastRetry: Date.now(),
      }
      saveQueue(queue)

      // Process based on operation type
      switch (operation.operation) {
        case "create_trip":
          // Implementation would go here
          console.log("Processing create_trip operation", operation.data)
          break

        case "update_trip":
          // Implementation would go here
          console.log("Processing update_trip operation", operation.data)
          break

        case "add_memory":
          // Implementation would go here
          console.log("Processing add_memory operation", operation.data)
          break

        default:
          console.warn(`Unknown operation type: ${operation.operation}`)
          break
      }

      // If we get here, the operation was successful
      // Remove it from the queue
      queue.splice(i, 1)
      i--
      saveQueue(queue)
    } catch (error) {
      console.error(`Failed to process operation ${operation.id}:`, error)
      success = false

      // We don't remove the operation, it will be retried later
      // The retry count and last retry time were already updated
    }
  }

  return success
}

// Get the current queue status
export function getQueueStatus(): {
  pending: number
  failed: number
  operations: QueuedOperation[]
} {
  const queue = loadQueue()

  return {
    pending: queue.filter((op) => op.retryCount < MAX_RETRY_COUNT).length,
    failed: queue.filter((op) => op.retryCount >= MAX_RETRY_COUNT).length,
    operations: queue,
  }
}

// Clear failed operations from the queue
export function clearFailedOperations(): void {
  const queue = loadQueue()
  const newQueue = queue.filter((op) => op.retryCount < MAX_RETRY_COUNT)
  saveQueue(newQueue)
}

// Set up event listeners for online/offline events
export function initOfflineQueue(): void {
  window.addEventListener("online", () => {
    console.log("Device is online, processing queue")
    processQueue()
  })

  // Periodically try to process the queue
  setInterval(() => {
    if (navigator.onLine) {
      const status = getQueueStatus()
      if (status.pending > 0) {
        console.log(`Attempting to process ${status.pending} pending operations`)
        processQueue()
      }
    }
  }, 60000) // Check every minute
}
