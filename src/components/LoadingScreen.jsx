import React from 'react'

export default function LoadingScreen({ status }) {
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
        <h1 className="text-2xl font-bold text-white mb-2">
          Cap A
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          Amaravati Capital City Interactive Map
        </p>

        {/* Loading spinner */}
        <div className="flex justify-center mb-4">
          <div className="w-8 h-8 border-3 border-slate-600 border-t-orange-500 rounded-full animate-spin" />
        </div>

        {/* Status */}
        <p className="text-slate-500 text-sm animate-pulse">
          {status}
        </p>
      </div>
    </div>
  )
}
