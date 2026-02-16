import React, { useEffect, useState } from 'react'

export default function SegmentIdFlash({ segmentId, onDone }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDone?.(), 300) // wait for fade-out
    }, 1700)
    return () => clearTimeout(timer)
  }, [segmentId, onDone])

  return (
    <div
      className={`segment-id-flash ${visible ? 'flash-in' : 'flash-out'}`}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div style={{
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#fff',
        fontSize: '90px',
        fontWeight: 800,
        fontFamily: 'monospace',
        padding: '16px 40px',
        borderRadius: '16px',
        letterSpacing: '4px',
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}>
        #{String(segmentId).padStart(4, '0')}
      </div>
    </div>
  )
}
