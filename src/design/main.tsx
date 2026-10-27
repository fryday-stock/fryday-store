import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { Preview, type Screen, type Theme } from './Preview'
import { PreviewD } from './PreviewD'

const q = new URLSearchParams(location.search)
const theme = (q.get('t') || 'a') as Theme | 'd'
const screen = (q.get('s') || 'home') as Screen
document.documentElement.classList.add(`theme-${theme}`)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {theme === 'd' ? <PreviewD screen={screen} /> : <Preview theme={theme} screen={screen} />}
  </StrictMode>,
)
