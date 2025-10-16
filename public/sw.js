// Service Worker for background timer
let timerState = {
  isRunning: false,
  timeRemaining: 0,
  sessionId: null,
  startTime: null,
  duration: 0,
}

let timerInterval = null

// Handle messages from client
self.addEventListener('message', (event) => {
  const { type, payload } = event.data

  switch (type) {
    case 'START_TIMER':
      startTimer(payload)
      break
    case 'PAUSE_TIMER':
      pauseTimer()
      break
    case 'RESUME_TIMER':
      resumeTimer(payload)
      break
    case 'STOP_TIMER':
      stopTimer()
      break
    case 'SYNC_TIME':
      syncTime(payload)
      break
    case 'GET_STATE':
      sendState(event.source)
      break
    case 'UPDATE_SESSION_ID':
      updateSessionId(payload)
      break
  }
})

function startTimer(payload) {
  const { sessionId, duration, timeRemaining, startedAt } = payload
  
  timerState = {
    isRunning: true,
    timeRemaining: timeRemaining ?? duration * 60,
    sessionId,
    startTime: startedAt ? new Date(startedAt).getTime() : Date.now(),
    duration: duration * 60,
  }

  if (timerInterval) clearInterval(timerInterval)
  
  timerInterval = setInterval(() => {
    tick()
  }, 1000)

  broadcastState()
}

function pauseTimer() {
  timerState.isRunning = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  broadcastState()
}

function resumeTimer(payload) {
  const { timeRemaining, startedAt } = payload
  
  timerState.isRunning = true
  timerState.timeRemaining = timeRemaining
  timerState.startTime = startedAt ? new Date(startedAt).getTime() : Date.now()

  if (timerInterval) clearInterval(timerInterval)
  
  timerInterval = setInterval(() => {
    tick()
  }, 1000)

  broadcastState()
}

function stopTimer() {
  timerState = {
    isRunning: false,
    timeRemaining: 0,
    sessionId: null,
    startTime: null,
    duration: 0,
  }
  
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  
  broadcastState()
}

function syncTime(payload) {
  const { timeRemaining, isRunning } = payload
  timerState.timeRemaining = timeRemaining
  timerState.isRunning = isRunning
  
  if (!isRunning && timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function updateSessionId(payload) {
  const { oldSessionId, newSessionId, startedAt } = payload
  
  // Update session ID if it matches current one
  if (timerState.sessionId === oldSessionId) {
    timerState.sessionId = newSessionId
    
    // Update startTime if new one is provided
    if (startedAt) {
      timerState.startTime = new Date(startedAt).getTime()
    }
    
    console.log(`Session ID updated from ${oldSessionId} to ${newSessionId}`)
  }
}

function tick() {
  if (!timerState.isRunning) return

  // Calculate time based on startTime for accuracy
  const now = Date.now()
  const elapsed = Math.floor((now - timerState.startTime) / 1000)
  const newTimeRemaining = Math.max(0, timerState.duration - elapsed)

  timerState.timeRemaining = newTimeRemaining

  if (newTimeRemaining === 0) {
    handleTimerComplete()
  } else {
    broadcastState()
  }
}

function handleTimerComplete() {
  timerState.isRunning = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }

  // Send completion event
  broadcastMessage({
    type: 'TIMER_COMPLETE',
    payload: {
      sessionId: timerState.sessionId,
    },
  })

  // Show notification only if no visible clients
  notifyIfHidden()

  timerState = {
    isRunning: false,
    timeRemaining: 0,
    sessionId: null,
    startTime: null,
    duration: 0,
  }
}

function broadcastState() {
  broadcastMessage({
    type: 'TIMER_TICK',
    payload: {
      timeRemaining: timerState.timeRemaining,
      isRunning: timerState.isRunning,
      sessionId: timerState.sessionId,
    },
  })
}

function sendState(client) {
  if (client) {
    client.postMessage({
      type: 'TIMER_STATE',
      payload: {
        timeRemaining: timerState.timeRemaining,
        isRunning: timerState.isRunning,
        sessionId: timerState.sessionId,
      },
    })
  }
}

async function broadcastMessage(message) {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  })

  clients.forEach((client) => {
    client.postMessage(message)
  })
}

async function notifyIfHidden() {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  })

  const hasVisibleClient = clients.some((client) => client.visibilityState === 'visible')

  if (hasVisibleClient) {
    return
  }

  self.registration.showNotification('Pomodoro completed! 🍅', {
    body: 'Time to take a break',
    icon: '/icons/favicon-192.png',
    badge: '/icons/favicon-32.png',
    tag: 'pomodoro-timer',
    requireInteraction: true,
  })
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // If there's an open window, focus on it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})

// Basic Service Worker installation
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(self.clients.claim())
})

