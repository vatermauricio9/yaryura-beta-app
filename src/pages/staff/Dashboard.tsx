import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Tenant, Payment, LeaseContract, Currency } from '../../lib/types'
import { formatCurrency, formatPeriod, formatDate, getCurrentPeriod } from '../../lib/utils'
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Wallet, Users, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

interface TenantBalance {
  tenant: Tenant
  contract: LeaseContract | null
  balance: number
  currency: Currency
  status: 'up_to_date' | 'current_debt' | 'overdue_debt'
  lastPayment: Payment | null
  totalPaid: number
  totalDue: number
}

export default function StaffDashboard() {
  const [tenants, setTenants] = useState<TenantBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'up_to_date' | 'current_debt' | 'overdue_debt'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*')
      .order('full_name')

    if (!tenantsData || tenantsData.length === 0) {
      setTenants([])
      setLoading(false)
      return
    }

    const currentPeriod = getCurrentPeriod()
    const balances: TenantBalance[] = []

    for (const t of tenantsData as Tenant[]) {
      const { data: contracts } = await supabase
        .from('lease_contracts')
        .select('*')
        .eq('tenant_id', t.id)
        .eq('active', true)
        .maybeSingle()

      const contract = contracts as LeaseContract | null

      const { data: rentMonths } = await supabase
        .from('rent_months')
        .select('*')
        .eq('tenant_id', t.id)
        .order('period', { ascending: true })

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', t.id)
        .order('registered_at', { ascending: false })

      const totalDue = (rentMonths || []).reduce((sum, rm) => sum + Number(rm.amount), 0)
      const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
      const balance = totalPaid - totalDue
      const currency = (contract?.currency || 'USD') as Currency

      let status: 'up_to_date' | 'current_debt' | 'overdue_debt' = 'up_to_date'
      if (balance < 0) {
        const overdueMonths = (rentMonths || []).filter(
          (rm) => rm.period < currentPeriod
        )
        const overdueDue = overdueMonths.reduce((sum, rm) => sum + Number(rm.amount), 0)
        const overduePaid = (payments || [])
          .filter((p) => p.period < currentPeriod)
          .reduce((sum, p) => sum + Number(p.amount), 0)
        if (overdueDue - overduePaid > 0) {
          status = 'overdue_debt'
        } else {
          status = 'current_debt'
        }
      }

      balances.push({
        tenant: t,
        contract,
        balance,
        currency,
        status,
        lastPayment: (payments?.[0] as Payment) || null,
        totalPaid,
        totalDue,
      })
    }

    setTenants(balances)
    setLoading(false)
  }

  const filtered = tenants.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false
    if (searchTerm && !t.tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !t.tenant.property_address.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const stats = {
    total: tenants.length,
    upToDate: tenants.filter((t) => t.status === 'up_to_date').length,
    currentDebt: tenants.filter((t) => t.status === 'current_debt').length,
    overdue: tenants.filter((t) => t.status === 'overdue_debt').length,
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div></div>
  }

  return (
    <div>
      <div className="mb-6 no-print">
        <h1 className="text-2xl font-heading text-brand-black mb-1">Estado de Cuentas</h1>
        <p className="text-gray-500 text-sm">Resumen general de saldos de todos los inquilinos</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 no-print">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Total Inquilinos</p>
              <p className="text-2xl font-heading text-brand-black mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Al Día</p>
              <p className="text-2xl font-heading text-green-600 mt-1">{stats.upToDate}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Deuda del Mes</p>
              <p className="text-2xl font-heading text-yellow-600 mt-1">{stats.currentDebt}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Deuda Atrasada</p>
              <p className="text-2xl font-heading text-red-600 mt-1">{stats.overdue}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 no-print">
        <input
          type="text"
          placeholder="Buscar por nombre o dirección..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field flex-1"
        />
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'up_to_date', label: 'Al Día' },
            { key: 'current_debt', label: 'Deuda Mes' },
            { key: 'overdue_debt', label: 'Atrasados' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={`px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-brand-red text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:border-brand-red'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Print header */}
      <div className="print-only mb-6">
        <h1 className="text-xl font-heading">Yaryura Propiedades - Estado de Cuentas</h1>
        <p className="text-sm text-gray-600">Fecha: {formatDate(new Date().toISOString())}</p>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Inquilino</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Propiedad</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Adeudado</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Pagado</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Saldo</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase no-print">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    {tenants.length === 0 ? 'No hay inquilinos registrados' : 'No se encontraron resultados'}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.tenant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-black">{t.tenant.full_name}</div>
                      <div className="text-xs text-gray-400 sm:hidden">{t.tenant.property_address}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{t.tenant.property_address}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCurrency(t.totalDue, t.currency)}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">{formatCurrency(t.totalPaid, t.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${t.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.balance >= 0 ? '+' : ''}{formatCurrency(t.balance, t.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center no-print">
                      {t.status === 'up_to_date' && <span className="badge badge-success">Al Día</span>}
                      {t.status === 'current_debt' && <span className="badge badge-warning">Deuda Mes</span>}
                      {t.status === 'overdue_debt' && <span className="badge badge-danger">Atrasado</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print button */}
      <div className="mt-4 no-print">
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
          <ArrowDownCircle className="w-5 h-5" /> Imprimir Reporte
        </button>
      </div>
    </div>
  )
}
