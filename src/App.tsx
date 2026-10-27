import { useEffect } from 'react'
import { Boot, DeviceScreen, LoginScreen, SetupScreen } from '@/screens/Auth'
import { Admin } from '@/screens/Admin'
import { AuditScreen } from '@/screens/Audit'
import { Count } from '@/screens/Count'
import { Home } from '@/screens/Home'
import { ItemCard } from '@/screens/ItemCard'
import { LogScreen } from '@/screens/Log'
import { MoveForm } from '@/screens/Move'
import { Purchases } from '@/screens/Purchases'
import { Reports } from '@/screens/Reports'
import { Stock } from '@/screens/Stock'
import { nav, useRoute } from '@/lib/router'
import { backend, isAdmin, useStore } from '@/lib/store'

export default function App() {
  const loaded = useStore(s => s.loaded), denied = useStore(s => s.denied)
  const hasStaff = useStore(s => s.staff.length > 0), user = useStore(s => s.user), admin = useStore(s => isAdmin(s))
  const r = useRoute()
  const authed = backend().authed()
  useEffect(() => { if (user && r[0] === 'admin' && !admin) nav('/home', true) }, [user, r, admin])

  if (!authed || denied) return <DeviceScreen err={denied ? 'هذا الجهاز ما عنده صلاحية. فعّله من جديد.' : undefined} />
  if (!loaded) return <Boot text="جاري تحميل البيانات…" />
  if (!hasStaff) return <SetupScreen />
  if (!user) return <LoginScreen />

  switch (r[0]) {
    case 'move': return <MoveForm key={r[1]} type={r[1]} />
    case 'purchases': return <Purchases r={r} />
    case 'stock': return r[1] === 'item' ? <ItemCard id={r[2]} /> : <Stock />
    case 'log': return <LogScreen />
    case 'count': return <Count />
    case 'reports': return <Reports />
    case 'audit': return <AuditScreen />
    case 'admin': return admin ? <Admin tab={r[1] || 'items'} /> : null
    default: return <Home />
  }
}
