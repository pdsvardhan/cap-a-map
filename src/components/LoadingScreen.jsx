import React, { useState, useEffect, useRef } from 'react'
import useMapStore from '../stores/mapStore'

export default function LoadingScreen() {
  const stage = useMapStore((s) => s.loadingStage)
  const error = useMapStore((s) => s.loadingError)
  const [displayedProgress, setDisplayedProgress] = useState(0)
  const [prevWord, setPrevWord] = useState(null)
  const [currentWord, setCurrentWord] = useState(stage.label)
  const [animating, setAnimating] = useState(false)
  const prevWordRef = useRef(stage.label)
  const [timedOut, setTimedOut] = useState(false)

  // Timeout: if still loading after 60 seconds, show retry
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 60000)
    return () => clearTimeout(timer)
  }, [])

  // Animate progress
  useEffect(() => {
    const target = stage.progress
    const step = () => {
      setDisplayedProgress((prev) => {
        if (prev < target) return Math.min(prev + 1, target)
        return prev
      })
    }
    const interval = setInterval(step, 30)
    return () => clearInterval(interval)
  }, [stage.progress])

  // Word transition animation
  useEffect(() => {
    if (stage.label !== prevWordRef.current) {
      setPrevWord(prevWordRef.current)
      setCurrentWord(stage.label)
      setAnimating(true)
      prevWordRef.current = stage.label
      const timer = setTimeout(() => {
        setAnimating(false)
        setPrevWord(null)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [stage.label])

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30">
            <span className="text-4xl font-bold text-white">A</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Cap A</h1>
        <p className="text-slate-400 text-sm mb-10">Amaravati Capital City Interactive Map</p>

        {error ? (
          <div className="mb-8">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : timedOut ? (
          <div className="mb-8">
            <p className="text-yellow-400 text-sm mb-4">Loading is taking longer than expected...</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Reload
            </button>
          </div>
        ) : (
          <>
            <div className="loader-text mb-8">
              <span className="loader-static">loading</span>
              <span className="words-container">
                <span className={`word-slot ${animating ? 'word-exit' : ''}`}>
                  {animating ? prevWord : currentWord}
                </span>
                {animating && (
                  <span className="word-slot word-enter">{currentWord}</span>
                )}
              </span>
            </div>

            <div className="w-64 mx-auto mb-3">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${displayedProgress}%` }} />
              </div>
            </div>

            <p className="text-slate-500 text-sm font-mono">{displayedProgress}%</p>
          </>
        )}
      </div>
    </div>
  )
}
