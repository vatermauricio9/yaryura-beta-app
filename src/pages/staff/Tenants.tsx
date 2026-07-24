import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Tenant, LeaseContract, Currency } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'
import { Plus, Building2, Home, Phone, Mail } from 'lucide-react'

export default function StaffTenants() {
  const { user } = useAuth()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTenant, setNewTenant] = useState({
    full_name: '',
    email: '',
    phone: '',
    property_address: '',
    branch: '',
  })
  const [contractData, setContractData] = useState({
    start_date: '',
    end_date: '',
    currency: 'USD' as Currency,
    monthly_amount: '',
  })
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    loadTenants()
  }, [])

  async function loadTenants() {
    const { data } = await supabase.from('tenants').select('*').order('full_name')
    setTenants((data as Tenant[]) || [])
    setLoading(false)
  }

  async function handleAddTenant() {
    if (!user) return
    setMessage(null)

    // Create auth user via edge function would be ideal, but for beta we use admin create
    // For now, just create the tenant record
    const { data: tenant, error: tError } = await supabase.from('tenants').insert({
      full_name: newTenant.full_name,
      email: newTenant.email,
      phone: newTenant.phone || null,
      property_address: newTenant.property_address,
      branch: newTenant.branch || null,
    }).select().single()

    if (tError) {
      setMessage('Error: ' + tError.message)
      return
    }

    // Create contract if data provided
    if (contractData.start_date && contractData.monthly_amount && tenant) {
      const { error: cError } = await supabase.from('lease_contracts').insert({
        tenant_id: tenant.id,
        property_address: newTenant.property_address,
        start_date: contractData.start_date,
        end_date: contractData.end_date || null,
        currency: contractData.currency,
        monthly_amount: parseFloat(contractData.monthly_amount),
        active: true,
      })

      if (cError) {
        setMessage('Inquilino creado pero error en contrato: ' + cError.message)
      } else {
        setMessage('Inquilino y contrato creados correctamente')
      }
    } else {
      setMessage('Inquilino creado correctamente')
    }

    setShowAdd(false)
    setNewTenant({ full_name: '', email: '', phone: '', property_address: '', branch: '' })
    setContractData({ start_date: '', end_date: '', currency: 'USD', monthly_amount: '' })
    loadTenants()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading text-brand-black mb-1">Inquilinos</h1>
          <p className="text-gray-500 text-sm">Gestión de inquilinos y contratos</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nuevo Inquilino
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-sm">{message}</div>
      )}

      {showAdd && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-heading text-brand-black mb-4">Nuevo Inquilino</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <input type="text" value={newTenant.full_name} onChange={(e) => setNewTenant({ ...newTenant, full_name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={newTenant.email} onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" value={newTenant.phone} onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <select value={newTenant.branch} onChange={(e) => setNewTenant({ ...newTenant, branch: e.target.value })} className="input-field">
                <option value="">Sin sucursal</option>
                <option value="Caseros">Caseros</option>
                <option value="Caseros Centro">Caseros Centro</option>
                <option value="Santos Lugares">Santos Lugares</option>
                <option value="Saenz Peña">Saenz Peña</option>
                <option value="Villa Devoto">Villa Devoto</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de la Propiedad</label>
              <input type="text" value={newTenant.property_address} onChange={(e) => setNewTenant({ ...newTenant, property_address: e.target.value })} className="input-field" />
            </div>
          </div>

          <h3 className="font-heading text-brand-black mt-6 mb-3">Contrato Inicial</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input type="date" value={contractData.start_date} onChange={(e) => setContractData({ ...contractData, start_date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input type="date" value={contractData.end_date} onChange={(e) => setContractData({ ...contractData, end_date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select value={contractData.currency} onChange={(e) => setContractData({ ...contractData, currency: e.target.value as Currency })} className="input-field">
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto Mensual</label>
              <input type="number" step="0.01" value={contractData.monthly_amount} onChange={(e) => setContractData({ ...contractData, monthly_amount: e.target.value })} className="input-field" placeholder="0.00" />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleAddTenant} className="btn-primary">Crear Inquilino</button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenants.length === 0 ? (
          <div className="card p-12 text-center col-span-full">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No hay inquilinos registrados</p>
          </div>
        ) : (
          tenants.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-brand-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-brand-black truncate">{t.full_name}</h3>
                  <div className="text-sm text-gray-500 truncate">{t.property_address}</div>
                  {t.branch && <span className="badge badge-neutral mt-1">{t.branch}</span>}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {t.email}</div>
                {t.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {t.phone}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
