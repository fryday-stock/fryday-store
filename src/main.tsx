import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App'
import { DialogHost } from '@/components/app/dialogs'
import { CONFIG } from '@/config'
import { localBackend } from '@/lib/backend/local'
import type { Backend } from '@/lib/backend/types'
import { init, startData } from '@/lib/store'

document.title = CONFIG.title

async function boot() {
  let b: Backend
  const emu = import.meta.env.VITE_FIREBASE_EMULATOR as string | undefined
  if (CONFIG.firebase.apiKey || emu) {
    const { firebaseBackend } = await import('@/lib/backend/firebase')
    const cfg = emu ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-fryday', appId: 'demo' } : CONFIG.firebase
    b = await firebaseBackend(cfg, CONFIG.deviceEmail, emu)
  } else b = localBackend()
  init(b)
  if (b.authed()) startData()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      <DialogHost />
      <Toaster dir="rtl" position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: 'var(--font-body)', fontSize: 15 } }} />
    </StrictMode>,
  )
}
boot().catch(e => {
  console.error(e)
  document.getElementById('root')!.innerHTML = `<div style="padding:24px;font-family:sans-serif" dir="rtl">تعذّر الاتصال بقاعدة البيانات. تأكد من الإنترنت.<br><small>${String(e?.message || e)}</small></div>`
})
