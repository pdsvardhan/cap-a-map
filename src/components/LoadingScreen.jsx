import React, { useState, useEffect, useRef } from 'react'

function getLoadingStage(status) {
  if (!status || status.includes('Initializing')) return { word: 'map', progress: 10 }
  if (status.includes('village index')) return { word: 'index', progress: 20 }
  if (status.includes('Loading plot') || status.includes('Loading all')) return { word: 'plots', progress: 30 }
  if (status.includes('Loaded') && status.includes('rendering')) return { word: 'plots', progress: 60 }
  if (status.includes('Loading ') && status.includes('plots)')) return { word: 'villages', progress: 40 }
  if (status.includes('Rendering')) return { word: 'rendering', progress: 70 }
  if (status.includes('Loading overlays')) return { word: 'overlays', progress: 80 }
  if (status.includes('Ready')) return { word: 'ready', progress: 100 }
  if (status.includes('Error')) return { word: 'retrying', progress: 30 }
  return { word: 'data', progress: 20 }
}

export default function LoadingScreen({ status }) {
  const stage = getLoadingStage(status)
  const [displayedProgress, setDisplayedProgress] = useState(0)
  const [prevWord, setPrevWord] = useState(null)
  const [currentWord, setCurrentWord] = useState(stage.word)
  const [animating, setAnimating] = useState(false)
  const prevWordRef = useRef(stage.word)

  // Animate progress number counting up
  useEffect(() => {
    const target = stage.progress
    const step = () => {
      setDisplayedProgress(prev => {
        if (prev < target) return Math.min(prev + 1, target)
        return prev
      })
    }
    const interval = setInterval(step, 20)
    return () => clearInterval(interval)
  }, [stage.progress])

  // Word transition animation
  useEffect(() => {
    if (stage.word !== prevWordRef.current) {
      setPrevWord(prevWordRef.current)
      setCurrentWord(stage.word)
      setAnimating(true)
      prevWordRef.current = stage.word

      const timer = setTimeout(() => {
        setAnimating(false)
        setPrevWord(null)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [stage.word])

  return (
    <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30">
            <span className="text-4xl font-bold text-white">A</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-1">
          Cap A
        </h1>
        <p className="text-slate-400 text-sm mb-10">
          Amaravati Capital City Interactive Map
        </p>

        {/* Word Spinner */}
        <div className="loader-text mb-8">
          <span className="loader-static">loading</span>
          <span className="words-container">
            <span className={`word-slot ${animating ? 'word-exit' : ''}`}>
              {animating ? prevWord : currentWord}
            </span>
            {animating && (
              <span className="word-slot word-enter">
                {currentWord}
              </span>
            )}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-64 mx-auto mb-3">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${displayedProgress}%` }}
            />
          </div>
        </div>

        {/* Percentage */}
        <p className="text-slate-500 text-sm font-mono">
          {displayedProgress}%
        </p>
      </div>
    </div>
  )
}
