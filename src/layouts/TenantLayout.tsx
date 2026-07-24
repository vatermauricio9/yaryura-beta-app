import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { LayoutDashboard, FileText, User, LogOut, Building2 } from 'lucide-react'

const navItems = [
  { to: '/inquilino', label: 'Mi Cuenta', icon: LayoutDashboard, end: true },
  { to: '/inquilino/documentos', label: 'Mis Documentos', icon: FileText, end: false },
  { to: '/inquilino/cuenta', label: 'Mis Datos', icon: User, end: false },
]

export default function TenantLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-gray-light">
      <header className="bg-brand-black text-white no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="font-heading text-lg">Yaryura Propiedades</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300 hidden sm:inline">{profile?.full_name}</span>
              <button onClick={handleSignOut} className="btn-ghost text-gray-300 hover:text-white flex items-center gap-1.5">
                <LogOut className="w-4 h-4" /> Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-5xl w-full mx-auto">
        <nav className="w-16 sm:w-56 bg-white border-r border-gray-200 no-print flex-shrink-0">
          <ul className="py-4">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-brand-red border-l-4 border-brand-red bg-red-50'
                        : 'text-gray-600 hover:text-brand-red hover:bg-gray-50 border-l-4 border-transparent'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
