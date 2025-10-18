'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface TimerErrorBoundaryProps {
  children: ReactNode
}

interface TimerErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class TimerErrorBoundary extends Component<
  TimerErrorBoundaryProps,
  TimerErrorBoundaryState
> {
  constructor(props: TimerErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): TimerErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PomodoroTimer crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="mt-2 text-sm text-red-600">
            Try refreshing the page or returning later. The issue has been logged.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
