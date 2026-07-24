import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Login from './pages/Login'
import StaffLayout from './layouts/StaffLayout'
import TenantLayout from './layouts/TenantLayout'
import StaffDashboard from './pages/staff/Dashboard'
import StaffPayments from './pages/staff/Payments'
import StaffRentManagement from './pages/staff/RentManagement'
import StaffDocuments from './pages/staff/Documents'
import StaffTenants from './pages/staff/Tenants'
import TenantDashboard from './pages/tenant/Dashboard'
import TenantDocuments from './pages/tenant/Documents'
import TenantAccount from './pages/tenant/Account'

function ProtectedRoute({ children, role }: { children: React.ReactNode; role: 'staff' | 'tenant' }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div></div>
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role !== role) return <Navigate to={role === 'staff' ? '/inquilino' : '/staff'} replace />
  return <>{children}</>
}

export default function App() {
  const { profile, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div></div>
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/staff" element={<ProtectedRoute role="staff"><StaffLayout /></ProtectedRoute>}>
        <Route index element={<StaffDashboard />} />
        <Route path="pagos" element={<StaffPayments />} />
        <Route path="alquileres" element={<StaffRentManagement />} />
        <Route path="documentacion" element={<StaffDocuments />} />
        <Route path="inquilinos" element={<StaffTenants />} />
      </Route>

      <Route path="/inquilino" element={<ProtectedRoute role="tenant"><TenantLayout /></ProtectedRoute>}>
        <Route index element={<TenantDashboard />} />
        <Route path="documentos" element={<TenantDocuments />} />
        <Route path="cuenta" element={<TenantAccount />} />
      </Route>

      <Route path="*" element={
        profile?.role === 'staff'
          ? <Navigate to="/staff" replace />
          : <Navigate to={profile?.role === 'tenant' ? '/inquilino' : '/login'} replace />
      } />
    </Routes>
  )
}
