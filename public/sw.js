// Service Worker для фонового таймера
let timerState = {
  isRunning: false,
  timeRemaining: 0,
  sessionId: null,
  startTime: null,
  duration: 0,
}

let timerInterval = null

// Обработка сообщений от клиента
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

function tick() {
  if (!timerState.isRunning) return

  // Рассчитываем время на основе startTime для точности
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

  // Отправляем событие завершения
  broadcastMessage({
    type: 'TIMER_COMPLETE',
    payload: {
      sessionId: timerState.sessionId,
    },
  })

  // Показываем нотификацию
  self.registration.showNotification('Pomodoro completed! 🍅', {
    body: 'Time to take a break',
    icon: '/icons/favicon-192.png',
    badge: '/icons/favicon-32.png',
    tag: 'pomodoro-timer',
    requireInteraction: true,
  })

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

// Обработка клика по нотификации
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Если есть открытое окно, фокусируемся на нем
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      // Иначе открываем новое окно
      if (self.clients.openWindow) {
        return self.clients.openWindow('/')
      }
    })
  )
})

// Базовая установка Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  event.waitUntil(self.clients.claim())
})

