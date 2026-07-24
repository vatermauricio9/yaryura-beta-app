import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { Tenant, LeaseContract, Currency } from '../../lib/types'
import { formatCurrency } from '../../lib/utils'
import { Home, Mail, Phone, Building2, Calendar, DollarSign } from 'lucide-react'

export default function TenantAccount() {
  const { user, profile } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [contract, setContract] = useState<LeaseContract | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  async function loadData() {
    const { data: t } = await supabase
      .from('tenants')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle()
    setTenant(t as Tenant | null)

    if (t) {
      const { data: c } = await supabase
        .from('lease_contracts')
        .select('*')
        .eq('tenant_id', t.id)
        .eq('active', true)
        .maybeSingle()
      setContract(c as LeaseContract | null)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div></div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading text-brand-black mb-1">Mis Datos</h1>
        <p className="text-gray-500 text-sm">Información personal y de tu contrato</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal info */}
        <div className="card p-6">
          <h2 className="font-heading text-brand-black mb-4">Datos Personales</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"><Mail className="w-4 h-4 text-gray-500" /></div>
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-sm font-medium text-brand-black">{profile?.email || tenant?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"><Building2 className="w-4 h-4 text-gray-500" /></div>
              <div>
                <p className="text-xs text-gray-400">Nombre</p>
                <p className="text-sm font-medium text-brand-black">{profile?.full_name || tenant?.full_name}</p>
              </div>
            </div>
            {tenant?.phone && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"><Phone className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-xs text-gray-400">Teléfono</p>
                  <p className="text-sm font-medium text-brand-black">{tenant.phone}</p>
                </div>
              </div>
            )}
            {tenant?.branch && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"><Building2 className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-xs text-gray-400">Sucursal</p>
                  <p className="text-sm font-medium text-brand-black">{tenant.branch}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contract info */}
        <div className="card p-6">
          <h2 className="font-heading text-brand-black mb-4">Datos del Contrato</h2>
          {contract ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"><Home className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-xs text-gray-400">Propiedad</p>
                  <p className="text-sm font-medium text-brand-black">{contract.property_address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"><Calendar className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-xs text-gray-400">Fecha de Inicio</p>
                  <p className="text-sm font-medium text-brand-black">{contract.start_date}</p>
                </div>
              </div>
              {contract.end_date && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"><Calendar className="w-4 h-4 text-gray-500" /></div>
                  <div>
                    <p className="text-xs text-gray-400">Fecha de Fin</p>
                    <p className="text-sm font-medium text-brand-black">{contract.end_date}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"><DollarSign className="w-4 h-4 text-gray-500" /></div>
                <div>
                  <p className="text-xs text-gray-400">Monto Mensual Inicial</p>
                  <p className="text-sm font-medium text-brand-black">{formatCurrency(contract.monthly_amount, contract.currency as Currency)}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No hay contrato activo</p>
          )}
        </div>
      </div>
    </div>
  )
}
