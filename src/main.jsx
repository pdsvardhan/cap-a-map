import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

// NOTE: StrictMode is intentionally omitted. Its dev-only double-invoke
// mounts/unmounts MapLibre twice, racing two map instances against the
// external basemap style and leaving the surviving map stuck on 'load'.
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
