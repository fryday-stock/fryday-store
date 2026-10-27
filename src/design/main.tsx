import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { Preview, type Screen, type Theme } from './Preview'

const q = new URLSearchParams(location.search)
const theme = (q.get('t') || 'a') as Theme
const screen = (q.get('s') || 'home') as Screen
document.documentElement.classList.add(`theme-${theme}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview theme={theme} screen={screen} />
  </StrictMode>,
)
