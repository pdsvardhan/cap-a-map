import React, { useState, useEffect, useRef } from 'react'
import useMapStore from '../stores/mapStore'

export default function LoadingScreen() {
  const stage = useMapStore((s) => s.loadingStage)
  const error = useMapStore((s) => s.loadingError)
  const totalPlots = useMapStore((s) => s.totalPlots)
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
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center"
         style={{ background: 'radial-gradient(120% 90% at 50% 38%, #0e151d 0%, var(--bg) 70%)' }}>
      <div className="text-center px-6">
        <div className="mb-7">
          <div className="inline-flex items-center justify-center w-[68px] h-[68px] rounded-2xl glass-2"
               style={{ boxShadow: '0 0 0 1px var(--border), 0 0 40px -8px var(--accent-weak)' }}>
            <span className="text-4xl leading-none" style={{ color: 'var(--accent)' }}>అ</span>
          </div>
        </div>

        <h1 className="text-[26px] font-bold tracking-tight text-[var(--text-1)] mb-1">Amaravati</h1>
        {/* Count comes from meta.json (total_plots), which lands at LOADING_INDEX — so the
            subtitle reads "Land Explorer" for the first moment, then gains the count. */}
        <p className="text-[var(--text-3)] text-[13px] tracking-wide mb-10 mono uppercase">
          Land Explorer{totalPlots ? ` · ${totalPlots.toLocaleString()} plots` : ''}
        </p>

        {error ? (
          <div className="mb-8">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl font-medium transition-colors bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-110"
            >
              Retry
            </button>
          </div>
        ) : timedOut ? (
          <div className="mb-8">
            <p className="text-yellow-400 text-sm mb-4">Loading is taking longer than expected...</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl font-medium transition-colors bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-110"
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
